/**
 * Pear's Gambit - Game History Manager
 * 
 * Manages game history access, spectator synchronization, and move analysis
 */

import { createGameCore } from './core.js'

/**
 * Game History Manager
 * Provides comprehensive access to game move history for spectators and analysis
 */
export class GameHistoryManager {
  constructor(options = {}) {
    this.options = {
      debug: options.debug || false,
      storage: options.storage || './chess-games',
      ...options
    }

    // State
    this.gameCore = null
    this.currentPosition = 0
    this.moveHistory = []
    this.gameState = {
      initialFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      currentFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      gameInfo: null
    }

    // Event handlers
    this.onPositionChange = options.onPositionChange || (() => {})
    this.onHistoryUpdate = options.onHistoryUpdate || (() => {})
    this.onError = options.onError || (() => {})
  }

  /**
   * Connect to game for historical analysis
   */
  async connectToGame(gameKey, gameId) {
    try {
      this.log('Connecting to game for historical analysis:', gameId)

      // Create read-only game core
      this.gameCore = createGameCore({
        gameId: gameId,
        storage: this.options.storage,
        debug: this.options.debug,
        writable: false, // Read-only for history analysis
        onMove: this.handleHistoricalMove.bind(this),
        onError: this.handleCoreError.bind(this)
      })

      await this.gameCore.ready()
      this.log('Connected to game core successfully')

      // Load complete move history
      await this.loadCompleteHistory()

      return { success: true }
    } catch (error) {
      this.log('Failed to connect to game:', error)
      this.onError(error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Load complete move history from Autobase
   */
  async loadCompleteHistory() {
    try {
      this.log('Loading complete game history...')

      // Get all moves from the linearized view
      const moves = await this.gameCore.getMoves()
      this.moveHistory = moves.sort((a, b) => a.timestamp - b.timestamp)

      this.log(`Loaded ${this.moveHistory.length} moves from history`)

      // Set initial position
      this.currentPosition = this.moveHistory.length
      
      // Calculate current game state
      await this.updateGameState()

      this.onHistoryUpdate(this.moveHistory, this.currentPosition)
      return this.moveHistory
    } catch (error) {
      this.log('Failed to load game history:', error)
      this.onError(error)
      throw error
    }
  }

  /**
   * Handle new historical move (for live spectating)
   */
  handleHistoricalMove(move) {
    this.log('New historical move received:', move)

    // Add to history if not already present
    const existingIndex = this.moveHistory.findIndex(m => 
      m.timestamp === move.timestamp && 
      m.from === move.from && 
      m.to === move.to
    )

    if (existingIndex === -1) {
      this.moveHistory.push(move)
      this.moveHistory.sort((a, b) => a.timestamp - b.timestamp)
      
      // If we're at the end of history, advance position
      if (this.currentPosition === this.moveHistory.length - 1) {
        this.currentPosition = this.moveHistory.length
        this.updateGameState()
      }

      this.onHistoryUpdate(this.moveHistory, this.currentPosition)
    }
  }

  /**
   * Navigate to specific position in game history
   */
  async goToPosition(position) {
    if (position < 0 || position > this.moveHistory.length) {
      throw new Error(`Invalid position: ${position}. Valid range: 0-${this.moveHistory.length}`)
    }

    this.currentPosition = position
    await this.updateGameState()
    this.onPositionChange(this.currentPosition, this.gameState)

    return {
      position: this.currentPosition,
      move: position > 0 ? this.moveHistory[position - 1] : null,
      gameState: this.gameState
    }
  }

  /**
   * Move forward one position
   */
  async stepForward() {
    if (this.currentPosition < this.moveHistory.length) {
      return await this.goToPosition(this.currentPosition + 1)
    }
    return null
  }

  /**
   * Move backward one position
   */
  async stepBackward() {
    if (this.currentPosition > 0) {
      return await this.goToPosition(this.currentPosition - 1)
    }
    return null
  }

  /**
   * Go to start of game
   */
  async goToStart() {
    return await this.goToPosition(0)
  }

  /**
   * Go to end of game (current position)
   */
  async goToEnd() {
    return await this.goToPosition(this.moveHistory.length)
  }

  /**
   * Update game state based on current position
   */
  async updateGameState() {
    try {
      // Start with initial position
      let currentFen = this.gameState.initialFen
      let gameInfo = {
        currentTurn: 'white',
        moveCount: 0,
        isGameOver: false,
        result: null
      }

      // Apply moves up to current position
      if (this.currentPosition > 0) {
        const movesToApply = this.moveHistory.slice(0, this.currentPosition)
        
        // Use the latest move's FEN if available (most accurate)
        if (movesToApply.length > 0) {
          const lastMove = movesToApply[movesToApply.length - 1]
          if (lastMove.fen) {
            currentFen = lastMove.fen
          }
          
          // Update game info
          gameInfo.currentTurn = lastMove.player === 'white' ? 'black' : 'white'
          gameInfo.moveCount = this.currentPosition
          gameInfo.isGameOver = lastMove.checkmate || false
          gameInfo.result = lastMove.checkmate ? (lastMove.player === 'white' ? '1-0' : '0-1') : null
        }
      }

      this.gameState = {
        ...this.gameState,
        currentFen,
        gameInfo
      }

      this.log(`Updated game state at position ${this.currentPosition}:`, this.gameState)
    } catch (error) {
      this.log('Failed to update game state:', error)
      this.onError(error)
    }
  }

  /**
   * Get current game state for spectator synchronization
   */
  getCurrentState() {
    return {
      position: this.currentPosition,
      totalMoves: this.moveHistory.length,
      gameState: this.gameState,
      moveHistory: this.moveHistory,
      lastMove: this.currentPosition > 0 ? this.moveHistory[this.currentPosition - 1] : null
    }
  }

  /**
   * Get move at specific position
   */
  getMoveAt(position) {
    if (position < 1 || position > this.moveHistory.length) {
      return null
    }
    return this.moveHistory[position - 1]
  }

  /**
   * Get moves in range
   */
  getMovesInRange(start, end) {
    const startIndex = Math.max(0, start - 1)
    const endIndex = Math.min(this.moveHistory.length, end)
    return this.moveHistory.slice(startIndex, endIndex)
  }

  /**
   * Export game history for analysis
   */
  exportHistory() {
    return {
      gameId: this.gameCore?.gameId,
      initialFen: this.gameState.initialFen,
      moves: this.moveHistory,
      totalMoves: this.moveHistory.length,
      currentPosition: this.currentPosition,
      gameInfo: this.gameState.gameInfo,
      exportedAt: Date.now()
    }
  }

  /**
   * Import game history for analysis
   */
  async importHistory(historyData) {
    try {
      this.gameState.initialFen = historyData.initialFen || this.gameState.initialFen
      this.moveHistory = historyData.moves || []
      this.currentPosition = historyData.currentPosition || this.moveHistory.length

      await this.updateGameState()
      this.onHistoryUpdate(this.moveHistory, this.currentPosition)

      return { success: true }
    } catch (error) {
      this.log('Failed to import history:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Handle core errors
   */
  handleCoreError(error) {
    this.log('Game core error:', error)
    this.onError(error)
  }

  /**
   * Get statistics about the game
   */
  getStatistics() {
    const whiteMoves = this.moveHistory.filter(m => m.player === 'white').length
    const blackMoves = this.moveHistory.filter(m => m.player === 'black').length
    const captures = this.moveHistory.filter(m => m.captured).length
    const checks = this.moveHistory.filter(m => m.check).length

    return {
      totalMoves: this.moveHistory.length,
      whiteMoves,
      blackMoves,
      captures,
      checks,
      currentPosition: this.currentPosition,
      gameStatus: this.gameState.gameInfo?.isGameOver ? 'finished' : 'ongoing'
    }
  }

  /**
   * Log debug messages
   */
  log(...args) {
    if (this.options.debug) {
      console.log('[GameHistory]', ...args)
    }
  }

  /**
   * Cleanup resources
   */
  async destroy() {
    this.log('Destroying game history manager...')
    
    if (this.gameCore) {
      await this.gameCore.close()
    }

    this.moveHistory = []
    this.currentPosition = 0
    this.gameState = {
      initialFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      currentFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      gameInfo: null
    }

    this.log('Game history manager destroyed')
  }
}

// Export factory function
export function createGameHistoryManager(options = {}) {
  return new GameHistoryManager(options)
}