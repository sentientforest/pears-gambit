/**
 * Pear's Gambit - AI Module
 * 
 * Main entry point for AI and analysis features
 */

export { UCIProtocol } from './uci-protocol.js'
export { ExternalStockfishEngine } from './external-engine.js'
export { StockfishManager } from './stockfish-manager.js'
export { PositionAnalysis } from './analysis.js'
export { HintSystem } from './hints.js'

import { StockfishManager } from './stockfish-manager.js'
import { PositionAnalysis } from './analysis.js'
import { HintSystem } from './hints.js'

/**
 * Create a Stockfish analysis instance
 * @param {Object} options - Configuration options
 * @returns {StockfishManager} Stockfish manager instance
 */
export function createStockfishAnalysis(options = {}) {
  return new StockfishManager({
    autoStart: true,
    multiPV: 3,
    ...options
  })
}

/**
 * Create a position analyzer
 * @param {Object} options - Configuration options
 * @returns {PositionAnalysis} Position analysis instance
 */
export function createPositionAnalyzer(options = {}) {
  return new PositionAnalysis({
    autoAnalyze: true,
    analysisDepth: 20,
    ...options
  })
}

/**
 * Create a hint system
 * @param {Object} options - Configuration options
 * @returns {HintSystem} Hint system instance
 */
export function createHintSystem(options = {}) {
  return new HintSystem({
    skillLevel: 'intermediate',
    teachingMode: true,
    ...options
  })
}

/**
 * AI Module singleton for easy access
 */
class AIModule {
  constructor() {
    this.stockfish = null
    this.analyzer = null
    this.hints = null
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

    // Create shared Stockfish instance
    this.stockfish = createStockfishAnalysis(options)
    
    // Create analyzer with shared Stockfish
    this.analyzer = createPositionAnalyzer({
      stockfish: this.stockfish,
      ...options
    })
    
    // Create hint system with shared analyzer
    this.hints = createHintSystem({
      analysis: this.analyzer,
      ...options
    })

    this.initialized = true
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
    return this.analyzer.analyze(fen, options)
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
    return this.stockfish.getBestMove(fen, options)
  }

  /**
   * Get hints for a position
   * @param {string} fen - Position FEN
   * @param {Object} context - Game context
   * @returns {Object} Hints and suggestions
   */
  async getHints(fen, context = {}) {
    if (!this.initialized) {
      await this.initialize()
    }
    return this.hints.getHints(fen, context)
  }

  /**
   * Analyze move quality
   * @param {string} fenBefore - Position before move
   * @param {string} fenAfter - Position after move
   * @param {string} move - Move played
   * @returns {Object} Move quality analysis
   */
  async analyzeMoveQuality(fenBefore, fenAfter, move) {
    if (!this.initialized) {
      await this.initialize()
    }
    return this.hints.analyzeMoveQuality(fenBefore, fenAfter, move)
  }

  /**
   * Start continuous analysis
   * @param {string} fen - Position to analyze
   */
  async startContinuousAnalysis(fen) {
    if (!this.initialized) {
      await this.initialize()
    }
    return this.stockfish.startContinuousAnalysis(fen)
  }

  /**
   * Stop continuous analysis
   */
  async stopContinuousAnalysis() {
    if (this.stockfish) {
      return this.stockfish.stopContinuousAnalysis()
    }
  }

  /**
   * Set engine strength
   * @param {number} level - Skill level (0-20)
   */
  async setStrength(level) {
    if (!this.initialized) {
      await this.initialize()
    }
    return this.stockfish.setStrength(level)
  }

  /**
   * Get AI status
   * @returns {Object} Status information
   */
  getStatus() {
    return {
      initialized: this.initialized,
      stockfishStatus: this.stockfish?.getStatus() || null,
      analyzerActive: this.analyzer?.isAnalyzing || false,
      hintsAvailable: this.hints !== null
    }
  }

  /**
   * Shutdown the AI module
   */
  async shutdown() {
    if (this.hints) {
      await this.hints.shutdown()
      this.hints = null
    }
    
    if (this.analyzer) {
      await this.analyzer.shutdown()
      this.analyzer = null
    }
    
    if (this.stockfish) {
      await this.stockfish.shutdown()
      this.stockfish = null
    }
    
    this.initialized = false
  }
}

// Export singleton instance
export const AI = new AIModule()

// Default export for convenience
export default {
  AI,
  createStockfishAnalysis,
  createPositionAnalyzer,
  createHintSystem
}