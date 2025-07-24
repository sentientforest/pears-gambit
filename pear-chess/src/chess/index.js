/**
 * Pear's Gambit - Chess Module
 * 
 * Main chess engine exports
 */

export { ChessGame, moveEncoding } from './game.js'
export { chessBoard, ChessBoard } from './board.js'
export { moveHandler, MoveHandler } from './moves.js'
export { pgnHandler, PgnHandler } from './pgn.js'

// Import for internal use
import { ChessGame } from './game.js'

/**
 * Create a new chess game with default settings
 * @param {Object} options - Game options
 * @returns {ChessGame} New chess game instance
 */
export function createGame(options = {}) {
  return new ChessGame(options)
}

/**
 * Chess engine utilities
 */
export const ChessEngine = {
  /**
   * Quick game setup for testing
   */
  createTestGame() {
    return createGame({
      players: {
        white: 'Test Player 1',
        black: 'Test Player 2'
      }
    })
  },

  /**
   * Create game from FEN position
   */
  fromFen(fen, options = {}) {
    return createGame({ ...options, fen })
  },

  /**
   * Create game from PGN
   */
  fromPgn(pgn, options = {}) {
    const game = createGame(options)
    if (game.loadPgn(pgn)) {
      return game
    }
    throw new Error('Invalid PGN')
  },

  /**
   * Validate FEN string
   */
  isValidFen(fen) {
    try {
      new ChessGame({ fen })
      return true
    } catch {
      return false
    }
  }
}