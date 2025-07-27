/**
 * Pear's Gambit - Game State Synchronization
 * 
 * Manages synchronization between chess game logic and P2P network
 */

import { createGameCore } from './core.js'
import { createSwarmManager } from './swarm.js'
import { createGamePersistence } from './persistence.js'

/**
 * Game Synchronization Manager
 * Coordinates between chess game, P2P network, and Autobase storage
 */
export class GameSync {
  constructor(options = {}) {
    this.options = {
      debug: options.debug || false,
      storage: options.storage || './chess-games',
      maxConnections: options.maxConnections || 2, // Chess is 2-player
      ...options
    }

    // Components
    this.gameCore = null
    this.swarmManager = null
    this.chessGame = null
    this.persistence = null

    // State
    this.gameId = null
    this.localPlayerId = null
    this.remotePlayerId = null
    this.playerColor = null // 'white' or 'black'
    this.gameState = 'waiting' // waiting, connecting, syncing, active, finished
    this.isHost = false
    this.isDestroyed = false

    // Event handlers
    this.onGameStateChange = options.onGameStateChange || (() => {})
    this.onPlayerJoin = options.onPlayerJoin || (() => {})
    this.onPlayerLeave = options.onPlayerLeave || (() => {})
    this.onMoveReceived = options.onMoveReceived || (() => {})
    this.onError = options.onError || (() => {})
    this.onConnectionChange = options.onConnectionChange || (() => {})

    this.init()
  }

  /**
   * Initialize synchronization manager
   */
  async init() {
    try {
      this.log('Initializing game synchronization...')

      // Create persistence manager
      this.persistence = createGamePersistence({
        storage: this.options.storage + '-state',
        debug: this.options.debug
      })

      // Create game core
      this.gameCore = createGameCore({
        storage: this.options.storage,
        debug: this.options.debug,
        onMove: this.handleRemoteMove.bind(this),
        onPlayerJoin: this.handlePlayerJoin.bind(this),
        onError: this.handleCoreError.bind(this)
      })

      // Create swarm manager
      this.swarmManager = createSwarmManager({
        debug: this.options.debug,
        maxConnections: this.options.maxConnections,
        onConnection: this.handlePeerConnection.bind(this),
        onDisconnection: this.handlePeerDisconnection.bind(this),
        onPeerData: this.handlePeerMessage.bind(this),
        onError: this.handleSwarmError.bind(this)
      })

      // Wait for components to be ready
      await this.gameCore.ready()

      this.log('Game synchronization initialized')
    } catch (error) {
      this.log('Failed to initialize game synchronization:', error)
      this.onError(error)
      throw error
    }
  }

  /**
   * Create a new game (host)
   */
  async createGame(chessGame, invitation) {
    try {
      this.log('Creating new game as host')
      
      this.chessGame = chessGame
      this.isHost = true
      this.playerColor = 'white' // Host plays white
      this.gameState = 'waiting'

      // Use the game key from the discovery invitation
      const gameKey = Buffer.from(invitation.gameKey, 'hex')
      this.gameId = gameKey.toString('hex')

      // Join the topic as server
      await this.swarmManager.joinTopic(gameKey, { client: true, server: true })

      this.log(`Game created with invite code: ${invitation.inviteCode}, topic: ${this.gameId}`)
      this.notifyStateChange()

      // Save initial game state and connection info
      await this.saveGameState()
      await this.persistence.saveConnectionInfo(this.gameId, {
        inviteCode: invitation.inviteCode,
        gameKey: gameKey.toString('hex'),
        playerColor: this.playerColor,
        isHost: this.isHost
      })

      return {
        success: true,
        gameId: this.gameId,
        inviteCode: invitation.inviteCode,
        playerColor: this.playerColor
      }
    } catch (error) {
      this.log('Failed to create game:', error)
      this.onError(error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Join an existing game (guest)
   */
  async joinGame(inviteCode, chessGame, joinInfo) {
    try {
      this.log(`Joining game with invite code: ${inviteCode}`)
      
      this.chessGame = chessGame
      this.isHost = false
      this.playerColor = 'black' // Guest plays black
      this.gameState = 'connecting'

      // Use the game key from discovery join info
      const gameKey = joinInfo.gameKey
      this.gameId = gameKey.toString('hex')

      // Join the topic directly with the game key
      await this.swarmManager.joinTopic(gameKey, { client: true, server: false })

      this.log(`Successfully joined game topic: ${this.gameId}, waiting for connection...`)
      this.notifyStateChange()

      // Save connection info
      await this.persistence.saveConnectionInfo(this.gameId, {
        inviteCode: inviteCode,
        gameKey: gameKey.toString('hex'),
        playerColor: this.playerColor,
        isHost: this.isHost
      })

      // Check if we already have connections before waiting
      if (this.swarmManager.hasConnections()) {
        this.log('Already connected to peers')
        this.gameState = 'syncing'
        this.notifyStateChange()
      } else {
        // Wait for peer connection with shorter timeout
        try {
          await this.swarmManager.waitForConnections(1, 10000)
          this.log('Connected to peer successfully')
        } catch (timeoutError) {
          this.log('Timeout waiting for connections, but continuing anyway')
          // Don't fail - the connection might still happen
        }
      }

      return {
        success: true,
        gameId: this.gameId,
        playerColor: this.playerColor
      }
    } catch (error) {
      this.log('Failed to join game:', error)
      this.onError(error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Send a move to the network
   */
  async sendMove(move) {
    if (!this.gameCore || !this.chessGame) {
      throw new Error('Game not initialized')
    }

    if (this.gameState !== 'active') {
      throw new Error('Game not active - cannot send moves')
    }

    // Ensure game core is ready
    await this.gameCore.ready()

    try {
      this.log('Sending move:', JSON.stringify(move))

      // Create a clean network move object with all required fields
      const networkMove = {
        timestamp: move.timestamp || Date.now(),
        player: move.player || this.playerColor,
        from: move.from,
        to: move.to,
        piece: move.piece,
        captured: move.captured || null,
        promotion: move.promotion || null,
        check: move.check || false,
        checkmate: move.checkmate || false,
        fen: move.fen,
        san: move.san,
        gameId: this.gameId
      }

      // Validate required fields
      if (!networkMove.from || !networkMove.to || !networkMove.piece) {
        throw new Error('Move missing required fields: from, to, or piece')
      }

      this.log('Network move to be sent:', JSON.stringify(networkMove))

      // Add move to local game log
      await this.gameCore.addMove(networkMove)

      // Broadcast move to connected peers
      const message = {
        type: 'move',
        move: networkMove,
        gameId: this.gameId,
        timestamp: Date.now()
      }

      const sentCount = this.swarmManager.broadcast(message)
      this.log(`Move broadcasted to ${sentCount} peers`)

      // Save game state after move
      await this.saveGameState()

      return true
    } catch (error) {
      this.log('Failed to send move:', error)
      this.onError(error)
      throw error
    }
  }

  /**
   * Handle remote move from P2P network
   */
  handleRemoteMove(move, node) {
    this.log('Handling remote move:', move)

    // Validate move is for this game
    if (move.gameId !== this.gameId) {
      this.log('Move for different game, ignoring:', move.gameId)
      return
    }

    // Don't process our own moves
    if (move.player === this.playerColor) {
      this.log('Ignoring our own move')
      return
    }

    // Notify application
    this.onMoveReceived(move)
  }

  /**
   * Handle new peer connection
   */
  async handlePeerConnection(socket, info, peerId) {
    this.log(`Peer connected: ${peerId}`)

    // Store remote player ID
    this.remotePlayerId = peerId

    // Send game handshake
    const handshake = {
      type: 'handshake',
      gameId: this.gameId,
      playerId: this.localPlayerId,
      playerColor: this.playerColor,
      isHost: this.isHost,
      timestamp: Date.now()
    }

    this.swarmManager.sendToPeer(peerId, handshake)

    // Update connection state
    if (this.gameState === 'waiting' || this.gameState === 'connecting') {
      this.gameState = 'syncing'
      this.notifyStateChange()
      
      // For guests, transition to active state immediately if no game state to sync
      if (!this.isHost) {
        setTimeout(() => {
          if (this.gameState === 'syncing') {
            this.gameState = 'active'
            this.notifyStateChange()
          }
        }, 1000) // Give time for any initial sync
      }
    }

    this.onConnectionChange(peerId, 'connected')
  }

  /**
   * Handle peer disconnection
   */
  handlePeerDisconnection(peerId, connection, error) {
    this.log(`Peer disconnected: ${peerId}`, error ? `Error: ${error.message}` : '')

    // Store disconnection info for reconnection attempts
    this.remotePlayerId = null
    
    // If we lose all connections, go back to waiting and attempt reconnection
    if (!this.swarmManager.hasConnections()) {
      if (this.gameState === 'active') {
        this.gameState = 'waiting'
        this.notifyStateChange()
        
        // Attempt to reconnect after a short delay
        if (!this.isDestroyed) {
          this.attemptReconnection()
        }
      }
    }

    this.onConnectionChange(peerId, 'disconnected')
  }

  /**
   * Attempt to reconnect to peers
   */
  async attemptReconnection(attempt = 1, maxAttempts = 5) {
    if (this.isDestroyed || this.gameState === 'active') return
    
    this.log(`Reconnection attempt ${attempt}/${maxAttempts}`)
    
    const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000) // Exponential backoff, max 10s
    
    setTimeout(async () => {
      try {
        // Try to rejoin the same topic
        if (this.gameId && this.swarmManager) {
          const gameKey = Buffer.from(this.gameId, 'hex')
          await this.swarmManager.joinTopic(gameKey, { 
            client: true, 
            server: this.isHost 
          })
          
          this.log('Reconnection topic joined, waiting for peers...')
        }
      } catch (error) {
        this.log('Reconnection attempt failed:', error)
        
        if (attempt < maxAttempts) {
          this.attemptReconnection(attempt + 1, maxAttempts)
        } else {
          this.log('Max reconnection attempts reached')
          this.onError(new Error('Failed to reconnect to game after multiple attempts'))
        }
      }
    }, delay)
  }

  /**
   * Handle peer message
   */
  async handlePeerMessage(message, peerId, socket) {
    this.log(`Message from ${peerId}:`, message)

    try {
      switch (message.type) {
        case 'handshake':
          await this.handleHandshake(message, peerId)
          break

        case 'move':
          await this.handleMoveMessage(message, peerId)
          break

        case 'game_state_request':
          await this.handleGameStateRequest(peerId)
          break

        case 'game_state_response':
          await this.handleGameStateResponse(message)
          break

        case 'sync_complete':
          this.handleSyncComplete(message, peerId)
          break

        case 'game_end':
          this.handleGameEndMessage(message, peerId)
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
   * Handle handshake from peer
   */
  async handleHandshake(message, peerId) {
    this.log('Handling handshake from peer:', message)

    this.remotePlayerId = peerId

    // Add remote player as writer
    if (message.gameId === this.gameId) {
      // For new games, transition to active immediately
      if (this.isHost && this.gameState === 'syncing') {
        this.gameState = 'active'
        this.notifyStateChange()
        
        // Send sync complete to guest
        this.swarmManager.sendToPeer(peerId, {
          type: 'sync_complete',
          gameId: this.gameId,
          timestamp: Date.now()
        })
      } else if (!this.isHost) {
        // Guest requests game state or acknowledges if new game
        const moves = await this.gameCore.getMoves()
        if (moves.length === 0) {
          // New game - just sync complete
          this.gameState = 'active'
          this.notifyStateChange()
        } else {
          // Existing game - request state
          this.swarmManager.sendToPeer(peerId, {
            type: 'game_state_request',
            gameId: this.gameId,
            timestamp: Date.now()
          })
        }
      }
    }
  }

  /**
   * Handle move message from peer
   */
  async handleMoveMessage(message, peerId) {
    if (message.gameId !== this.gameId) {
      this.log('Move for different game, ignoring')
      return
    }

    this.log('Move received from peer:', message.move)
    
    // Don't process our own moves
    if (message.move.player === this.playerColor) {
      this.log('Ignoring our own move echoed back')
      return
    }

    // Directly notify the UI about the remote move
    // The move will also be synced via Autobase replication
    this.onMoveReceived(message.move)
    
    // Also add to Autobase for persistence
    try {
      await this.gameCore.addMove(message.move)
      this.log('Remote move added to game core')
    } catch (error) {
      this.log('Failed to add remote move to core:', error)
      // Continue anyway since we already notified the UI
    }
  }

  /**
   * Handle game state request
   */
  async handleGameStateRequest(peerId) {
    this.log('Sending game state to peer:', peerId)
    await this.sendGameState(peerId)
  }

  /**
   * Send current game state to peer
   */
  async sendGameState(peerId) {
    try {
      const moves = await this.gameCore.getMoves()
      const gameState = await this.gameCore.getGameState()

      const message = {
        type: 'game_state_response',
        gameId: this.gameId,
        moves: moves,
        gameState: gameState,
        timestamp: Date.now()
      }

      this.swarmManager.sendToPeer(peerId, message)
    } catch (error) {
      this.log('Failed to send game state:', error)
    }
  }

  /**
   * Handle game state response
   */
  async handleGameStateResponse(message) {
    this.log('Received game state:', message)

    // Apply moves to sync game state
    if (message.moves && message.moves.length > 0) {
      this.log(`Syncing ${message.moves.length} moves`)
      
      // Notify application to sync moves
      for (const move of message.moves) {
        this.onMoveReceived(move)
      }
    }

    // Update state to active
    this.gameState = 'active'
    this.notifyStateChange()

    // Send sync complete
    this.swarmManager.sendToPeer(this.remotePlayerId, {
      type: 'sync_complete',
      gameId: this.gameId,
      timestamp: Date.now()
    })
  }

  /**
   * Handle sync complete message
   */
  handleSyncComplete(message, peerId) {
    this.log('Sync complete from peer:', peerId)
    
    if (this.gameState === 'syncing') {
      this.gameState = 'active'
      this.notifyStateChange()
    }
  }

  /**
   * Handle game end message from peer
   */
  handleGameEndMessage(message, peerId) {
    if (message.gameId !== this.gameId) {
      this.log('Game end for different game, ignoring')
      return
    }

    this.log('Game end received from peer:', message.result)
    
    // Update our game state
    this.gameState = 'finished'
    this.notifyStateChange()
    
    // Notify the UI about the game end
    if (this.onGameEnd) {
      this.onGameEnd(message.result)
    }
  }

  /**
   * Handle player join
   */
  handlePlayerJoin(playerKey) {
    this.log('Player joined:', playerKey.toString('hex'))
    this.onPlayerJoin(playerKey.toString('hex'))
  }

  /**
   * Handle core errors
   */
  handleCoreError(error) {
    this.log('Game core error:', error)
    this.onError(error)
  }

  /**
   * Handle swarm errors
   */
  handleSwarmError(error) {
    this.log('Swarm error:', error)
    this.onError(error)
  }

  /**
   * Notify state change
   */
  notifyStateChange() {
    this.log('Game state changed to:', this.gameState)
    this.onGameStateChange(this.gameState, this.getStatus())
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      gameId: this.gameId,
      gameState: this.gameState,
      playerColor: this.playerColor,
      isHost: this.isHost,
      connectedPeers: this.swarmManager ? this.swarmManager.getConnectedPeers() : [],
      stats: {
        swarm: this.swarmManager ? this.swarmManager.getStats() : null,
        core: this.gameCore ? this.gameCore.getStats() : null
      }
    }
  }

  /**
   * Check if ready for moves
   */
  isReadyForMoves() {
    return this.gameState === 'active' && this.swarmManager.hasConnections()
  }

  /**
   * Log debug messages
   */
  log(...args) {
    if (this.options.debug) {
      console.log('[GameSync]', ...args)
    }
  }

  /**
   * Save current game state
   */
  async saveGameState() {
    if (!this.chessGame || !this.gameId) return

    try {
      const gameInfo = this.chessGame.getGameInfo()
      const state = {
        gameId: this.gameId,
        players: gameInfo.players,
        moveHistory: this.chessGame.moveHistory,
        currentTurn: gameInfo.currentTurn,
        isGameOver: gameInfo.isGameOver,
        result: gameInfo.result,
        startTime: gameInfo.startTime,
        playerColor: this.playerColor,
        isHost: this.isHost,
        fen: this.chessGame.toFen()
      }

      await this.persistence.saveGame(this.gameId, state)
      this.log('Game state saved')
    } catch (error) {
      this.log('Failed to save game state:', error)
    }
  }

  /**
   * Restore game state
   * @param {string} gameId - Game to restore
   */
  async restoreGameState(gameId) {
    try {
      const result = await this.persistence.loadGame(gameId)
      if (!result.success) {
        return { success: false, error: result.error }
      }

      const connectionResult = await this.persistence.loadConnectionInfo(gameId)
      if (!connectionResult.success) {
        return { success: false, error: 'Connection info not found' }
      }

      // Restore game properties
      this.gameId = gameId
      this.playerColor = result.gameState.playerColor
      this.isHost = result.gameState.isHost

      // Return the saved state for the chess game to restore
      return {
        success: true,
        gameState: result.gameState,
        connectionInfo: connectionResult.connectionInfo,
        savedAt: result.savedAt
      }
    } catch (error) {
      this.log('Failed to restore game state:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * List saved games
   */
  async listSavedGames() {
    try {
      return await this.persistence.listSavedGames()
    } catch (error) {
      this.log('Failed to list saved games:', error)
      return []
    }
  }

  /**
   * Cleanup and destroy
   */
  async destroy() {
    this.log('Destroying game synchronization...')
    this.isDestroyed = true

    try {
      // Save final game state before destroying
      if (this.gameState === 'active' && this.chessGame) {
        await this.saveGameState()
      }

      if (this.swarmManager) {
        await this.swarmManager.destroy()
      }

      if (this.gameCore) {
        await this.gameCore.close()
      }

      this.log('Game synchronization destroyed')
    } catch (error) {
      this.log('Error destroying game synchronization:', error)
      throw error
    }
  }
}

// Export factory function
export function createGameSync(options = {}) {
  return new GameSync(options)
}