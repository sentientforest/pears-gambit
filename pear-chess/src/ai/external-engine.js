/**
 * Pear's Gambit - External Stockfish Engine
 * 
 * Manages Stockfish as an external process using UCI protocol
 */

import { spawn } from 'child_process'
import { UCIProtocol } from './uci-protocol.js'
import { EventEmitter } from 'events'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { platform, arch } from 'os'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * External Stockfish engine implementation
 */
export class ExternalStockfishEngine extends EventEmitter {
  constructor(options = {}) {
    super()
    
    this.options = {
      binaryPath: options.binaryPath,
      autoDownload: options.autoDownload !== false,
      workDir: options.workDir || path.join(__dirname, '../../stockfish'),
      hashSize: options.hashSize || 256, // MB
      threads: options.threads || 1,
      multiPV: options.multiPV || 1,
      skillLevel: options.skillLevel || 20, // 0-20, 20 is strongest
      debug: options.debug || false,
      ...options
    }
    
    this.process = null
    this.uci = new UCIProtocol()
    this.isReady = false
    this.isAnalyzing = false
    
    this.setupUCIHandlers()
  }

  /**
   * Set up UCI protocol event handlers
   */
  setupUCIHandlers() {
    // Forward UCI events
    this.uci.on('send', (command) => {
      if (this.process && this.process.stdin) {
        this.process.stdin.write(command + '\n')
        if (this.options.debug) {
          console.log('→ UCI:', command)
        }
      }
    })
    
    this.uci.on('info', (info) => {
      this.emit('info', info)
    })
    
    this.uci.on('bestmove', (bestMove, ponderMove) => {
      this.isAnalyzing = false
      this.emit('bestmove', bestMove, ponderMove)
    })
    
    this.uci.on('id', (id) => {
      this.emit('id', id)
    })
  }

  /**
   * Detect the appropriate Stockfish binary for the platform
   * @returns {string} Path to Stockfish binary
   */
  async detectStockfishBinary() {
    const platformKey = `${platform()}-${arch()}`
    
    // Map platform to binary name
    const binaryMap = {
      'linux-x64': 'stockfish-linux-x64',
      'linux-arm64': 'stockfish-linux-arm64',
      'darwin-x64': 'stockfish-macos-x64',
      'darwin-arm64': 'stockfish-macos-arm64',
      'win32-x64': 'stockfish-windows-x64.exe',
      'win32-ia32': 'stockfish-windows-x86.exe'
    }
    
    const binaryName = binaryMap[platformKey]
    if (!binaryName) {
      throw new Error(`Unsupported platform: ${platformKey}`)
    }
    
    const binaryPath = path.join(this.options.workDir, binaryName)
    
    // Check if binary exists
    try {
      await fs.access(binaryPath, fs.constants.X_OK)
      return binaryPath
    } catch (error) {
      if (this.options.autoDownload) {
        return await this.downloadStockfish(binaryName)
      }
      throw new Error(`Stockfish binary not found at ${binaryPath}. Set autoDownload: true to download automatically.`)
    }
  }

  /**
   * Download Stockfish binary for the current platform
   * @param {string} binaryName - Name of the binary to download
   * @returns {string} Path to downloaded binary
   */
  async downloadStockfish(binaryName) {
    // For now, we'll use a system-installed stockfish if available
    // In production, this would download from GitHub releases
    
    // Try to find stockfish in common locations
    const commonPaths = [
      '/usr/games/stockfish',      // Ubuntu/Debian typical location
      '/usr/bin/stockfish',
      '/usr/local/bin/stockfish',
      '/opt/stockfish/stockfish',
      'C:\\Program Files\\Stockfish\\stockfish.exe'
    ]
    
    for (const testPath of commonPaths) {
      try {
        await fs.access(testPath, fs.constants.X_OK)
        return testPath
      } catch {
        // Continue searching
      }
    }
    
    // If we can't find it, provide instructions
    throw new Error(
      'Stockfish not found. Please install Stockfish:\n' +
      '  Ubuntu/Debian: sudo apt install stockfish\n' +
      '  macOS: brew install stockfish\n' +
      '  Windows: Download from https://stockfishchess.org/download/\n' +
      'Or set binaryPath option to point to your Stockfish installation.'
    )
  }

  /**
   * Start the Stockfish engine
   */
  async start() {
    if (this.process) {
      throw new Error('Engine already started')
    }
    
    // Detect or use provided binary path
    const binaryPath = this.options.binaryPath || await this.detectStockfishBinary()
    
    if (this.options.debug) {
      console.log('Starting Stockfish:', binaryPath)
    }
    
    // Spawn Stockfish process
    this.process = spawn(binaryPath, [], {
      stdio: ['pipe', 'pipe', 'pipe']
    })
    
    // Handle process output
    this.process.stdout.on('data', (data) => {
      const output = data.toString()
      if (this.options.debug) {
        console.log('← UCI:', output.trim())
      }
      this.uci.processResponse(output)
    })
    
    // Handle process errors
    this.process.stderr.on('data', (data) => {
      console.error('Stockfish error:', data.toString())
    })
    
    this.process.on('error', (error) => {
      this.emit('error', error)
    })
    
    this.process.on('close', (code) => {
      this.process = null
      this.isReady = false
      this.isAnalyzing = false
      this.emit('close', code)
    })
    
    // Initialize UCI
    await this.initialize()
  }

  /**
   * Initialize the UCI protocol
   */
  async initialize() {
    // Send UCI command and wait for response
    await this.uci.send('uci')
    await this.uci.waitFor('uciok')
    
    // Configure engine options
    await this.setOption('Hash', this.options.hashSize)
    await this.setOption('Threads', this.options.threads)
    await this.setOption('MultiPV', this.options.multiPV)
    
    if (this.options.skillLevel < 20) {
      await this.setOption('Skill Level', this.options.skillLevel)
    }
    
    // Send isready and wait for response
    await this.uci.send('isready')
    await this.uci.waitFor('readyok')
    
    this.isReady = true
    this.emit('ready')
  }

  /**
   * Set an engine option
   * @param {string} name - Option name
   * @param {*} value - Option value
   */
  async setOption(name, value) {
    await this.uci.send(`setoption name ${name} value ${value}`)
  }

  /**
   * Set the current position
   * @param {string} fen - FEN string or 'startpos'
   * @param {string[]} moves - Moves from the position in UCI format
   */
  async position(fen = 'startpos', moves = []) {
    let command = 'position '
    
    if (fen === 'startpos') {
      command += 'startpos'
    } else {
      command += `fen ${fen}`
    }
    
    if (moves.length > 0) {
      command += ' moves ' + moves.join(' ')
    }
    
    await this.uci.send(command)
  }

  /**
   * Start analysis
   * @param {Object} options - Analysis options
   */
  async go(options = {}) {
    if (!this.isReady) {
      throw new Error('Engine not ready')
    }
    
    let command = 'go'
    
    if (options.depth) {
      command += ` depth ${options.depth}`
    }
    if (options.movetime) {
      command += ` movetime ${options.movetime}`
    }
    if (options.wtime) {
      command += ` wtime ${options.wtime}`
    }
    if (options.btime) {
      command += ` btime ${options.btime}`
    }
    if (options.winc) {
      command += ` winc ${options.winc}`
    }
    if (options.binc) {
      command += ` binc ${options.binc}`
    }
    if (options.nodes) {
      command += ` nodes ${options.nodes}`
    }
    if (options.infinite) {
      command += ' infinite'
    }
    
    this.isAnalyzing = true
    const result = await this.uci.send(command)
    return result
  }

  /**
   * Stop current analysis
   */
  async stop() {
    if (this.isAnalyzing) {
      await this.uci.send('stop')
      await this.uci.waitFor('bestmove')
      this.isAnalyzing = false
    }
  }

  /**
   * Get best move for current position
   * @param {string} fen - Position in FEN format
   * @param {Object} options - Analysis options
   * @returns {Object} Best move and evaluation
   */
  async getBestMove(fen, options = {}) {
    await this.position(fen)
    
    const analysisOptions = {
      depth: options.depth || 20,
      ...options
    }
    
    const result = await this.go(analysisOptions)
    return result
  }

  /**
   * Analyze a position
   * @param {string} fen - Position in FEN format
   * @param {Object} options - Analysis options
   * @returns {Object} Analysis results
   */
  async analyze(fen, options = {}) {
    await this.position(fen)
    
    // Collect analysis info
    const analysis = {
      fen,
      lines: [],
      eval: null,
      depth: 0
    }
    
    // Temporary info handler
    const infoHandler = (info) => {
      if (info.score) {
        analysis.eval = info.score
      }
      if (info.depth) {
        analysis.depth = info.depth
      }
      if (info.pv && info.pv.length > 0) {
        const lineIndex = (info.multipv || 1) - 1
        analysis.lines[lineIndex] = {
          moves: info.pv,
          score: info.score,
          depth: info.depth
        }
      }
    }
    
    this.uci.on('info', infoHandler)
    
    // Run analysis
    await this.go({
      depth: options.depth || 20,
      ...options
    })
    
    // Clean up handler
    this.uci.off('info', infoHandler)
    
    return analysis
  }

  /**
   * Start infinite analysis
   * @param {string} fen - Position to analyze
   */
  async startInfiniteAnalysis(fen) {
    await this.position(fen)
    await this.go({ infinite: true })
  }

  /**
   * Create a new game
   */
  async newGame() {
    await this.uci.send('ucinewgame')
    await this.uci.send('isready')
    await this.uci.waitFor('readyok')
  }

  /**
   * Quit the engine
   */
  async quit() {
    if (this.process) {
      if (this.isAnalyzing) {
        await this.stop()
      }
      
      await this.uci.send('quit')
      
      // Give the process time to exit cleanly
      await new Promise(resolve => setTimeout(resolve, 100))
      
      if (this.process) {
        this.process.kill()
        this.process = null
      }
    }
    
    this.isReady = false
    this.isAnalyzing = false
    this.uci.reset()
  }

  /**
   * Check if engine is running
   */
  isRunning() {
    return this.process !== null && this.isReady
  }
}