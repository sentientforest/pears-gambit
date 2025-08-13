/**
 * Pear's Gambit - Move Hints and Teaching System
 * 
 * Provides educational hints and move suggestions
 */

import { PositionAnalysis } from './analysis.js'

/**
 * Chess hints and teaching system
 */
export class HintSystem {
  constructor(options = {}) {
    this.analysis = options.analysis || new PositionAnalysis(options)
    this.options = {
      skillLevel: options.skillLevel || 'intermediate', // beginner, intermediate, advanced
      verbosity: options.verbosity || 'normal', // minimal, normal, detailed
      teachingMode: options.teachingMode || false,
      ...options
    }
    
    this.hintHistory = []
  }

  /**
   * Initialize the hint system
   */
  async initialize() {
    await this.analysis.initialize()
  }

  /**
   * Get hints for a position
   * @param {string} fen - Current position
   * @param {Object} context - Game context (history, time, etc.)
   * @returns {Object} Hints and suggestions
   */
  async getHints(fen, context = {}) {
    // Analyze the position
    const analysis = await this.analysis.analyze(fen, {
      depth: this.getAnalysisDepth()
    })
    
    // Generate hints based on analysis
    const hints = {
      bestMove: null,
      alternatives: [],
      warnings: [],
      concepts: [],
      evaluation: analysis.assessment
    }
    
    // Best move hint
    if (analysis.recommendations && analysis.recommendations.length > 0) {
      const bestRec = analysis.recommendations[0]
      hints.bestMove = {
        move: bestRec.move,
        explanation: this.explainMove(bestRec, analysis, context),
        strength: this.assessMoveStrength(bestRec.evaluation)
      }
    }
    
    // Alternative moves
    if (analysis.recommendations) {
      hints.alternatives = analysis.recommendations
        .slice(1, 4) // Top 3 alternatives
        .map(rec => ({
          move: rec.move,
          explanation: this.explainMove(rec, analysis, context),
          comparison: this.compareMoves(analysis.recommendations[0], rec)
        }))
    }
    
    // Generate warnings
    hints.warnings = this.generateWarnings(analysis, context)
    
    // Educational concepts
    if (this.options.teachingMode) {
      hints.concepts = this.identifyConcepts(analysis, context)
    }
    
    // Store hint for history
    this.hintHistory.push({
      fen,
      hints,
      timestamp: Date.now()
    })
    
    return hints
  }

  /**
   * Get skill-appropriate analysis depth
   */
  getAnalysisDepth() {
    switch (this.options.skillLevel) {
      case 'beginner': return 10
      case 'intermediate': return 15
      case 'advanced': return 20
      default: return 15
    }
  }

  /**
   * Explain a move in context
   * @param {Object} recommendation - Move recommendation
   * @param {Object} analysis - Position analysis
   * @param {Object} context - Game context
   * @returns {string} Move explanation
   */
  explainMove(recommendation, analysis, context) {
    const explanations = []
    
    // Basic move description
    const moveDesc = this.describeMoveInContext(recommendation.move, analysis.fen)
    if (moveDesc) explanations.push(moveDesc)
    
    // Evaluation-based explanation
    if (recommendation.evaluation) {
      const evalExpl = this.explainEvaluation(recommendation.evaluation)
      if (evalExpl) explanations.push(evalExpl)
    }
    
    // Type-based explanation
    switch (recommendation.type) {
      case 'best':
        explanations.push('This is the strongest move')
        break
      case 'equal':
        explanations.push('This move is equally good')
        break
      case 'good':
        explanations.push('This is a solid alternative')
        break
      case 'inferior':
        explanations.push('This move is playable but not optimal')
        break
    }
    
    // Add strategic context if teaching mode
    if (this.options.teachingMode && analysis.strategy) {
      const strategyHint = this.getStrategyHint(recommendation.move, analysis.strategy)
      if (strategyHint) explanations.push(strategyHint)
    }
    
    return explanations.join('. ')
  }

  /**
   * Describe a move in the context of the position
   * @param {string} move - UCI move
   * @param {string} fen - Position FEN
   * @returns {string} Move description
   */
  describeMoveInContext(move, fen) {
    // Parse move
    const from = move.substring(0, 2)
    const to = move.substring(2, 4)
    const promotion = move.substring(4, 5)
    
    // Get piece type from FEN (simplified)
    const pieceMap = {
      'K': 'King', 'Q': 'Queen', 'R': 'Rook',
      'B': 'Bishop', 'N': 'Knight', 'P': 'Pawn'
    }
    
    let description = `Move from ${from} to ${to}`
    
    if (promotion) {
      const pieces = { q: 'Queen', r: 'Rook', b: 'Bishop', n: 'Knight' }
      description += ` and promote to ${pieces[promotion] || 'piece'}`
    }
    
    return description
  }

  /**
   * Explain evaluation in user-friendly terms
   * @param {Object} evaluation - Position evaluation
   * @returns {string} Evaluation explanation
   */
  explainEvaluation(evaluation) {
    if (!evaluation) return null
    
    if (evaluation.isMate) {
      const mateIn = Math.abs(evaluation.mateIn)
      return evaluation.mateIn > 0 
        ? `Leads to checkmate in ${mateIn} moves!`
        : `Allows checkmate in ${mateIn} moves`
    }
    
    const eval_num = evaluation.numeric
    
    if (Math.abs(eval_num) < 0.3) {
      return 'Maintains equality'
    } else if (eval_num > 3) {
      return 'Gives a winning advantage'
    } else if (eval_num > 1) {
      return 'Achieves a clear advantage'
    } else if (eval_num > 0) {
      return 'Gives a slight edge'
    } else if (eval_num < -3) {
      return 'Results in a losing position'
    } else if (eval_num < -1) {
      return 'Leads to a difficult position'
    } else {
      return 'Slightly weakens the position'
    }
  }

  /**
   * Assess move strength
   * @param {Object} evaluation - Move evaluation
   * @returns {string} Strength assessment
   */
  assessMoveStrength(evaluation) {
    if (!evaluation) return 'unknown'
    
    if (evaluation.isMate && evaluation.mateIn > 0) {
      return 'winning'
    }
    
    const eval_num = evaluation.numeric
    
    if (eval_num > 2) return 'excellent'
    if (eval_num > 0.5) return 'good'
    if (eval_num > -0.5) return 'neutral'
    if (eval_num > -2) return 'dubious'
    return 'poor'
  }

  /**
   * Compare two moves
   * @param {Object} move1 - First move
   * @param {Object} move2 - Second move
   * @returns {string} Comparison description
   */
  compareMoves(move1, move2) {
    if (!move1.evaluation || !move2.evaluation) {
      return 'Alternative move'
    }
    
    const diff = move1.evaluation.numeric - move2.evaluation.numeric
    
    if (Math.abs(diff) < 0.1) {
      return 'Practically equivalent'
    } else if (diff > 2) {
      return 'Much weaker than the best move'
    } else if (diff > 0.5) {
      return 'Slightly weaker than the best move'
    } else {
      return 'Nearly as good as the best move'
    }
  }

  /**
   * Generate warnings about the position
   * @param {Object} analysis - Position analysis
   * @param {Object} context - Game context
   * @returns {Array} Warning messages
   */
  generateWarnings(analysis, context) {
    const warnings = []
    
    // Check for critical positions
    if (analysis.assessment.critical) {
      warnings.push({
        type: 'critical',
        message: 'Critical position! Think carefully about your next move.'
      })
    }
    
    // Check for mate threats
    if (analysis.evaluation?.isMate) {
      if (analysis.evaluation.mateIn < 0) {
        warnings.push({
          type: 'mate_threat',
          message: `Mate threat in ${Math.abs(analysis.evaluation.mateIn)} moves!`
        })
      }
    }
    
    // Check for losing positions
    if (analysis.assessment.losing) {
      warnings.push({
        type: 'losing',
        message: 'You are in a difficult position. Look for defensive resources.'
      })
    }
    
    // Check for tactical opportunities
    if (analysis.tactics?.opportunities?.length > 0) {
      warnings.push({
        type: 'tactical',
        message: 'Tactical opportunity available!'
      })
    }
    
    return warnings
  }

  /**
   * Identify educational concepts
   * @param {Object} analysis - Position analysis
   * @param {Object} context - Game context
   * @returns {Array} Educational concepts
   */
  identifyConcepts(analysis, context) {
    const concepts = []
    
    // Phase-specific concepts
    switch (analysis.strategy?.phase) {
      case 'opening':
        concepts.push({
          name: 'Opening Principles',
          points: [
            'Control the center',
            'Develop pieces before moving them twice',
            'Castle early for king safety'
          ]
        })
        break
        
      case 'middlegame':
        concepts.push({
          name: 'Middlegame Strategy',
          points: [
            'Improve piece coordination',
            'Create weaknesses in opponent\'s position',
            'Control key squares'
          ]
        })
        break
        
      case 'endgame':
        concepts.push({
          name: 'Endgame Technique',
          points: [
            'Activate your king',
            'Create passed pawns',
            'Centralize pieces'
          ]
        })
        break
    }
    
    // Tactical patterns
    if (analysis.tactics?.patterns?.length > 0) {
      const patterns = analysis.tactics.patterns
      if (patterns.includes('fork')) {
        concepts.push({
          name: 'Fork',
          description: 'Attack two pieces simultaneously'
        })
      }
      if (patterns.includes('pin')) {
        concepts.push({
          name: 'Pin',
          description: 'Immobilize a piece by attacking the piece behind it'
        })
      }
    }
    
    return concepts
  }

  /**
   * Get strategy-based hint
   * @param {string} move - Move being explained
   * @param {Object} strategy - Strategic analysis
   * @returns {string} Strategy hint
   */
  getStrategyHint(move, strategy) {
    if (!strategy.plans || strategy.plans.length === 0) {
      return null
    }
    
    // Match move to strategic plans
    const relevantPlan = strategy.plans[0] // Simplified
    return `This move helps to ${relevantPlan.toLowerCase()}`
  }

  /**
   * Get a simple hint (for quick suggestions)
   * @param {string} fen - Position FEN
   * @returns {Object} Simple hint
   */
  async getQuickHint(fen) {
    const bestMove = await this.analysis.stockfish.getBestMove(fen, {
      depth: 10 // Quick analysis
    })
    
    return {
      move: bestMove,
      description: 'Suggested move'
    }
  }

  /**
   * Analyze a played move
   * @param {string} fenBefore - Position before move
   * @param {string} fenAfter - Position after move
   * @param {string} move - Move played
   * @returns {Object} Move analysis
   */
  async analyzeMoveQuality(fenBefore, fenAfter, move) {
    // Compare positions
    const comparison = await this.analysis.comparePositions(fenBefore, fenAfter)
    
    // Get best move for comparison
    const bestMoveAnalysis = await this.analysis.analyze(fenBefore, {
      depth: 15
    })
    
    const wasbestMove = bestMoveAnalysis.bestMove === move
    
    // Categorize move quality
    let quality = 'good'
    let feedback = ''
    
    if (wasbestMove) {
      quality = 'best'
      feedback = 'Excellent! You found the best move.'
    } else if (comparison.change < -2) {
      quality = 'blunder'
      feedback = 'This move loses significant material or advantage.'
    } else if (comparison.change < -0.5) {
      quality = 'mistake'
      feedback = 'This move weakens your position.'
    } else if (comparison.change < -0.2) {
      quality = 'inaccuracy'
      feedback = 'A slightly inaccurate move.'
    } else {
      quality = 'good'
      feedback = 'A reasonable move.'
    }
    
    return {
      move,
      quality,
      feedback,
      evaluation: comparison,
      bestMove: bestMoveAnalysis.bestMove,
      missed: !wasbestMove ? bestMoveAnalysis.bestMove : null
    }
  }

  /**
   * Get hint history
   */
  getHistory() {
    return this.hintHistory
  }

  /**
   * Clear hint history
   */
  clearHistory() {
    this.hintHistory = []
  }

  /**
   * Shutdown hint system
   */
  async shutdown() {
    await this.analysis.shutdown()
  }
}