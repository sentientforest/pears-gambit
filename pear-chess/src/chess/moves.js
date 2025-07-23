/**
 * Pear's Gambit - Chess Move Logic
 * 
 * Advanced move handling, validation, and analysis
 */

import { chessBoard } from './board.js'

/**
 * Move utilities and validation
 */
export class MoveHandler {
  constructor() {
    this.promotionPieces = ['q', 'r', 'b', 'n']
  }

  /**
   * Parse move input into standardized format
   * @param {string|Object} moveInput - Move in various formats
   * @returns {Object} Standardized move object
   */
  parseMove(moveInput) {
    if (typeof moveInput === 'string') {
      // Handle various string formats
      if (moveInput.length === 4) {
        // e.g., "e2e4"
        return {
          from: moveInput.substring(0, 2),
          to: moveInput.substring(2, 4)
        }
      } else if (moveInput.length === 5 && this.promotionPieces.includes(moveInput[4])) {
        // e.g., "e7e8q"
        return {
          from: moveInput.substring(0, 2),
          to: moveInput.substring(2, 4),
          promotion: moveInput[4]
        }
      } else {
        // Assume SAN (Standard Algebraic Notation)
        return { san: moveInput }
      }
    }

    // Already an object, return as-is
    return moveInput
  }

  /**
   * Validate move format
   * @param {Object} move - Move object
   * @returns {boolean} True if valid format
   */
  isValidMoveFormat(move) {
    if (!move) return false

    // SAN format
    if (move.san) {
      return typeof move.san === 'string' && move.san.length > 0
    }

    // Long algebraic format
    if (move.from && move.to) {
      return chessBoard.isValidSquare(move.from) && 
             chessBoard.isValidSquare(move.to) &&
             move.from !== move.to
    }

    return false
  }

  /**
   * Check if move is a castling move
   * @param {Object} move - Move object
   * @returns {Object|null} Castling details or null
   */
  getCastlingInfo(move) {
    if (!move.from || !move.to) return null

    const castlingMoves = {
      // White castling
      'e1g1': { side: 'kingside', color: 'white', rookFrom: 'h1', rookTo: 'f1' },
      'e1c1': { side: 'queenside', color: 'white', rookFrom: 'a1', rookTo: 'd1' },
      // Black castling
      'e8g8': { side: 'kingside', color: 'black', rookFrom: 'h8', rookTo: 'f8' },
      'e8c8': { side: 'queenside', color: 'black', rookFrom: 'a8', rookTo: 'd8' }
    }

    const moveKey = move.from + move.to
    return castlingMoves[moveKey] || null
  }

  /**
   * Check if move is an en passant capture
   * @param {Object} move - Move object
   * @param {Object} gameState - Current game state
   * @returns {boolean} True if en passant
   */
  isEnPassant(move, gameState) {
    if (!move.from || !move.to || !gameState.lastMove) return false

    const fromFile = move.from[0]
    const fromRank = parseInt(move.from[1])
    const toFile = move.to[0]
    const toRank = parseInt(move.to[1])

    // Must be pawn move
    if (gameState.board[move.from]?.type !== 'p') return false

    // Must be diagonal move
    if (Math.abs(fromFile.charCodeAt(0) - toFile.charCodeAt(0)) !== 1) return false
    if (Math.abs(fromRank - toRank) !== 1) return false

    // Target square must be empty
    if (gameState.board[move.to]) return false

    // Last move must be a pawn double push to adjacent file
    const lastMove = gameState.lastMove
    if (lastMove.piece !== 'p') return false
    if (Math.abs(parseInt(lastMove.from[1]) - parseInt(lastMove.to[1])) !== 2) return false
    if (lastMove.to[0] !== toFile) return false

    return true
  }

  /**
   * Get move category for analysis
   * @param {Object} move - Move object
   * @param {Object} gameState - Current game state
   * @returns {string} Move category
   */
  getMoveCategory(move, gameState) {
    if (!move.from || !move.to) return 'unknown'

    const piece = gameState.board[move.from]
    if (!piece) return 'invalid'

    // Castling
    if (this.getCastlingInfo(move)) {
      return 'castling'
    }

    // En passant
    if (this.isEnPassant(move, gameState)) {
      return 'en_passant'
    }

    // Promotion
    if (move.promotion) {
      return 'promotion'
    }

    // Capture
    if (gameState.board[move.to] || this.isEnPassant(move, gameState)) {
      return 'capture'
    }

    // Pawn double push
    if (piece.type === 'p' && Math.abs(parseInt(move.from[1]) - parseInt(move.to[1])) === 2) {
      return 'pawn_double_push'
    }

    return 'normal'
  }

  /**
   * Calculate move priorities for move ordering
   * @param {Array} moves - Array of legal moves
   * @param {Object} gameState - Current game state
   * @returns {Array} Moves sorted by priority
   */
  orderMoves(moves, gameState) {
    const scoredMoves = moves.map(move => ({
      move,
      score: this.scoreMove(move, gameState)
    }))

    return scoredMoves
      .sort((a, b) => b.score - a.score)
      .map(scored => scored.move)
  }

  /**
   * Score a move for ordering (higher = better priority)
   * @param {Object} move - Move to score
   * @param {Object} gameState - Current game state
   * @returns {number} Move score
   */
  scoreMove(move, gameState) {
    let score = 0

    const category = this.getMoveCategory(move, gameState)
    const piece = gameState.board[move.from]
    const target = gameState.board[move.to]

    // Base scores by category
    const categoryScores = {
      'castling': 100,
      'promotion': 800,
      'capture': 500,
      'en_passant': 600,
      'pawn_double_push': 50,
      'normal': 10
    }

    score += categoryScores[category] || 0

    // Capture values (MVV-LVA: Most Valuable Victim - Least Valuable Attacker)
    if (target) {
      const pieceValues = { 'p': 100, 'n': 300, 'b': 300, 'r': 500, 'q': 900, 'k': 10000 }
      score += pieceValues[target.type] || 0
      score -= (pieceValues[piece.type] || 0) / 10 // Prefer less valuable attackers
    }

    // Promotion piece value
    if (move.promotion) {
      const promotionValues = { 'q': 900, 'r': 500, 'b': 300, 'n': 300 }
      score += promotionValues[move.promotion] || 0
    }

    // Central squares bonus
    const centralSquares = ['d4', 'd5', 'e4', 'e5']
    if (centralSquares.includes(move.to)) {
      score += 20
    }

    return score
  }

  /**
   * Generate move notation for display
   * @param {Object} move - Move object with chess.js format
   * @returns {Object} Move notation in various formats
   */
  generateNotation(move) {
    return {
      san: move.san,                    // Standard Algebraic Notation
      lan: move.from + move.to + (move.promotion || ''), // Long Algebraic Notation
      uci: move.from + move.to + (move.promotion || ''), // UCI format
      coordinate: `${move.from}-${move.to}`,           // Coordinate notation
      verbose: this.getVerboseNotation(move)           // Human readable
    }
  }

  /**
   * Generate human-readable move description
   * @param {Object} move - Move object
   * @returns {string} Verbose description
   */
  getVerboseNotation(move) {
    const pieces = {
      'p': 'Pawn', 'n': 'Knight', 'b': 'Bishop', 
      'r': 'Rook', 'q': 'Queen', 'k': 'King'
    }

    let description = pieces[move.piece] || 'Piece'
    
    if (move.captured) {
      description += ` captures ${pieces[move.captured]}`
    } else {
      description += ' moves'
    }
    
    description += ` to ${move.to}`

    if (move.promotion) {
      description += `, promotes to ${pieces[move.promotion]}`
    }

    if (move.check && !move.checkmate) {
      description += ' (check)'
    } else if (move.checkmate) {
      description += ' (checkmate)'
    }

    return description
  }

  /**
   * Validate time control compliance
   * @param {Object} move - Move object
   * @param {Object} timeControl - Time control settings
   * @param {Object} playerTime - Player's remaining time
   * @returns {Object} Validation result
   */
  validateTimeControl(move, timeControl, playerTime) {
    if (!timeControl) {
      return { valid: true }
    }

    const thinkTime = move.timestamp - (move.startThinkTime || move.timestamp)
    
    if (playerTime.remaining < thinkTime) {
      return { 
        valid: false, 
        reason: 'Time exceeded',
        timeUsed: thinkTime,
        timeRemaining: playerTime.remaining
      }
    }

    return { 
      valid: true,
      timeUsed: thinkTime,
      timeRemaining: playerTime.remaining - thinkTime
    }
  }
}

// Export singleton instance
export const moveHandler = new MoveHandler()