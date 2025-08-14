/**
 * Pear's Gambit - Game Analyzer
 * 
 * Analyzes completed games and provides insights
 */

import { SimpleStockfishEngine } from './external-engine-simple.js'
import { OpeningBook } from './opening-book.js'
import { Chess } from 'chess.js'

/**
 * Game Analyzer
 * Provides detailed analysis of chess games
 */
export class GameAnalyzer {
  constructor(options = {}) {
    this.options = {
      engineDepth: options.engineDepth || 15,
      blunderThreshold: options.blunderThreshold || -200, // centipawns
      mistakeThreshold: options.mistakeThreshold || -100,
      inaccuracyThreshold: options.inaccuracyThreshold || -50,
      debug: options.debug || false,
      ...options
    }
    
    this.engine = null
    this.openingBook = new OpeningBook()
    this.isAnalyzing = false
  }

  /**
   * Initialize the analyzer
   */
  async initialize() {
    if (!this.engine) {
      this.engine = new SimpleStockfishEngine({
        debug: this.options.debug
      })
      await this.engine.start()
    }
  }

  /**
   * Analyze a complete game
   * @param {Object} gameData - Game data (PGN or moves array)
   * @returns {Object} Complete game analysis
   */
  async analyzeGame(gameData) {
    await this.initialize()
    
    this.isAnalyzing = true
    const analysis = {
      moves: [],
      opening: null,
      accuracy: { white: 0, black: 0 },
      blunders: { white: 0, black: 0 },
      mistakes: { white: 0, black: 0 },
      inaccuracies: { white: 0, black: 0 },
      brilliant: [],
      critical: [],
      timeUsage: null,
      evaluation: [],
      summary: null
    }
    
    try {
      // Parse game
      const game = new Chess()
      const moves = this.extractMoves(gameData)
      
      // Analyze opening
      analysis.opening = this.openingBook.getOpening(moves.slice(0, 10))
      
      // Analyze each position
      let previousEval = 0
      const moveAnalyses = []
      
      for (let i = 0; i < moves.length; i++) {
        const moveNum = Math.floor(i / 2) + 1
        const isWhite = i % 2 === 0
        const player = isWhite ? 'white' : 'black'
        
        // Get position before move
        const fenBefore = game.fen()
        
        // Make move
        const move = game.move(moves[i])
        if (!move) {
          console.error(`Invalid move at position ${i}: ${moves[i]}`)
          continue
        }
        
        // Get position after move
        const fenAfter = game.fen()
        
        // Analyze position
        const positionAnalysis = await this.analyzePosition(fenBefore, fenAfter, move.san)
        
        // Calculate move quality
        const evalChange = positionAnalysis.evaluation - previousEval
        const adjustedChange = isWhite ? evalChange : -evalChange
        
        const moveQuality = this.classifyMove(adjustedChange, positionAnalysis.bestMove === move.san)
        
        // Update statistics
        if (moveQuality === 'blunder') analysis.blunders[player]++
        else if (moveQuality === 'mistake') analysis.mistakes[player]++
        else if (moveQuality === 'inaccuracy') analysis.inaccuracies[player]++
        else if (moveQuality === 'brilliant') analysis.brilliant.push({ move: i, san: move.san })
        
        // Store analysis
        moveAnalyses.push({
          moveNumber: moveNum,
          player,
          san: move.san,
          uci: move.from + move.to + (move.promotion || ''),
          quality: moveQuality,
          evaluation: positionAnalysis.evaluation,
          bestMove: positionAnalysis.bestMove,
          ...positionAnalysis
        })
        
        analysis.evaluation.push(positionAnalysis.evaluation)
        previousEval = positionAnalysis.evaluation
        
        // Identify critical moments
        if (Math.abs(evalChange) > 200) {
          analysis.critical.push({
            move: i,
            san: move.san,
            evalChange,
            description: this.describeCriticalMoment(evalChange, isWhite)
          })
        }
      }
      
      analysis.moves = moveAnalyses
      
      // Calculate accuracy scores
      analysis.accuracy = this.calculateAccuracy(moveAnalyses)
      
      // Generate summary
      analysis.summary = this.generateSummary(analysis, game)
      
    } catch (error) {
      console.error('Game analysis failed:', error)
      throw error
    } finally {
      this.isAnalyzing = false
    }
    
    return analysis
  }

  /**
   * Analyze a single position
   * @param {string} fenBefore - Position before move
   * @param {string} fenAfter - Position after move
   * @param {string} movePlayed - Move that was played
   * @returns {Object} Position analysis
   */
  async analyzePosition(fenBefore, fenAfter, movePlayed) {
    // Analyze position before move to get best move
    const beforeAnalysis = await this.engine.analyze(fenBefore, {
      depth: this.options.engineDepth
    })
    
    // Analyze position after move for evaluation
    const afterAnalysis = await this.engine.analyze(fenAfter, {
      depth: this.options.engineDepth
    })
    
    // Convert evaluations to centipawns
    const evalBefore = this.scoreToCP(beforeAnalysis.lines[0]?.score)
    const evalAfter = this.scoreToCP(afterAnalysis.lines[0]?.score)
    
    return {
      evaluation: evalAfter,
      evalChange: evalAfter - evalBefore,
      bestMove: this.convertUCIToSAN(beforeAnalysis.bestMove, fenBefore),
      bestLine: beforeAnalysis.lines[0]?.moves.slice(0, 5),
      depth: beforeAnalysis.depth,
      wasbestMove: movePlayed === this.convertUCIToSAN(beforeAnalysis.bestMove, fenBefore)
    }
  }

  /**
   * Convert score to centipawns
   * @param {Object} score - Score object from engine
   * @returns {number} Centipawn evaluation
   */
  scoreToCP(score) {
    if (!score) return 0
    
    if (score.unit === 'mate') {
      // Convert mate to large centipawn value
      return score.value > 0 ? 10000 - score.value : -10000 - score.value
    }
    
    return score.value || 0
  }

  /**
   * Convert UCI move to SAN
   * @param {string} uciMove - Move in UCI format
   * @param {string} fen - Position FEN
   * @returns {string} Move in SAN format
   */
  convertUCIToSAN(uciMove, fen) {
    if (!uciMove) return null
    
    try {
      const tempGame = new Chess(fen)
      const move = tempGame.move({
        from: uciMove.substring(0, 2),
        to: uciMove.substring(2, 4),
        promotion: uciMove[4]
      })
      return move ? move.san : uciMove
    } catch {
      return uciMove
    }
  }

  /**
   * Classify move quality
   * @param {number} evalChange - Evaluation change (adjusted for color)
   * @param {boolean} wasBest - Was this the best move?
   * @returns {string} Move classification
   */
  classifyMove(evalChange, wasBest) {
    if (wasBest && evalChange > 100) return 'brilliant'
    if (wasBest) return 'best'
    if (evalChange > 50) return 'good'
    if (evalChange > -this.options.inaccuracyThreshold) return 'ok'
    if (evalChange > -this.options.mistakeThreshold) return 'inaccuracy'
    if (evalChange > -this.options.blunderThreshold) return 'mistake'
    return 'blunder'
  }

  /**
   * Calculate accuracy scores
   * @param {Array} moveAnalyses - Array of move analyses
   * @returns {Object} Accuracy scores for each player
   */
  calculateAccuracy(moveAnalyses) {
    const accuracy = { white: 0, black: 0 }
    const moveCounts = { white: 0, black: 0 }
    const goodMoves = { white: 0, black: 0 }
    
    for (const analysis of moveAnalyses) {
      moveCounts[analysis.player]++
      
      if (['best', 'brilliant', 'good', 'ok'].includes(analysis.quality)) {
        goodMoves[analysis.player]++
      }
    }
    
    // Calculate percentage
    if (moveCounts.white > 0) {
      accuracy.white = Math.round((goodMoves.white / moveCounts.white) * 100)
    }
    if (moveCounts.black > 0) {
      accuracy.black = Math.round((goodMoves.black / moveCounts.black) * 100)
    }
    
    return accuracy
  }

  /**
   * Describe a critical moment
   * @param {number} evalChange - Evaluation change
   * @param {boolean} isWhite - Is white to move
   * @returns {string} Description
   */
  describeCriticalMoment(evalChange, isWhite) {
    const absChange = Math.abs(evalChange)
    const gainedAdvantage = (evalChange > 0 && isWhite) || (evalChange < 0 && !isWhite)
    
    if (absChange > 500) {
      return gainedAdvantage ? 'Decisive advantage gained!' : 'Critical blunder!'
    } else if (absChange > 300) {
      return gainedAdvantage ? 'Significant advantage gained' : 'Major mistake'
    } else {
      return gainedAdvantage ? 'Important improvement' : 'Costly inaccuracy'
    }
  }

  /**
   * Generate game summary
   * @param {Object} analysis - Complete analysis
   * @param {Object} game - Chess.js game instance
   * @returns {Object} Game summary
   */
  generateSummary(analysis, game) {
    const result = game.isCheckmate() ? (game.turn() === 'w' ? '0-1' : '1-0') :
                   game.isDraw() ? '1/2-1/2' : '*'
    
    const totalMoves = analysis.moves.length
    const bookMoves = analysis.moves.filter((_, i) => i < 10 && analysis.opening.book).length
    
    return {
      result,
      totalMoves,
      opening: analysis.opening.name,
      bookMoves,
      accuracy: analysis.accuracy,
      performance: {
        white: this.getPerformanceRating(analysis.accuracy.white, analysis.blunders.white),
        black: this.getPerformanceRating(analysis.accuracy.black, analysis.blunders.black)
      },
      keyMoments: analysis.critical.length,
      brilliantMoves: analysis.brilliant.length,
      evaluation: {
        start: analysis.evaluation[0] || 0,
        end: analysis.evaluation[analysis.evaluation.length - 1] || 0,
        max: Math.max(...analysis.evaluation),
        min: Math.min(...analysis.evaluation)
      }
    }
  }

  /**
   * Get performance rating
   * @param {number} accuracy - Accuracy percentage
   * @param {number} blunders - Number of blunders
   * @returns {string} Performance rating
   */
  getPerformanceRating(accuracy, blunders) {
    if (accuracy >= 95 && blunders === 0) return 'Perfect'
    if (accuracy >= 90 && blunders <= 1) return 'Excellent'
    if (accuracy >= 80 && blunders <= 2) return 'Good'
    if (accuracy >= 70) return 'Average'
    if (accuracy >= 60) return 'Below Average'
    return 'Poor'
  }

  /**
   * Extract moves from game data
   * @param {Object} gameData - PGN string or moves array
   * @returns {Array} Array of moves
   */
  extractMoves(gameData) {
    if (Array.isArray(gameData)) {
      return gameData
    }
    
    if (typeof gameData === 'string') {
      // Parse PGN
      const game = new Chess()
      game.loadPgn(gameData)
      return game.history()
    }
    
    if (gameData.moves) {
      return gameData.moves
    }
    
    throw new Error('Invalid game data format')
  }

  /**
   * Get move-by-move annotations
   * @param {Object} analysis - Game analysis
   * @returns {Array} Annotated moves
   */
  getAnnotations(analysis) {
    return analysis.moves.map(move => {
      let annotation = move.san
      
      // Add move quality symbol
      const symbols = {
        brilliant: '!!',
        best: '',
        good: '',
        ok: '',
        inaccuracy: '?!',
        mistake: '?',
        blunder: '??'
      }
      
      annotation += symbols[move.quality] || ''
      
      // Add evaluation
      if (move.evaluation !== undefined) {
        const evalStr = move.evaluation > 0 ? '+' : ''
        annotation += ` (${evalStr}${(move.evaluation / 100).toFixed(2)})`
      }
      
      // Add best move if different
      if (!move.wasbestMove && move.bestMove) {
        annotation += ` [Better: ${move.bestMove}]`
      }
      
      return annotation
    })
  }

  /**
   * Shutdown the analyzer
   */
  async shutdown() {
    if (this.engine) {
      await this.engine.quit()
      this.engine = null
    }
  }
}