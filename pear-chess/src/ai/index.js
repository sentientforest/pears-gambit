/**
 * Pear's Gambit - AI Module
 * 
 * Main entry point for AI and analysis features
 */

export { OpeningBook } from './opening-book.js'
export { StubEngine, StubGameAnalyzer } from './engine-stub.js'

import { OpeningBook } from './opening-book.js'
import { StubEngine, StubGameAnalyzer } from './engine-stub.js'

// Try to import real external engine (Node.js only)
let SimpleStockfishEngine = null

try {
  const externalEngineModule = await import('./external-engine-simple.js')
  SimpleStockfishEngine = externalEngineModule.SimpleStockfishEngine
} catch (error) {
  console.warn('External engine not available, using stubs:', error.message)
}

/**
 * Create a Stockfish analysis instance
 * @param {Object} options - Configuration options
 * @returns {SimpleStockfishEngine|StubEngine} Stockfish engine instance
 */
export function createStockfishAnalysis(options = {}) {
  if (SimpleStockfishEngine) {
    // Use real external engine when available
    return new SimpleStockfishEngine({
      debug: false,
      ...options
    })
  } else {
    // Fallback to stub engine for Pear Runtime compatibility
    return new StubEngine({
      debug: false,
      ...options
    })
  }
}

/**
 * Create a game analyzer
 * @param {Object} options - Configuration options
 * @returns {StubGameAnalyzer} Game analyzer instance (stub)
 */
export function createGameAnalyzer(options = {}) {
  return new StubGameAnalyzer({
    engineDepth: 15,
    debug: false,
    ...options
  })
}

/**
 * Create an opening book
 * @param {Object} options - Configuration options
 * @returns {OpeningBook} Opening book instance
 */
export function createOpeningBook(options = {}) {
  return new OpeningBook(options)
}

/**
 * AI Module singleton for easy access
 */
class AIModule {
  constructor() {
    this.stockfish = null
    this.gameAnalyzer = null
    this.openingBook = null
    this.initialized = false
  }

  /**
   * Initialize the AI module
   * @param {Object} options - Configuration options
   */
  async initialize(options = {}) {
    if (this.initialized) {
      return
    }

    try {
      // Create Stockfish engine instance
      this.stockfish = createStockfishAnalysis(options)
      await this.stockfish.start()
      
      // Create game analyzer
      this.gameAnalyzer = createGameAnalyzer(options)
      await this.gameAnalyzer.initialize()
      
      // Create opening book
      this.openingBook = createOpeningBook(options)

      this.initialized = true
    } catch (error) {
      console.error('Failed to initialize AI module:', error)
      throw error
    }
  }

  /**
   * Analyze a position
   * @param {string} fen - Position FEN
   * @param {Object} options - Analysis options
   * @returns {Object} Analysis results
   */
  async analyzePosition(fen, options = {}) {
    if (!this.initialized) {
      await this.initialize()
    }
    return this.stockfish.analyze(fen, options)
  }

  /**
   * Get best move for a position
   * @param {string} fen - Position FEN
   * @param {Object} options - Analysis options
   * @returns {string} Best move in UCI format
   */
  async getBestMove(fen, options = {}) {
    if (!this.initialized) {
      await this.initialize()
    }
    await this.stockfish.position(fen)
    const result = await this.stockfish.go(options)
    return result.bestMove
  }

  /**
   * Get opening information for position
   * @param {string[]} moves - Array of moves
   * @returns {Object} Opening information
   */
  getOpening(moves) {
    if (!this.openingBook) {
      return { name: 'Unknown', eco: '---', description: 'Opening book not loaded' }
    }
    return this.openingBook.getOpening(moves)
  }

  /**
   * Analyze a complete game
   * @param {Object} gameData - Game data (moves array or PGN)
   * @returns {Object} Complete game analysis
   */
  async analyzeGame(gameData) {
    if (!this.initialized) {
      await this.initialize()
    }
    return this.gameAnalyzer.analyzeGame(gameData)
  }

  /**
   * Start continuous analysis (placeholder)
   * @param {string} fen - Position to analyze
   */
  async startContinuousAnalysis(fen) {
    // For now, just analyze once
    return this.analyzePosition(fen)
  }

  /**
   * Stop continuous analysis (placeholder)
   */
  async stopContinuousAnalysis() {
    // Placeholder - would stop ongoing analysis
    return true
  }

  /**
   * Set engine options
   * @param {string} name - Option name
   * @param {string} value - Option value
   */
  async setOption(name, value) {
    if (!this.initialized) {
      await this.initialize()
    }
    return this.stockfish.setOption(name, value)
  }

  /**
   * Get AI status
   * @returns {Object} Status information
   */
  getStatus() {
    return {
      initialized: this.initialized,
      stockfishReady: this.stockfish?.isReady || false,
      openingBookLoaded: this.openingBook !== null,
      gameAnalyzerReady: this.gameAnalyzer !== null,
      engineType: SimpleStockfishEngine ? 'external' : 'stub',
      hasRealStockfish: SimpleStockfishEngine !== null
    }
  }

  /**
   * Shutdown the AI module
   */
  async shutdown() {
    if (this.gameAnalyzer) {
      await this.gameAnalyzer.shutdown()
      this.gameAnalyzer = null
    }
    
    if (this.stockfish) {
      await this.stockfish.quit()
      this.stockfish = null
    }
    
    this.openingBook = null
    this.initialized = false
  }
}

// Export singleton instance
export const AI = new AIModule()

// Default export for convenience
export default {
  AI,
  createStockfishAnalysis,
  createGameAnalyzer,
  createOpeningBook
}