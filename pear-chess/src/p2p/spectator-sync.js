/**
 * Pear's Gambit - Enhanced Spectator Synchronization
 * 
 * Provides complete spectator functionality with historical sync and real-time updates
 */

import { createGameHistoryManager } from './game-history.js'
import { createSwarmManager } from './swarm.js'

/**
 * Enhanced Spectator Sync Manager
 * Handles complete spectator experience including historical sync and live updates
 */
export class SpectatorSyncManager {
  constructor(options = {}) {
    this.options = {
      debug: options.debug || false,
      storage: options.storage || './chess-games-spectator',
      maxReconnectAttempts: 5,
      reconnectDelay: 2000,
      ...options
    }

    // Components
    this.historyManager = null
    this.swarmManager = null
    this.chessGame = null

    // State
    this.gameId = null
    this.gameKey = null
    this.inviteCode = null
    this.connectionState = 'disconnected' // disconnected, connecting, syncing, active, error
    this.reconnectAttempts = 0
    this.activePeers = new Set()

    // Event handlers
    this.onGameStateUpdate = options.onGameStateUpdate || (() => {})
    this.onMoveReceived = options.onMoveReceived || (() => {})
    this.onConnectionChange = options.onConnectionChange || (() => {})
    this.onError = options.onError || (() => {})
    this.onHistoryLoaded = options.onHistoryLoaded || (() => {})
  }

  /**
   * Join game as spectator with complete historical sync
   */
  async joinGame(inviteCode, chessGame, gameKey) {
    try {
      this.log(`Joining game as spectator: ${inviteCode}`)
      
      this.inviteCode = inviteCode
      this.chessGame = chessGame
      this.gameKey = gameKey
      this.gameId = gameKey.toString('hex')
      this.connectionState = 'connecting'
      this.notifyConnectionChange()

      // Create history manager for this game
      this.historyManager = createGameHistoryManager({
        debug: this.options.debug,
        storage: this.options.storage,
        onPositionChange: this.handlePositionChange.bind(this),
        onHistoryUpdate: this.handleHistoryUpdate.bind(this),
        onError: this.handleHistoryError.bind(this)
      })

      // Create swarm manager for P2P connection
      this.swarmManager = createSwarmManager({
        debug: this.options.debug,
        maxConnections: 10, // Spectators can connect to multiple peers
        onConnection: this.handlePeerConnection.bind(this),
        onDisconnection: this.handlePeerDisconnection.bind(this),
        onPeerData: this.handlePeerMessage.bind(this),
        onError: this.handleSwarmError.bind(this)
      })

      // Join the P2P topic
      await this.swarmManager.joinTopic(gameKey, { 
        client: true, 
        server: false // Spectators are clients only
      })

      this.connectionState = 'syncing'
      this.notifyConnectionChange()

      // Connect to game history with spectator-specific storage to avoid lock conflicts
      const spectatorStorage = `${this.options.storage}-${this.gameId}-spectator`
      const historyResult = await this.historyManager.connectToGame(gameKey, this.gameId, spectatorStorage)
      if (!historyResult.success) {
        throw new Error(`Failed to load game history: ${historyResult.error}`)
      }

      // Wait for peer connections with timeout
      try {
        await this.swarmManager.waitForConnections(1, 15000) // 15 second timeout
        this.log('Connected to game peers successfully')
      } catch (timeoutError) {
        this.log('Timeout waiting for peer connections, continuing anyway')
        // Don't fail - we might still get historical data from the core
      }

      // Sync complete game state to chess game
      await this.syncCompleteGameState()

      this.connectionState = 'active'
      this.notifyConnectionChange()

      return { success: true, gameId: this.gameId }
    } catch (error) {
      this.log('Failed to join game as spectator:', error)
      this.connectionState = 'error'
      this.notifyConnectionChange()
      this.onError(error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Sync complete game state to chess game instance
   */
  async syncCompleteGameState() {
    try {
      this.log('Syncing complete game state for spectator...')

      const currentState = this.historyManager.getCurrentState()
      this.log(`Current game state: ${currentState.totalMoves} moves, position ${currentState.position}`)

      // Reset chess game to initial position
      this.chessGame.reset()

      // Apply all moves up to current position
      if (currentState.moveHistory && currentState.moveHistory.length > 0) {
        this.log(`Applying ${currentState.position} moves to chess game`)

        for (let i = 0; i < currentState.position; i++) {
          const move = currentState.moveHistory[i]
          
          // Convert network move to chess.js format
          const chessMove = {
            from: move.from,
            to: move.to
          }

          if (move.promotion) {
            chessMove.promotion = move.promotion
          }

          // Apply move to local chess game
          const result = this.chessGame.makeMove(chessMove)
          if (!result.success) {
            this.log(`Failed to apply move ${i + 1}:`, move, 'Error:', result.error)
            // Continue with next move rather than failing completely
          } else {
            this.log(`Applied move ${i + 1}/${currentState.position}:`, move.san || `${move.from}-${move.to}`)
          }
        }

        // Verify final position matches expected FEN
        if (currentState.gameState.currentFen) {
          const actualFen = this.chessGame.getFen()
          if (actualFen !== currentState.gameState.currentFen) {
            this.log('FEN mismatch after sync - expected:', currentState.gameState.currentFen, 'actual:', actualFen)
            // Try to load from FEN directly as fallback
            try {
              this.chessGame.loadFromFen(currentState.gameState.currentFen)
              this.log('Successfully loaded position from FEN')
            } catch (fenError) {
              this.log('Failed to load from FEN:', fenError)
            }
          }
        }
      }

      // Notify that history has been loaded
      this.onHistoryLoaded(currentState)
      this.onGameStateUpdate(currentState.gameState)

      this.log('Game state sync completed successfully')
    } catch (error) {
      this.log('Failed to sync game state:', error)
      throw error
    }
  }

  /**
   * Handle peer connection
   */
  async handlePeerConnection(socket, info, peerId) {
    this.log(`Spectator connected to peer: ${peerId}`)
    this.activePeers.add(peerId)

    // Send spectator handshake
    const handshake = {
      type: 'spectator_handshake',
      gameId: this.gameId,
      inviteCode: this.inviteCode,
      timestamp: Date.now(),
      spectator: true
    }

    this.swarmManager.sendToPeer(peerId, handshake)

    // Reset reconnect attempts on successful connection
    this.reconnectAttempts = 0

    this.notifyConnectionChange()
  }

  /**
   * Handle peer disconnection
   */
  handlePeerDisconnection(peerId, connection, error) {
    this.log(`Spectator disconnected from peer: ${peerId}`, error ? `Error: ${error.message}` : '')
    this.activePeers.delete(peerId)

    // If we lose all connections, attempt to reconnect
    if (this.activePeers.size === 0 && this.connectionState === 'active') {
      this.attemptReconnection()
    }

    this.notifyConnectionChange()
  }

  /**
   * Handle messages from peers
   */
  async handlePeerMessage(message, peerId, socket) {
    try {
      switch (message.type) {
        case 'move':
          await this.handleLiveMoveMessage(message, peerId)
          break

        case 'game_state_response':
          await this.handleGameStateResponse(message, peerId)
          break

        case 'spectator_welcome':
          this.handleSpectatorWelcome(message, peerId)
          break

        default:
          this.log(`Unknown message type from peer ${peerId}:`, message.type)
      }
    } catch (error) {
      this.log('Error handling peer message:', error)
      this.onError(error)
    }
  }

  /**
   * Handle live move updates
   */
  async handleLiveMoveMessage(message, peerId) {
    if (message.gameId !== this.gameId) {
      this.log('Move for different game, ignoring')
      return
    }

    this.log('Live move received from peer:', message.move)

    // Add to history manager (it will handle deduplication)
    this.historyManager.handleHistoricalMove(message.move)

    // Apply move to current chess game if we're at the latest position
    const currentState = this.historyManager.getCurrentState()
    if (currentState.position === currentState.totalMoves) {
      const chessMove = {
        from: message.move.from,
        to: message.move.to
      }

      if (message.move.promotion) {
        chessMove.promotion = message.move.promotion
      }

      const result = this.chessGame.makeMove(chessMove)
      if (result.success) {
        this.log('Live move applied to chess game:', result.move.san)
        this.onMoveReceived(message.move, message.clockState)
      } else {
        this.log('Failed to apply live move:', result.error)
      }
    }
  }

  /**
   * Handle game state response from active players
   */
  async handleGameStateResponse(message, peerId) {
    this.log('Game state response received from peer:', peerId)
    
    if (message.moves && message.moves.length > 0) {
      // Import additional moves we might have missed
      for (const move of message.moves) {
        this.historyManager.handleHistoricalMove(move)
      }

      // Re-sync game state
      await this.syncCompleteGameState()
    }
  }

  /**
   * Handle spectator welcome message
   */
  handleSpectatorWelcome(message, peerId) {
    this.log('Received spectator welcome from peer:', peerId)
    // This is a good place to request any missing game state
    this.requestGameState(peerId)
  }

  /**
   * Request current game state from active players
   */
  requestGameState(peerId) {
    const request = {
      type: 'game_state_request',
      gameId: this.gameId,
      spectator: true,
      timestamp: Date.now()
    }

    this.swarmManager.sendToPeer(peerId, request)
  }

  /**
   * Handle position changes from history manager
   */
  handlePositionChange(position, gameState) {
    this.log(`Position changed to ${position}:`, gameState)
    this.onGameStateUpdate(gameState)
  }

  /**
   * Handle history updates from history manager
   */
  handleHistoryUpdate(moveHistory, currentPosition) {
    this.log(`History updated: ${moveHistory.length} total moves, position ${currentPosition}`)
    // Could notify UI about new moves available
  }

  /**
   * Handle history manager errors
   */
  handleHistoryError(error) {
    this.log('History manager error:', error)
    this.onError(error)
  }

  /**
   * Handle swarm errors
   */
  handleSwarmError(error) {
    this.log('Swarm error:', error)
    
    if (this.connectionState === 'active') {
      this.attemptReconnection()
    }
    
    this.onError(error)
  }

  /**
   * Attempt to reconnect to peers
   */
  async attemptReconnection() {
    if (this.reconnectAttempts >= this.options.maxReconnectAttempts) {
      this.log('Max reconnection attempts reached')
      this.connectionState = 'error'
      this.notifyConnectionChange()
      return
    }

    this.reconnectAttempts++
    this.connectionState = 'connecting'
    this.notifyConnectionChange()

    this.log(`Reconnection attempt ${this.reconnectAttempts}/${this.options.maxReconnectAttempts}`)

    const delay = this.options.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1) // Exponential backoff
    
    setTimeout(async () => {
      try {
        // Try to rejoin the topic
        await this.swarmManager.joinTopic(this.gameKey, { 
          client: true, 
          server: false 
        })
        
        this.log('Reconnection successful')
        this.connectionState = 'active'
        this.notifyConnectionChange()
      } catch (error) {
        this.log('Reconnection failed:', error)
        // Will try again on next disconnection or timeout
      }
    }, delay)
  }

  /**
   * Navigate through move history (for analysis mode)
   */
  async goToMove(position) {
    if (!this.historyManager) {
      throw new Error('History manager not initialized')
    }

    const result = await this.historyManager.goToPosition(position)
    if (result) {
      // Update chess game to this position
      await this.syncCompleteGameState()
    }
    return result
  }

  /**
   * Step forward through history
   */
  async stepForward() {
    if (!this.historyManager) return null
    return await this.historyManager.stepForward()
  }

  /**
   * Step backward through history
   */
  async stepBackward() {
    if (!this.historyManager) return null
    return await this.historyManager.stepBackward()
  }

  /**
   * Get current spectator state
   */
  getState() {
    return {
      connectionState: this.connectionState,
      gameId: this.gameId,
      activePeers: Array.from(this.activePeers),
      reconnectAttempts: this.reconnectAttempts,
      historyState: this.historyManager ? this.historyManager.getCurrentState() : null
    }
  }

  /**
   * Notify connection state change
   */
  notifyConnectionChange() {
    this.onConnectionChange(this.connectionState, this.getState())
  }

  /**
   * Log debug messages
   */
  log(...args) {
    if (this.options.debug) {
      console.log('[SpectatorSync]', ...args)
    }
  }

  /**
   * Cleanup and destroy
   */
  async destroy() {
    this.log('Destroying spectator sync manager...')

    this.connectionState = 'disconnected'

    if (this.historyManager) {
      await this.historyManager.destroy()
    }

    if (this.swarmManager) {
      await this.swarmManager.destroy()
    }

    this.activePeers.clear()
    this.reconnectAttempts = 0

    this.log('Spectator sync manager destroyed')
  }
}

// Export factory function
export function createSpectatorSyncManager(options = {}) {
  return new SpectatorSyncManager(options)
}