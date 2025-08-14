/**
 * Pear's Gambit - Chess Game Logic
 * 
 * Core chess game management using chess.js engine
 * Handles game state, move validation, and game flow
 */

import { Chess } from 'chess.js'
import cenc from 'compact-encoding'

// Custom encoding for chess moves (efficient P2P transmission)
export const moveEncoding = {
  preencode(state, move) {
    if (!move) {
      throw new Error('Cannot preencode undefined move')
    }
    cenc.uint64.preencode(state, move.timestamp || Date.now())
    cenc.uint8.preencode(state, move.player === 'white' ? 0 : 1)
    cenc.string.preencode(state, move.from || '')
    cenc.string.preencode(state, move.to || '')
    cenc.string.preencode(state, move.piece || '')
    cenc.string.preencode(state, move.captured || '')
    cenc.string.preencode(state, move.promotion || '')
    cenc.bool.preencode(state, move.check || false)
    cenc.bool.preencode(state, move.checkmate || false)
    cenc.string.preencode(state, move.fen || '')
    cenc.string.preencode(state, move.san || '')
  },
  encode(state, move) {
    if (!move) {
      throw new Error('Cannot encode undefined move')
    }
    cenc.uint64.encode(state, move.timestamp || Date.now())
    cenc.uint8.encode(state, move.player === 'white' ? 0 : 1)
    cenc.string.encode(state, move.from || '')
    cenc.string.encode(state, move.to || '')
    cenc.string.encode(state, move.piece || '')
    cenc.string.encode(state, move.captured || '')
    cenc.string.encode(state, move.promotion || '')
    cenc.bool.encode(state, move.check || false)
    cenc.bool.encode(state, move.checkmate || false)
    cenc.string.encode(state, move.fen || '')
    cenc.string.encode(state, move.san || '')
  },
  decode(state) {
    return {
      timestamp: cenc.uint64.decode(state),
      player: cenc.uint8.decode(state) === 0 ? 'white' : 'black',
      from: cenc.string.decode(state),
      to: cenc.string.decode(state),
      piece: cenc.string.decode(state),
      captured: cenc.string.decode(state) || null,
      promotion: cenc.string.decode(state) || null,
      check: cenc.bool.decode(state),
      checkmate: cenc.bool.decode(state),
      fen: cenc.string.decode(state),
      san: cenc.string.decode(state)
    }
  }
}

/**
 * Chess Game Controller
 * Manages game state, validates moves, and handles game flow
 */
export class ChessGame {
  constructor(options = {}) {
    this.chess = new Chess(options.fen)
    this.gameId = options.gameId || this.generateGameId()
    this.players = {
      white: options.whitePlayer || null,
      black: options.blackPlayer || null
    }
    this.gameState = 'waiting' // waiting, active, paused, finished
    this.moveHistory = []
    this.startTime = null
    this.timeControl = options.timeControl || null
    
    // Event handlers
    this.onMove = options.onMove || (() => {})
    this.onGameEnd = options.onGameEnd || (() => {})
    this.onCheck = options.onCheck || (() => {})
    
    // Debug flag
    this.debug = options.debug || false
  }

  /**
   * Generate unique game ID
   */
  generateGameId() {
    // Simple UUID v4 generator that works in browser environments
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0
      const v = c === 'x' ? r : (r & 0x3 | 0x8)
      return v.toString(16)
    })
  }

  /**
   * Start the game
   */
  start() {
    if (this.gameState !== 'waiting') {
      throw new Error('Game already started')
    }
    
    // Allow starting without players for testing
    if (!this.players.white) {
      this.players.white = 'White Player'
    }
    if (!this.players.black) {
      this.players.black = 'Black Player'
    }

    this.gameState = 'active'
    this.startTime = Date.now()
    return true
  }

  /**
   * Get current game position as FEN
   */
  getFen() {
    return this.chess.fen()
  }

  /**
   * Alias for getFen() for compatibility with chess.js API
   */
  fen() {
    return this.chess.fen()
  }

  /**
   * Load game state from FEN string
   * @param {string} fen - FEN notation string
   */
  loadFromFen(fen) {
    try {
      this.chess.load(fen)
      this.log('Game loaded from FEN:', fen)
      return { success: true }
    } catch (error) {
      this.log('Failed to load FEN:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Get current turn (who plays next)
   */
  getTurn() {
    return this.chess.turn() === 'w' ? 'white' : 'black'
  }

  /**
   * Get all legal moves for current position
   */
  getLegalMoves() {
    return this.chess.moves({ verbose: true })
  }

  /**
   * Get legal moves for a specific square
   */
  getLegalMovesForSquare(square) {
    return this.chess.moves({ square, verbose: true })
  }

  /**
   * Validate and make a move
   */
  makeMove(moveInput) {
    if (this.gameState !== 'active') {
      return { success: false, error: 'Game is not active' }
    }

    try {
      // Attempt the move
      const move = this.chess.move(moveInput)
      
      if (!move) {
        return { success: false, error: 'Invalid move' }
      }

      // Create standardized move object
      const standardMove = {
        timestamp: Date.now(),
        player: move.color === 'w' ? 'white' : 'black',
        from: move.from,
        to: move.to,
        piece: move.piece,
        captured: move.captured || null,
        promotion: move.promotion || null,
        check: this.chess.inCheck(),
        checkmate: this.chess.isCheckmate(),
        fen: this.chess.fen(),
        san: move.san
      }

      // Add to move history
      this.moveHistory.push(standardMove)

      // Trigger events
      this.onMove(standardMove)
      
      if (standardMove.check && !standardMove.checkmate) {
        this.onCheck(standardMove)
      }

      // Check for game end conditions
      if (this.isGameOver()) {
        this.handleGameEnd()
      }

      return { success: true, move: standardMove }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Validate a move without making it
   * @param {Object} moveInput - Move to validate
   * @returns {Object} Validation result
   */
  validateMove(moveInput) {
    if (this.gameState !== 'active') {
      return { valid: false, error: 'Game is not active' }
    }

    try {
      // Get all valid moves for the piece
      const moves = this.chess.moves({ square: moveInput.from, verbose: true })
      
      // Check if the target move is in the valid moves list
      const validMove = moves.find(m => 
        m.from === moveInput.from && 
        m.to === moveInput.to &&
        (!moveInput.promotion || m.promotion === moveInput.promotion)
      )
      
      if (validMove) {
        return { 
          valid: true, 
          move: validMove,
          wouldCheck: false, // TODO: Could simulate to check this
          wouldCheckmate: false
        }
      } else {
        return { valid: false, error: 'Invalid move' }
      }
    } catch (error) {
      return { valid: false, error: error.message }
    }
  }

  /**
   * Undo the last move
   */
  undoMove() {
    const move = this.chess.undo()
    if (move) {
      this.moveHistory.pop()
      return { success: true, move }
    }
    return { success: false, error: 'No move to undo' }
  }

  /**
   * Check if game is over
   */
  isGameOver() {
    return this.chess.isGameOver()
  }

  /**
   * Get game result
   */
  getGameResult() {
    if (!this.isGameOver()) {
      return null
    }

    if (this.chess.isCheckmate()) {
      const winner = this.chess.turn() === 'w' ? 'black' : 'white'
      return { result: 'checkmate', winner, loser: winner === 'white' ? 'black' : 'white' }
    }

    if (this.chess.isStalemate()) {
      return { result: 'stalemate', winner: null }
    }

    if (this.chess.isThreefoldRepetition()) {
      return { result: 'threefold_repetition', winner: null }
    }

    if (this.chess.isInsufficientMaterial()) {
      return { result: 'insufficient_material', winner: null }
    }

    if (this.chess.isDraw()) {
      return { result: 'draw', winner: null }
    }

    return { result: 'unknown', winner: null }
  }

  /**
   * Handle game end
   */
  handleGameEnd() {
    this.gameState = 'finished'
    const result = this.getGameResult()
    this.onGameEnd(result)
  }

  /**
   * Get current board state
   */
  getBoard() {
    return this.chess.board()
  }

  /**
   * Get game information
   */
  getGameInfo() {
    return {
      gameId: this.gameId,
      players: this.players,
      gameState: this.gameState,
      currentTurn: this.getTurn(),
      fen: this.getFen(),
      moveCount: this.moveHistory.length,
      startTime: this.startTime,
      isGameOver: this.isGameOver(),
      result: this.isGameOver() ? this.getGameResult() : null
    }
  }

  /**
   * Load game from move history
   */
  loadFromHistory(moves) {
    // Reset to starting position
    this.chess.reset()
    this.moveHistory = []

    // Apply moves in sequence
    for (const move of moves) {
      const result = this.makeMove({ from: move.from, to: move.to, promotion: move.promotion })
      if (!result.success) {
        throw new Error(`Failed to apply move: ${move.san}`)
      }
    }
  }

  /**
   * Export game to PGN format
   */
  toPgn() {
    return this.chess.pgn()
  }

  /**
   * Load game from PGN
   */
  loadPgn(pgn) {
    if (this.chess.loadPgn(pgn)) {
      // Rebuild move history from PGN
      this.moveHistory = this.chess.history({ verbose: true }).map(move => ({
        timestamp: Date.now(), // We don't have original timestamps
        player: move.color === 'w' ? 'white' : 'black',
        from: move.from,
        to: move.to,
        piece: move.piece,
        captured: move.captured || null,
        promotion: move.promotion || null,
        check: false, // Would need to recalculate
        checkmate: false, // Would need to recalculate
        fen: '', // Would need to recalculate
        san: move.san
      }))
      return true
    }
    return false
  }

  /**
   * Debug logging
   */
  log(...args) {
    if (this.debug) {
      console.log('[ChessGame]', ...args)
    }
  }
}