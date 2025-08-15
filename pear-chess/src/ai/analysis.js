/**
 * Pear's Gambit - Chess Position Analysis
 * 
 * High-level analysis functions for chess positions
 */

import { StockfishManager } from './stockfish-manager.js'

/**
 * Position analysis class
 * Provides detailed chess position analysis and insights
 */
export class PositionAnalysis {
  constructor(options = {}) {
    this.stockfish = options.stockfish || new StockfishManager(options)
    this.options = {
      autoAnalyze: options.autoAnalyze !== false,
      continuousAnalysis: options.continuousAnalysis || false,
      analysisDepth: options.analysisDepth || 20,
      ...options
    }
    
    this.currentAnalysis = null
    this.analysisHistory = []
    this.isAnalyzing = false
  }

  /**
   * Initialize the analysis engine
   */
  async initialize() {
    await this.stockfish.initialize()
  }

  /**
   * Analyze a chess position
   * @param {string} fen - Position in FEN format
   * @param {Object} options - Analysis options
   * @returns {Object} Comprehensive position analysis
   */
  async analyze(fen, options = {}) {
    this.isAnalyzing = true
    
    try {
      // Get engine analysis
      const engineAnalysis = await this.stockfish.analyzePosition(fen, {
        depth: options.depth || this.options.analysisDepth,
        ...options
      })
      
      // Build comprehensive analysis
      const analysis = {
        fen,
        timestamp: Date.now(),
        ...engineAnalysis,
        
        // Position assessment
        assessment: this.assessPosition(engineAnalysis),
        
        // Tactical features
        tactics: await this.findTactics(fen, engineAnalysis),
        
        // Strategic elements
        strategy: this.analyzeStrategy(fen, engineAnalysis),
        
        // Move recommendations
        recommendations: this.generateRecommendations(engineAnalysis)
      }
      
      // Store analysis
      this.currentAnalysis = analysis
      this.analysisHistory.push(analysis)
      
      // Limit history size
      if (this.analysisHistory.length > 100) {
        this.analysisHistory.shift()
      }
      
      return analysis
      
    } finally {
      this.isAnalyzing = false
    }
  }

  /**
   * Assess the position quality
   * @param {Object} engineAnalysis - Engine analysis results
   * @returns {Object} Position assessment
   */
  assessPosition(engineAnalysis) {
    const assessment = {
      advantage: 'equal',
      magnitude: 'small',
      winning: false,
      losing: false,
      critical: false
    }
    
    if (!engineAnalysis.evaluation) {
      return assessment
    }
    
    const eval_num = engineAnalysis.evaluation.numeric
    
    // Determine advantage
    if (eval_num > 0.3) {
      assessment.advantage = 'white'
    } else if (eval_num < -0.3) {
      assessment.advantage = 'black'
    }
    
    // Determine magnitude
    const absEval = Math.abs(eval_num)
    if (absEval < 0.5) {
      assessment.magnitude = 'small'
    } else if (absEval < 1.5) {
      assessment.magnitude = 'clear'
    } else if (absEval < 3.0) {
      assessment.magnitude = 'significant'
    } else {
      assessment.magnitude = 'winning'
    }
    
    // Set flags
    assessment.winning = eval_num > 3.0
    assessment.losing = eval_num < -3.0
    assessment.critical = absEval > 5.0 || engineAnalysis.evaluation.isMate
    
    // Add description
    assessment.description = this.describePosition(assessment, engineAnalysis.evaluation)
    
    return assessment
  }

  /**
   * Generate human-readable position description
   * @param {Object} assessment - Position assessment
   * @param {Object} evaluation - Position evaluation
   * @returns {string} Position description
   */
  describePosition(assessment, evaluation) {
    const descriptions = []
    
    if (evaluation.isMate) {
      const mateIn = Math.abs(evaluation.mateIn)
      const side = evaluation.mateIn > 0 ? 'White' : 'Black'
      descriptions.push(`${side} has mate in ${mateIn}`)
    } else if (assessment.advantage === 'equal') {
      descriptions.push('The position is approximately equal')
    } else {
      const side = assessment.advantage === 'white' ? 'White' : 'Black'
      
      switch (assessment.magnitude) {
        case 'small':
          descriptions.push(`${side} has a small advantage`)
          break
        case 'clear':
          descriptions.push(`${side} has a clear advantage`)
          break
        case 'significant':
          descriptions.push(`${side} has a significant advantage`)
          break
        case 'winning':
          descriptions.push(`${side} has a winning position`)
          break
      }
    }
    
    return descriptions.join('. ')
  }

  /**
   * Find tactical patterns in the position
   * @param {string} fen - Position FEN
   * @param {Object} engineAnalysis - Engine analysis
   * @returns {Object} Tactical patterns found
   */
  async findTactics(fen, engineAnalysis) {
    const tactics = {
      threats: [],
      opportunities: [],
      patterns: []
    }
    
    // Check for immediate threats (pieces under attack)
    // This would require additional position analysis
    
    // Check for tactical patterns in the best line
    if (engineAnalysis.bestLine && engineAnalysis.bestLine.length > 1) {
      // Look for common patterns
      const line = engineAnalysis.bestLine.join(' ')
      
      if (line.includes('x') && engineAnalysis.evaluation.numeric > 2) {
        tactics.patterns.push('winning_capture')
      }
      
      // Check for forced sequences
      if (engineAnalysis.depth > 10 && engineAnalysis.lines.length === 1) {
        tactics.patterns.push('forced_sequence')
      }
    }
    
    // Check evaluation swings that might indicate tactics
    if (Math.abs(engineAnalysis.evaluation.numeric) > 2) {
      tactics.opportunities.push('tactical_opportunity')
    }
    
    return tactics
  }

  /**
   * Analyze strategic elements
   * @param {string} fen - Position FEN
   * @param {Object} engineAnalysis - Engine analysis
   * @returns {Object} Strategic analysis
   */
  analyzeStrategy(fen, engineAnalysis) {
    const strategy = {
      phase: engineAnalysis.position?.phase || 'unknown',
      plans: [],
      imbalances: [],
      keySquares: []
    }
    
    // Analyze based on game phase
    switch (strategy.phase) {
      case 'opening':
        strategy.plans.push('Complete development')
        strategy.plans.push('Control the center')
        strategy.plans.push('Ensure king safety')
        break
        
      case 'middlegame':
        strategy.plans.push('Improve piece activity')
        strategy.plans.push('Create weaknesses')
        strategy.plans.push('Coordinate pieces')
        break
        
      case 'endgame':
        strategy.plans.push('Activate the king')
        strategy.plans.push('Create passed pawns')
        strategy.plans.push('Centralize pieces')
        break
    }
    
    return strategy
  }

  /**
   * Generate move recommendations
   * @param {Object} engineAnalysis - Engine analysis
   * @returns {Array} Move recommendations
   */
  generateRecommendations(engineAnalysis) {
    const recommendations = []
    
    if (engineAnalysis.bestMove) {
      recommendations.push({
        move: engineAnalysis.bestMove,
        type: 'best',
        evaluation: engineAnalysis.evaluation,
        explanation: 'Engine\'s top choice'
      })
    }
    
    if (engineAnalysis.alternatives) {
      engineAnalysis.alternatives.forEach((alt, index) => {
        const evalDiff = Math.abs(
          engineAnalysis.evaluation.numeric - alt.evaluation.numeric
        )
        
        let type = 'alternative'
        let explanation = 'Alternative move'
        
        if (evalDiff < 0.2) {
          type = 'equal'
          explanation = 'Equally good alternative'
        } else if (evalDiff < 0.5) {
          type = 'good'
          explanation = 'Good alternative'
        } else if (evalDiff > 1.0) {
          type = 'inferior'
          explanation = 'Significantly weaker'
        }
        
        recommendations.push({
          move: alt.move,
          type,
          evaluation: alt.evaluation,
          explanation
        })
      })
    }
    
    return recommendations
  }

  /**
   * Compare two positions
   * @param {string} fen1 - First position
   * @param {string} fen2 - Second position
   * @returns {Object} Position comparison
   */
  async comparePositions(fen1, fen2) {
    const [analysis1, analysis2] = await Promise.all([
      this.analyze(fen1),
      this.analyze(fen2)
    ])
    
    const evalDiff = (analysis2.evaluation?.numeric || 0) - 
                      (analysis1.evaluation?.numeric || 0)
    
    return {
      positions: { before: fen1, after: fen2 },
      evaluations: {
        before: analysis1.evaluation,
        after: analysis2.evaluation
      },
      change: evalDiff,
      improved: evalDiff > 0,
      description: this.describeChange(evalDiff)
    }
  }

  /**
   * Describe evaluation change
   * @param {number} change - Evaluation change
   * @returns {string} Change description
   */
  describeChange(change) {
    const absChange = Math.abs(change)
    
    if (absChange < 0.1) {
      return 'Position remains equal'
    } else if (absChange < 0.5) {
      return change > 0 ? 'Slight improvement' : 'Slight deterioration'
    } else if (absChange < 1.5) {
      return change > 0 ? 'Clear improvement' : 'Clear deterioration'
    } else {
      return change > 0 ? 'Significant improvement' : 'Significant deterioration'
    }
  }

  /**
   * Get analysis for current position
   */
  getCurrentAnalysis() {
    return this.currentAnalysis
  }

  /**
   * Get analysis history
   */
  getHistory() {
    return this.analysisHistory
  }

  /**
   * Clear analysis history
   */
  clearHistory() {
    this.analysisHistory = []
    this.currentAnalysis = null
  }

  /**
   * Shutdown analysis engine
   */
  async shutdown() {
    await this.stockfish.shutdown()
  }
}