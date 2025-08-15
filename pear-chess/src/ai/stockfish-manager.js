/**
 * Pear's Gambit - Stockfish Manager
 * 
 * High-level interface for Stockfish engine integration
 */

import { ExternalStockfishEngine } from './external-engine.js'
import { EventEmitter } from 'events'

/**
 * Stockfish engine manager
 * Provides high-level chess analysis functionality
 */
export class StockfishManager extends EventEmitter {
  constructor(options = {}) {
    super()
    
    this.options = {
      engineType: options.engineType || 'external', // 'external' or 'native' (future)
      cacheAnalysis: options.cacheAnalysis !== false,
      cacheSize: options.cacheSize || 100,
      defaultDepth: options.defaultDepth || 20,
      multiPV: options.multiPV || 3, // Number of best lines to analyze
      autoStart: options.autoStart !== false,
      ...options
    }
    
    this.engine = null
    this.analysisCache = new Map()
    this.currentPosition = null
    this.isInitialized = false
    
    if (this.options.autoStart) {
      this.initialize().catch(err => this.emit('error', err))
    }
  }

  /**
   * Initialize the engine
   */
  async initialize() {
    if (this.isInitialized) {
      return
    }
    
    try {
      // Create engine based on type
      if (this.options.engineType === 'external') {
        this.engine = new ExternalStockfishEngine({
          ...this.options,
          multiPV: this.options.multiPV
        })
      } else {
        // Future: Native engine implementation
        throw new Error(`Engine type ${this.options.engineType} not yet implemented`)
      }
      
      // Set up engine event handlers
      this.setupEngineHandlers()
      
      // Start the engine
      await this.engine.start()
      
      this.isInitialized = true
      this.emit('initialized')
      
    } catch (error) {
      this.emit('error', error)
      throw error
    }
  }

  /**
   * Set up engine event handlers
   */
  setupEngineHandlers() {
    this.engine.on('ready', () => {
      this.emit('ready')
    })
    
    this.engine.on('info', (info) => {
      this.emit('info', info)
    })
    
    this.engine.on('bestmove', (bestMove, ponderMove) => {
      this.emit('bestmove', bestMove, ponderMove)
    })
    
    this.engine.on('error', (error) => {
      this.emit('error', error)
    })
    
    this.engine.on('close', (code) => {
      this.isInitialized = false
      this.emit('close', code)
    })
  }

  /**
   * Ensure engine is ready
   */
  async ensureReady() {
    if (!this.isInitialized) {
      await this.initialize()
    }
    
    if (!this.engine.isRunning()) {
      throw new Error('Engine is not running')
    }
  }

  /**
   * Analyze a position
   * @param {string} fen - Position in FEN format
   * @param {Object} options - Analysis options
   * @returns {Object} Analysis results
   */
  async analyzePosition(fen, options = {}) {
    await this.ensureReady()
    
    const depth = options.depth || this.options.defaultDepth
    const cacheKey = `${fen}-d${depth}-pv${this.options.multiPV}`
    
    // Check cache
    if (this.options.cacheAnalysis && this.analysisCache.has(cacheKey)) {
      const cached = this.analysisCache.get(cacheKey)
      if (Date.now() - cached.timestamp < 300000) { // 5 minute cache
        return cached.analysis
      }
    }
    
    // Perform analysis
    const analysis = await this.engine.analyze(fen, {
      depth,
      ...options
    })
    
    // Process and enhance analysis
    const enhancedAnalysis = this.enhanceAnalysis(analysis, fen)
    
    // Cache result
    if (this.options.cacheAnalysis) {
      this.analysisCache.set(cacheKey, {
        analysis: enhancedAnalysis,
        timestamp: Date.now()
      })
      
      // Manage cache size
      if (this.analysisCache.size > this.options.cacheSize) {
        const firstKey = this.analysisCache.keys().next().value
        this.analysisCache.delete(firstKey)
      }
    }
    
    this.currentPosition = fen
    return enhancedAnalysis
  }

  /**
   * Enhance analysis with additional information
   * @param {Object} analysis - Raw analysis from engine
   * @param {string} fen - Position FEN
   * @returns {Object} Enhanced analysis
   */
  enhanceAnalysis(analysis, fen) {
    const enhanced = { ...analysis }
    
    // Convert centipawn evaluation to human-readable format
    if (analysis.eval) {
      enhanced.evaluation = this.formatEvaluation(analysis.eval)
    }
    
    // Add move quality indicators
    if (analysis.lines && analysis.lines.length > 0) {
      enhanced.bestMove = analysis.lines[0].moves[0]
      enhanced.bestLine = analysis.lines[0].moves
      
      // Categorize alternative moves
      if (analysis.lines.length > 1) {
        enhanced.alternatives = analysis.lines.slice(1).map(line => ({
          move: line.moves[0],
          evaluation: this.formatEvaluation(line.score),
          line: line.moves
        }))
      }
    }
    
    // Add position characteristics
    enhanced.position = {
      fen,
      phase: this.detectGamePhase(fen)
    }
    
    return enhanced
  }

  /**
   * Format evaluation for display
   * @param {Object} score - Score object from engine
   * @returns {Object} Formatted evaluation
   */
  formatEvaluation(score) {
    if (!score) return { display: '0.00', numeric: 0 }
    
    if (score.unit === 'mate') {
      return {
        display: `M${Math.abs(score.value)}`,
        numeric: score.value > 0 ? 10000 - score.value : -10000 - score.value,
        isMate: true,
        mateIn: score.value
      }
    }
    
    // Convert centipawns to pawns
    const pawns = score.value / 100
    return {
      display: pawns > 0 ? `+${pawns.toFixed(2)}` : pawns.toFixed(2),
      numeric: pawns,
      isMate: false
    }
  }

  /**
   * Detect game phase from FEN
   * @param {string} fen - Position FEN
   * @returns {string} Game phase (opening/middlegame/endgame)
   */
  detectGamePhase(fen) {
    const parts = fen.split(' ')
    const board = parts[0]
    
    // Count pieces
    const pieces = board.replace(/[1-8\/]/g, '')
    const totalPieces = pieces.length
    
    // Simple phase detection based on piece count
    if (totalPieces > 28) return 'opening'
    if (totalPieces > 16) return 'middlegame'
    return 'endgame'
  }

  /**
   * Get the best move for a position
   * @param {string} fen - Position FEN
   * @param {Object} options - Analysis options
   * @returns {string} Best move in UCI format
   */
  async getBestMove(fen, options = {}) {
    const analysis = await this.analyzePosition(fen, options)
    return analysis.bestMove
  }

  /**
   * Get move suggestions with explanations
   * @param {string} fen - Position FEN
   * @param {Object} options - Analysis options
   * @returns {Array} Move suggestions
   */
  async getMoveSuggestions(fen, options = {}) {
    const analysis = await this.analyzePosition(fen, {
      ...options,
      depth: options.depth || 15 // Slightly less depth for faster suggestions
    })
    
    const suggestions = []
    
    // Best move
    if (analysis.bestMove) {
      suggestions.push({
        move: analysis.bestMove,
        evaluation: analysis.evaluation,
        type: 'best',
        explanation: this.explainMove(analysis.bestMove, analysis.evaluation)
      })
    }
    
    // Alternative moves
    if (analysis.alternatives) {
      analysis.alternatives.forEach((alt, index) => {
        suggestions.push({
          move: alt.move,
          evaluation: alt.evaluation,
          type: index === 0 ? 'good' : 'alternative',
          explanation: this.explainMove(alt.move, alt.evaluation)
        })
      })
    }
    
    return suggestions
  }

  /**
   * Generate explanation for a move
   * @param {string} move - Move in UCI format
   * @param {Object} evaluation - Move evaluation
   * @returns {string} Move explanation
   */
  explainMove(move, evaluation) {
    const explanations = []
    
    // Basic move description
    const from = move.substring(0, 2)
    const to = move.substring(2, 4)
    const promotion = move.substring(4, 5)
    
    explanations.push(`Move from ${from} to ${to}`)
    
    if (promotion) {
      const pieces = { q: 'Queen', r: 'Rook', b: 'Bishop', n: 'Knight' }
      explanations.push(`Promote to ${pieces[promotion] || promotion}`)
    }
    
    // Evaluation-based explanation
    if (evaluation) {
      if (evaluation.isMate) {
        explanations.push(`Mate in ${Math.abs(evaluation.mateIn)} moves`)
      } else if (evaluation.numeric > 2) {
        explanations.push('Winning advantage')
      } else if (evaluation.numeric > 0.5) {
        explanations.push('Slight advantage')
      } else if (evaluation.numeric < -2) {
        explanations.push('Losing position')
      } else if (evaluation.numeric < -0.5) {
        explanations.push('Slight disadvantage')
      } else {
        explanations.push('Equal position')
      }
    }
    
    return explanations.join('. ')
  }

  /**
   * Start continuous analysis of a position
   * @param {string} fen - Position to analyze
   */
  async startContinuousAnalysis(fen) {
    await this.ensureReady()
    this.currentPosition = fen
    await this.engine.startInfiniteAnalysis(fen)
  }

  /**
   * Stop continuous analysis
   */
  async stopContinuousAnalysis() {
    if (this.engine && this.engine.isAnalyzing) {
      await this.engine.stop()
    }
  }

  /**
   * Set engine strength (skill level)
   * @param {number} level - Skill level (0-20, 20 is strongest)
   */
  async setStrength(level) {
    await this.ensureReady()
    await this.engine.setOption('Skill Level', Math.max(0, Math.min(20, level)))
  }

  /**
   * Clear analysis cache
   */
  clearCache() {
    this.analysisCache.clear()
  }

  /**
   * Shutdown the engine
   */
  async shutdown() {
    if (this.engine) {
      await this.engine.quit()
      this.engine = null
      this.isInitialized = false
    }
    
    this.clearCache()
    this.emit('shutdown')
  }

  /**
   * Get engine status
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      running: this.engine ? this.engine.isRunning() : false,
      analyzing: this.engine ? this.engine.isAnalyzing : false,
      currentPosition: this.currentPosition,
      cacheSize: this.analysisCache.size
    }
  }
}