/**
 * Pear's Gambit - Network-Only Spectator
 * 
 * Pure P2P network spectator without local database to avoid lock conflicts
 */

import { createSwarmManager } from './swarm.js'

/**
 * Network-Only Spectator Manager
 * Connects directly to P2P network without creating local Autobase
 */
export class NetworkSpectatorManager {
  constructor(options = {}) {
    this.options = {
      debug: options.debug || false,
      maxReconnectAttempts: 5,
      reconnectDelay: 2000,
      syncTimeout: 30000, // 30 seconds to get initial game state
      ...options
    }

    // Components
    this.swarmManager = null
    this.chessGame = null

    // State
    this.gameId = null
    this.gameKey = null
    this.inviteCode = null
    this.connectionState = 'disconnected'
    this.reconnectAttempts = 0
    this.activePeers = new Set()
    this.moveHistory = []
    this.gameState = null
    this.hasInitialSync = false

    // Event handlers
    this.onGameStateUpdate = options.onGameStateUpdate || (() => {})
    this.onMoveReceived = options.onMoveReceived || (() => {})
    this.onConnectionChange = options.onConnectionChange || (() => {})
    this.onError = options.onError || (() => {})
    this.onHistoryLoaded = options.onHistoryLoaded || (() => {})
  }

  /**
   * Join game as network-only spectator
   */
  async joinGame(inviteCode, chessGame, gameKey) {
    try {
      this.log(`Joining game as network spectator: ${inviteCode}`)
      
      this.inviteCode = inviteCode
      this.chessGame = chessGame
      this.gameKey = gameKey
      this.gameId = gameKey.toString('hex')
      this.connectionState = 'connecting'
      this.notifyConnectionChange()

      // Create swarm manager for P2P connection only
      this.swarmManager = createSwarmManager({
        debug: this.options.debug,
        maxConnections: 10,
        onConnection: this.handlePeerConnection.bind(this),
        onDisconnection: this.handlePeerDisconnection.bind(this),
        onPeerData: this.handlePeerMessage.bind(this),
        onError: this.handleSwarmError.bind(this)
      })

      // Join the P2P topic
      await this.swarmManager.joinTopic(gameKey, { 
        client: true, 
        server: false
      })

      this.connectionState = 'syncing'
      this.notifyConnectionChange()

      // Wait for peer connections with more detailed error handling
      try {
        this.log('Waiting for peer connections...')
        await this.swarmManager.waitForConnections(1, 15000)
        this.log('Connected to game peers successfully')
        
        // Give a moment for connection to stabilize
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // Request initial game state from connected peers
        this.log('Requesting initial game state...')
        await this.requestInitialGameState()
        
        // Wait for initial sync to complete with more lenient timeout
        this.log('Waiting for initial sync...')
        await this.waitForInitialSync()
        this.log('Initial sync completed')
        
      } catch (timeoutError) {
        this.log('Detailed error in connection/sync process:', timeoutError)
        
        // Check if we have any connections at all
        if (this.activePeers.size === 0) {
          throw new Error('No peer connections established - ensure the game is active and accessible')
        } else {
          this.log(`Connected to ${this.activePeers.size} peers but sync failed`)
          throw new Error('Connected to peers but failed to sync initial game state')
        }
      }

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
   * Handle peer connection
   */
  async handlePeerConnection(socket, info, peerId) {
    this.log(`Network spectator connected to peer: ${peerId}`)
    this.activePeers.add(peerId)

    // Send spectator handshake with a slight delay to ensure connection is stable
    setTimeout(() => {
      const handshake = {
        type: 'spectator_handshake',
        gameId: this.gameId,
        inviteCode: this.inviteCode,
        timestamp: Date.now(),
        spectator: true,
        requestFullSync: true // Request complete game state
      }

      this.log('Sending spectator handshake to peer:', peerId)
      this.swarmManager.sendToPeer(peerId, handshake)
    }, 500)

    this.resetReconnectAttempts()
    this.notifyConnectionChange()
  }

  /**
   * Handle peer disconnection
   */
  handlePeerDisconnection(peerId, connection, error) {
    this.log(`Network spectator disconnected from peer: ${peerId}`, error ? `Error: ${error.message}` : '')
    this.activePeers.delete(peerId)

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
      this.log(`Network spectator received message type: ${message.type}`)

      switch (message.type) {
        case 'move':
          await this.handleLiveMoveMessage(message, peerId)
          break

        case 'full_game_sync':
          await this.handleFullGameSync(message, peerId)
          break

        case 'spectator_welcome':
          this.handleSpectatorWelcome(message, peerId)
          break

        case 'game_state_response':
          await this.handleGameStateResponse(message, peerId)
          break

        default:
          this.log(`Unknown message type: ${message.type}`)
      }
    } catch (error) {
      this.log('Error handling peer message:', error)
      this.onError(error)
    }
  }

  /**
   * Request initial game state from peers
   */
  async requestInitialGameState() {
    // Wait a moment for handshakes to be processed
    await new Promise(resolve => setTimeout(resolve, 1000))

    const request = {
      type: 'spectator_full_sync_request',
      gameId: this.gameId,
      spectator: true,
      timestamp: Date.now()
    }

    // Send to all connected peers
    let sentCount = 0
    for (const peerId of this.activePeers) {
      this.log(`Sending sync request to peer: ${peerId}`)
      this.swarmManager.sendToPeer(peerId, request)
      sentCount++
    }

    this.log(`Requested initial sync from ${sentCount} peers`)

    // Also try a direct game state request as fallback
    setTimeout(() => {
      const gameStateRequest = {
        type: 'game_state_request',
        gameId: this.gameId,
        spectator: true,
        timestamp: Date.now()
      }

      for (const peerId of this.activePeers) {
        this.log(`Sending fallback game state request to peer: ${peerId}`)
        this.swarmManager.sendToPeer(peerId, gameStateRequest)
      }
    }, 2000)
  }

  /**
   * Wait for initial sync to complete
   */
  async waitForInitialSync() {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.log('Initial sync timeout - may continue without full history')
        // Don't reject - allow spectator to continue even without initial sync
        // They can still receive live moves
        this.hasInitialSync = true
        resolve()
      }, this.options.syncTimeout)

      const checkSync = () => {
        if (this.hasInitialSync) {
          clearTimeout(timeout)
          resolve()
        } else {
          setTimeout(checkSync, 500)
        }
      }

      checkSync()
    })
  }

  /**
   * Handle full game synchronization
   */
  async handleFullGameSync(message, peerId) {
    try {
      this.log('Received full game sync from peer:', peerId, 'with', message.moveHistory?.length || 0, 'moves')

      if (message.gameId !== this.gameId) {
        this.log('Sync for different game, ignoring')
        return
      }

      // Process move history
      if (message.moveHistory && Array.isArray(message.moveHistory)) {
        this.moveHistory = message.moveHistory.sort((a, b) => a.timestamp - b.timestamp)
        this.log(`Processing ${this.moveHistory.length} moves from sync`)

        try {
          // Use the built-in loadFromHistory method which handles reset + move application
          this.chessGame.loadFromHistory(this.moveHistory)
          this.log(`Successfully loaded ${this.moveHistory.length} moves using loadFromHistory`)
        } catch (historyError) {
          this.log('Failed to load from history, trying manual application:', historyError)
          
          // Fallback: reset and apply moves manually
          this.chessGame.loadFromHistory([]) // Reset to starting position
          
          let appliedMoves = 0
          for (const move of this.moveHistory) {
            try {
              const chessMove = {
                from: move.from,
                to: move.to
              }

              if (move.promotion) {
                chessMove.promotion = move.promotion
              }

              const result = this.chessGame.makeMove(chessMove)
              if (result.success) {
                appliedMoves++
              } else {
                this.log(`Failed to apply move ${appliedMoves + 1}:`, move, result.error)
                break // Stop on first failure to avoid corrupting position
              }
            } catch (moveError) {
              this.log('Error applying move:', move, moveError)
              break
            }
          }
          
          this.log(`Manually applied ${appliedMoves}/${this.moveHistory.length} moves`)
        }
      } else {
        this.log('No move history in sync message')
      }

      // Process current game state - try FEN first, then fall back to current position
      if (message.currentFen) {
        try {
          // Validate FEN before loading
          if (typeof message.currentFen === 'string' && message.currentFen.includes(' ')) {
            this.chessGame.loadFromFen(message.currentFen)
            this.log('Loaded current position from FEN:', message.currentFen)
          } else {
            this.log('Invalid FEN format, using move-based position')
          }
        } catch (fenError) {
          this.log('Failed to load FEN, using move-based position:', fenError)
        }
      }

      // Store game state
      this.gameState = {
        currentFen: this.chessGame.getFen(),
        gameInfo: message.gameInfo || {
          currentTurn: this.chessGame.getTurn(),
          moveCount: this.moveHistory.length,
          isGameOver: this.chessGame.isGameOver(),
          result: null
        },
        players: message.players || { white: 'Player 1', black: 'Player 2' },
        totalMoves: this.moveHistory.length
      }

      // Mark initial sync as complete
      this.hasInitialSync = true

      // Notify handlers
      this.onHistoryLoaded({
        totalMoves: this.moveHistory.length,
        position: this.moveHistory.length,
        gameState: this.gameState,
        moveHistory: this.moveHistory
      })

      this.onGameStateUpdate(this.gameState)

      this.log('Full game sync completed successfully - board position set')
    } catch (error) {
      this.log('Failed to process full game sync:', error)
      this.onError(error)
      
      // Mark sync as complete anyway to prevent hanging
      this.hasInitialSync = true
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

    this.log('Live move received:', message.move)

    // Add to move history
    this.moveHistory.push(message.move)
    this.moveHistory.sort((a, b) => a.timestamp - b.timestamp)

    // Apply move to chess game
    const chessMove = {
      from: message.move.from,
      to: message.move.to
    }

    if (message.move.promotion) {
      chessMove.promotion = message.move.promotion
    }

    const result = this.chessGame.makeMove(chessMove)
    if (result.success) {
      this.log('Live move applied:', result.move.san)
      this.onMoveReceived(message.move, message.clockState)
      
      // Update game state
      this.gameState.currentFen = this.chessGame.getFen()
      this.gameState.totalMoves = this.moveHistory.length
      this.onGameStateUpdate(this.gameState)
    } else {
      this.log('Failed to apply live move:', result.error)
    }
  }

  /**
   * Handle game state response
   */
  async handleGameStateResponse(message, peerId) {
    this.log('Game state response received from peer:', peerId)
    
    // This is similar to full sync but might be a partial update
    if (message.moves && message.moves.length > 0) {
      for (const move of message.moves) {
        this.handleLiveMoveMessage({ move, gameId: this.gameId }, peerId)
      }
    }
  }

  /**
   * Handle spectator welcome
   */
  handleSpectatorWelcome(message, peerId) {
    this.log('Received spectator welcome from peer:', peerId)
    // Could trigger additional sync requests if needed
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
   * Attempt to reconnect
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

    const delay = this.options.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)
    
    setTimeout(async () => {
      try {
        await this.swarmManager.joinTopic(this.gameKey, { 
          client: true, 
          server: false 
        })
        
        this.log('Reconnection successful')
        this.connectionState = 'active'
        this.notifyConnectionChange()
      } catch (error) {
        this.log('Reconnection failed:', error)
      }
    }, delay)
  }

  /**
   * Reset reconnect attempts
   */
  resetReconnectAttempts() {
    this.reconnectAttempts = 0
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
      hasInitialSync: this.hasInitialSync,
      totalMoves: this.moveHistory.length,
      gameState: this.gameState
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
      console.log('[NetworkSpectator]', ...args)
    }
  }

  /**
   * Cleanup and destroy
   */
  async destroy() {
    this.log('Destroying network spectator manager...')

    this.connectionState = 'disconnected'

    if (this.swarmManager) {
      await this.swarmManager.destroy()
    }

    this.activePeers.clear()
    this.moveHistory = []
    this.gameState = null
    this.hasInitialSync = false
    this.reconnectAttempts = 0

    this.log('Network spectator manager destroyed')
  }
}

// Export factory function
export function createNetworkSpectatorManager(options = {}) {
  return new NetworkSpectatorManager(options)
}