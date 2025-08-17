/**
 * Pear's Gambit - Native Stockfish Engine
 * 
 * JavaScript interface for the native Stockfish binding
 */

import { EventEmitter } from 'events'
import path from 'path'
import { fileURLToPath } from 'url'

// Try to load the native binding
let nativeBinding = null

try {
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = path.dirname(__filename)
  const projectRoot = path.join(__dirname, '../..')
  
  // Look for the compiled binding in prebuilds
  const { detectPlatform } = await import('../../scripts/platform-utils.js')
  const platform = detectPlatform()
  const bindingPath = path.join(projectRoot, 'prebuilds', platform, 'libstockfish_binding.so')
  
  // For now, we'll use FFI or dlopen approach
  // This is a placeholder - in production we'd use proper N-API or Bare bindings
  console.log('Native binding would be loaded from:', bindingPath)
  
} catch (error) {
  console.warn('Native binding not available:', error.message)
}

/**
 * Native Stockfish Engine using compiled binding
 */
export class NativeStockfishEngine extends EventEmitter {
  constructor(options = {}) {
    super()
    
    this.options = {
      debug: options.debug || false,
      ...options
    }
    
    this.isReady = false
    this.isSearching = false
    this.currentPosition = null
    
    // For now, fall back to stub behavior
    this.stub = true
  }

  async start() {
    if (this.isReady) {
      throw new Error('Engine already started')
    }
    
    if (this.options.debug) {
      console.log('Starting native Stockfish engine...')
    }
    
    try {
      if (nativeBinding && !this.stub) {
        // Use real native binding
        this.engine = nativeBinding.createEngine()
        await this.engine.initialize()
      } else {
        // Use stub implementation
        if (this.options.debug) {
          console.log('Using stub native engine implementation')
        }
      }
      
      this.isReady = true
      this.emit('ready')
      
    } catch (error) {
      this.emit('error', error)
      throw error
    }
  }

  async setOption(name, value) {
    if (!this.isReady) {
      throw new Error('Engine not ready')
    }
    
    if (this.options.debug) {
      console.log(`Setting option ${name} = ${value}`)
    }
    
    if (nativeBinding && !this.stub) {
      return this.engine.setOption(name, value)
    } else {
      // Stub implementation
      return true
    }
  }

  async position(fen, moves = []) {
    if (!this.isReady) {
      throw new Error('Engine not ready')
    }
    
    this.currentPosition = fen
    
    if (this.options.debug) {
      console.log(`Setting position: ${fen}`)
      if (moves.length > 0) {
        console.log(`With moves: ${moves.join(' ')}`)
      }
    }
    
    if (nativeBinding && !this.stub) {
      if (moves.length > 0) {
        return this.engine.setPositionWithMoves(fen, moves)
      } else {
        return this.engine.setPosition(fen)
      }
    } else {
      // Stub implementation
      return true
    }
  }

  async go(options = {}) {
    if (!this.isReady) {
      throw new Error('Engine not ready')
    }
    
    if (this.isSearching) {
      throw new Error('Search already in progress')
    }
    
    this.isSearching = true
    
    try {
      if (this.options.debug) {
        console.log('Starting search with options:', options)
      }
      
      let result
      
      if (nativeBinding && !this.stub) {
        // Use native binding
        if (options.depth) {
          result = await this.engine.search(options.depth)
        } else if (options.movetime) {
          result = await this.engine.searchTime(options.movetime)
        } else if (options.nodes) {
          result = await this.engine.searchNodes(options.nodes)
        } else {
          result = await this.engine.search(20) // Default depth
        }
      } else {
        // Stub implementation
        await new Promise(resolve => setTimeout(resolve, 50)) // Simulate search time
        
        result = {
          bestMove: 'e2e4',
          ponderMove: 'e7e5',
          finalInfo: {
            depth: options.depth || 20,
            nodes: (options.depth || 20) * 1000,
            nps: 100000,
            timeMs: (options.depth || 20) * 10,
            scoreCp: 25,
            pv: ['e2e4', 'e7e5', 'g1f3']
          }
        }
      }
      
      this.emit('bestmove', result.bestMove, result.ponderMove)
      return result
      
    } finally {
      this.isSearching = false
    }
  }

  async stop() {
    if (!this.isSearching) {
      return
    }
    
    if (this.options.debug) {
      console.log('Stopping search...')
    }
    
    if (nativeBinding && !this.stub) {
      this.engine.stopSearch()
    }
    
    this.isSearching = false
    this.emit('searchStopped')
  }

  async analyze(fen, options = {}) {
    await this.position(fen)
    const result = await this.go(options)
    
    return {
      fen,
      bestMove: result.bestMove,
      lines: [{
        moves: result.finalInfo.pv || [result.bestMove],
        score: result.finalInfo.scoreCp,
        depth: result.finalInfo.depth
      }],
      depth: result.finalInfo.depth
    }
  }

  async evaluate(fen) {
    await this.position(fen)
    
    if (nativeBinding && !this.stub) {
      return this.engine.evaluateCurrentPosition()
    } else {
      // Stub implementation
      return 25
    }
  }

  async getLegalMoves(fen) {
    if (fen) {
      await this.position(fen)
    }
    
    if (nativeBinding && !this.stub) {
      return this.engine.getLegalMoves()
    } else {
      // Stub implementation
      return ['e2e4', 'd2d4', 'g1f3', 'b1c3']
    }
  }

  async isLegalMove(move, fen) {
    if (fen) {
      await this.position(fen)
    }
    
    if (nativeBinding && !this.stub) {
      return this.engine.isLegalMove(move)
    } else {
      // Stub implementation
      const legalMoves = await this.getLegalMoves()
      return legalMoves.includes(move)
    }
  }

  async quit() {
    if (this.isSearching) {
      await this.stop()
    }
    
    if (this.options.debug) {
      console.log('Shutting down native engine...')
    }
    
    if (nativeBinding && !this.stub && this.engine) {
      this.engine.shutdown()
      this.engine = null
    }
    
    this.isReady = false
    this.emit('close')
  }

  getStats() {
    return {
      isReady: this.isReady,
      isSearching: this.isSearching,
      engineType: 'native',
      currentPosition: this.currentPosition,
      usingStub: this.stub
    }
  }
}

// Factory function
export function createNativeEngine(options = {}) {
  return new NativeStockfishEngine(options)
}

// Check if native binding is available
export function isNativeEngineAvailable() {
  return nativeBinding !== null
}

export default {
  NativeStockfishEngine,
  createNativeEngine,
  isNativeEngineAvailable
}