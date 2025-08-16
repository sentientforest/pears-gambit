/**
 * Pear's Gambit - Simplified External Stockfish Engine
 * 
 * Streamlined Stockfish integration with robust error handling
 */

import { spawn } from 'child_process'
import { SimpleUCI } from './uci-simple.js'
import { EventEmitter } from 'events'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

// Import binary manager (only in Node.js environment)
let StockfishBinaryManager = null
let detectPlatform = null

try {
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = path.dirname(__filename)
  const scriptsPath = path.join(__dirname, '../../scripts')
  
  const binaryManagerModule = await import(path.join(scriptsPath, 'setup-deps.js'))
  const platformModule = await import(path.join(scriptsPath, 'platform-utils.js'))
  
  StockfishBinaryManager = binaryManagerModule.StockfishBinaryManager
  detectPlatform = platformModule.detectPlatform
} catch (error) {
  console.warn('Binary manager not available:', error.message)
}

/**
 * Simplified external Stockfish engine
 */
export class SimpleStockfishEngine extends EventEmitter {
  constructor(options = {}) {
    super()
    
    this.options = {
      binaryPath: options.binaryPath || null, // Will auto-detect if not provided
      hashSize: options.hashSize || 256,
      threads: options.threads || 1,
      multiPV: options.multiPV || 1,
      skillLevel: options.skillLevel || 20,
      debug: options.debug || false,
      ...options
    }
    
    this.process = null
    this.uci = new SimpleUCI()
    this.isReady = false
    this.binaryManager = null
    
    // Initialize binary manager if available
    if (StockfishBinaryManager && detectPlatform) {
      this.binaryManager = new StockfishBinaryManager({ debug: this.options.debug })
    }
    
    this.setupHandlers()
  }

  setupHandlers() {
    this.uci.on('send', (command) => {
      if (this.process && this.process.stdin) {
        if (this.options.debug) console.log('→', command)
        this.process.stdin.write(command + '\n')
      }
    })
    
    this.uci.on('info', (info) => this.emit('info', info))
    this.uci.on('bestmove', (bestMove, ponder) => this.emit('bestmove', bestMove, ponder))
    this.uci.on('ready', () => this.emit('ready'))
  }

  async start() {
    if (this.process) {
      throw new Error('Engine already started')
    }
    
    // Determine binary path
    let binaryPath = this.options.binaryPath
    
    if (!binaryPath && this.binaryManager) {
      // Use binary manager to get/download Stockfish
      try {
        binaryPath = await this.binaryManager.ensureBinaries()
        if (this.options.debug) {
          console.log('Using managed Stockfish binary:', binaryPath)
        }
      } catch (error) {
        console.warn('Failed to get managed binary:', error.message)
      }
    }
    
    if (!binaryPath) {
      // Fallback to common system paths
      const fallbackPaths = [
        '/usr/games/stockfish',
        '/usr/local/bin/stockfish',
        '/usr/bin/stockfish',
        'stockfish' // Try PATH
      ]
      
      for (const fallbackPath of fallbackPaths) {
        try {
          await fs.access(fallbackPath, fs.constants.X_OK)
          binaryPath = fallbackPath
          if (this.options.debug) {
            console.log('Using system Stockfish binary:', binaryPath)
          }
          break
        } catch (error) {
          // Continue to next fallback
        }
      }
    }
    
    if (!binaryPath) {
      throw new Error('Stockfish binary not found. Install stockfish or use binary manager.')
    }
    
    this.options.binaryPath = binaryPath
    
    // Spawn process
    this.process = spawn(this.options.binaryPath, [], {
      stdio: ['pipe', 'pipe', 'pipe']
    })
    
    this.process.stdout.on('data', (data) => {
      if (this.options.debug) console.log('←', data.toString().trim())
      this.uci.processData(data.toString())
    })
    
    this.process.stderr.on('data', (data) => {
      console.error('Stockfish error:', data.toString())
    })
    
    this.process.on('error', (error) => {
      this.emit('error', error)
    })
    
    this.process.on('close', (code) => {
      this.process = null
      this.isReady = false
      this.emit('close', code)
    })
    
    // Initialize
    await this.initialize()
  }

  async initialize() {
    // Send UCI and wait for response
    await this.uci.send('uci', 'uciok')
    
    // Configure engine
    await this.setOption('Hash', this.options.hashSize)
    await this.setOption('Threads', this.options.threads)
    await this.setOption('MultiPV', this.options.multiPV)
    
    if (this.options.skillLevel < 20) {
      await this.setOption('Skill Level', this.options.skillLevel)
    }
    
    // Send isready
    await this.uci.send('isready', 'readyok')
    
    this.isReady = true
    this.emit('initialized')
  }

  async setOption(name, value) {
    await this.uci.send(`setoption name ${name} value ${value}`)
  }

  async position(fen = 'startpos', moves = []) {
    let command = 'position '
    command += fen === 'startpos' ? 'startpos' : `fen ${fen}`
    if (moves.length > 0) {
      command += ' moves ' + moves.join(' ')
    }
    await this.uci.send(command)
  }

  async go(options = {}) {
    let command = 'go'
    
    if (options.depth) command += ` depth ${options.depth}`
    if (options.movetime) command += ` movetime ${options.movetime}`
    if (options.infinite) command += ' infinite'
    
    return await this.uci.send(command, 'bestmove')
  }

  async stop() {
    await this.uci.send('stop', 'bestmove')
  }

  async analyze(fen, options = {}) {
    await this.position(fen)
    
    const analysis = {
      fen,
      lines: [],
      depth: 0,
      bestMove: null
    }
    
    // Collect info events
    const infoHandler = (info) => {
      if (info.depth) analysis.depth = info.depth
      if (info.pv && info.pv.length > 0) {
        analysis.lines[0] = {
          moves: info.pv,
          score: info.score,
          depth: info.depth
        }
      }
    }
    
    this.uci.on('info', infoHandler)
    
    const result = await this.go({ depth: options.depth || 20 })
    analysis.bestMove = result.bestMove
    
    this.uci.off('info', infoHandler)
    
    return analysis
  }

  async quit() {
    if (this.process) {
      await this.uci.send('quit')
      
      // Give process time to exit
      await new Promise(resolve => setTimeout(resolve, 100))
      
      if (this.process) {
        this.process.kill()
        this.process = null
      }
    }
    
    this.isReady = false
    this.uci.clear()
  }
}