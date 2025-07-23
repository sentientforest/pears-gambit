/**
 * Pear's Gambit - Autobase Game Core
 * 
 * Handles multi-writer game state synchronization using Autobase
 */

/* global Pear */

import Autobase from 'autobase'
import Corestore from 'corestore'
import { moveEncoding } from '../chess/game.js'
import hypercoreCrypto from 'hypercore-crypto'

/**
 * Game Core for P2P synchronized chess games
 */
export class GameCore {
  constructor(options = {}) {
    this.options = {
      storage: options.storage || './chess-games',
      debug: options.debug || false,
      ...options
    }

    // State
    this.store = null
    this.gameBase = null
    this.gameView = null
    this.isReady = false
    this.gameId = options.gameId || hypercoreCrypto.randomBytes(32).toString('hex')

    // Event handlers
    this.onMove = options.onMove || (() => {})
    this.onPlayerJoin = options.onPlayerJoin || (() => {})
    this.onStateChange = options.onStateChange || (() => {})
    this.onError = options.onError || (() => {})

    this.init()
  }

  /**
   * Initialize the game core
   */
  async init() {
    try {
      this.log('Initializing game core...')

      // Use Pear's storage system or fallback to provided path
      let storageDir = this.options.storage
      
      // Generate a unique instance identifier for this app instance
      const instanceId = this.options.instanceId || this.generateInstanceId()
      
      // Try to use Pear's storage system if available
      if (typeof Pear !== 'undefined' && Pear.config && Pear.config.storage) {
        storageDir = `${Pear.config.storage}/chess-p2p-${instanceId}`
        this.log('Using Pear storage with instance ID:', storageDir)
      } else if (!storageDir || storageDir.startsWith('.')) {
        // Fallback to a more standard location
        storageDir = `./pear-chess-storage-${instanceId}`
        this.log('Using fallback storage with instance ID:', storageDir)
      } else {
        this.log('Using provided storage:', storageDir)
      }
      
      this.store = new Corestore(storageDir)
      await this.store.ready()

      // Create autobase for multi-writer coordination
      this.gameBase = new Autobase(this.store, null, {
        valueEncoding: moveEncoding,
        open: this.openView.bind(this),
        apply: this.applyMoves.bind(this)
      })

      await this.gameBase.ready()
      this.bindEvents()
      this.isReady = true

      this.log('Game core initialized successfully')
    } catch (error) {
      this.log('Failed to initialize game core:', error)
      this.onError(error)
      throw error
    }
  }

  /**
   * Generate a unique instance identifier
   */
  generateInstanceId() {
    // Use process ID if available, otherwise use timestamp + random
    if (typeof process !== 'undefined' && process.pid) {
      return `pid${process.pid}`
    }
    
    // Fallback to timestamp + random for browsers/other environments
    const timestamp = Date.now().toString(36)
    const random = Math.random().toString(36).substring(2, 8)
    return `${timestamp}-${random}`
  }

  /**
   * Open view for Autobase - creates the view hypercore
   */
  openView(store) {
    return store.get('chess-moves', { valueEncoding: moveEncoding })
  }

  /**
   * Apply moves to the view - required by Autobase
   */
  async applyMoves(nodes, view, base) {
    for (const node of nodes) {
      this.log('Applying move node:', node)
      
      // Handle the move notification
      this.handleNewMove(node)
      
      // Append to view
      await view.append(node.value)
    }
  }

  /**
   * Bind event handlers
   */
  bindEvents() {
    // Listen for autobase updates
    this.gameBase.on('append', (input, batch) => {
      this.log('Autobase append:', { input: input.key.toString('hex'), batch })
    })

    this.gameBase.on('error', (error) => {
      this.log('Autobase error:', error)
      this.onError(error)
    })
  }

  /**
   * Handle new move from autobase
   */
  handleNewMove(node) {
    try {
      const move = node.value
      this.log('New move received:', move)

      // Validate move before applying
      if (this.validateMove(move)) {
        this.onMove(move, node)
      } else {
        this.log('Invalid move rejected:', move)
      }
    } catch (error) {
      this.log('Error handling move:', error)
      this.onError(error)
    }
  }

  /**
   * Validate move before applying
   */
  validateMove(move) {
    // Basic validation
    if (!move || typeof move !== 'object') {
      return false
    }

    // Required fields
    const requiredFields = ['from', 'to', 'piece', 'player', 'timestamp']
    for (const field of requiredFields) {
      if (!move[field]) {
        this.log(`Move missing required field: ${field}`)
        return false
      }
    }

    // Player validation
    if (!['white', 'black'].includes(move.player)) {
      this.log('Invalid player:', move.player)
      return false
    }

    // Square format validation
    const squarePattern = /^[a-h][1-8]$/
    if (!squarePattern.test(move.from) || !squarePattern.test(move.to)) {
      this.log('Invalid square format:', move.from, move.to)
      return false
    }

    // Timestamp validation (within reasonable bounds)
    const now = Date.now()
    const moveTime = move.timestamp
    if (moveTime > now + 5000 || moveTime < now - 300000) { // 5s future, 5m past
      this.log('Invalid timestamp:', moveTime, 'current:', now)
      return false
    }

    return true
  }

  /**
   * Add a move to the game log
   */
  async addMove(move) {
    if (!this.isReady) {
      throw new Error('Game core not ready')
    }

    try {
      // Ensure move has timestamp
      if (!move.timestamp) {
        move.timestamp = Date.now()
      }

      // Add game ID for tracking
      move.gameId = this.gameId

      this.log('Adding move to game log:', move)
      
      // Append to local input
      await this.gameBase.append(move)
      
      this.log('Move added successfully')
      return true
    } catch (error) {
      this.log('Failed to add move:', error)
      this.onError(error)
      throw error
    }
  }

  /**
   * Add remote player as writer
   */
  async addPlayer(playerKey) {
    if (!this.isReady) {
      throw new Error('Game core not ready')
    }

    try {
      this.log('Adding player as writer:', playerKey.toString('hex'))

      // Create input for remote player
      const remoteInput = this.store.get(playerKey)
      await remoteInput.ready()

      // Add to inputs
      this.gameBase.addInput(remoteInput)
      
      this.log('Player added successfully')
      this.onPlayerJoin(playerKey)
      
      return true
    } catch (error) {
      this.log('Failed to add player:', error)
      this.onError(error)
      throw error
    }
  }

  /**
   * Get all moves from the game log
   */
  async getMoves() {
    if (!this.isReady) {
      throw new Error('Game core not ready')
    }

    try {
      const moves = []
      
      // Read from the autobase view
      if (this.gameBase.view) {
        const length = this.gameBase.view.length
        
        for (let i = 0; i < length; i++) {
          try {
            const node = await this.gameBase.view.get(i)
            if (node) {
              moves.push(node)
            }
          } catch (error) {
            this.log('Error reading move at index', i, error)
          }
        }
      }
      
      this.log(`Retrieved ${moves.length} moves from game log`)
      return moves
    } catch (error) {
      this.log('Failed to get moves:', error)
      throw error
    }
  }

  /**
   * Get current game state summary
   */
  async getGameState() {
    try {
      const moves = await this.getMoves()
      
      return {
        gameId: this.gameId,
        moveCount: moves.length,
        lastMove: moves[moves.length - 1] || null,
        players: this.getPlayerList(),
        isReady: this.isReady
      }
    } catch (error) {
      this.log('Failed to get game state:', error)
      throw error
    }
  }

  /**
   * Get list of players (writers)
   */
  getPlayerList() {
    if (!this.gameBase || !this.gameBase.activeWriters) return []

    try {
      const writers = []
      // Get writers from the activeWriters instance
      for (const writer of this.gameBase.activeWriters.all()) {
        writers.push({
          key: writer.core.key.toString('hex'),
          length: writer.length,
          writable: writer.core.writable
        })
      }
      return writers
    } catch (error) {
      this.log('Error getting player list:', error)
      return []
    }
  }

  /**
   * Create replication stream for syncing with peers
   */
  createReplicationStream() {
    if (!this.store) {
      throw new Error('Store not ready')
    }

    this.log('Creating replication stream')
    return this.store.replicate()
  }

  /**
   * Handle replication stream from peer
   */
  handleReplicationStream(stream) {
    if (!this.store) {
      throw new Error('Store not ready')
    }

    this.log('Handling replication stream from peer')
    
    // Pipe the incoming stream to our store
    const replicationStream = this.store.replicate()
    stream.pipe(replicationStream).pipe(stream)

    // Handle stream events
    stream.on('error', (error) => {
      this.log('Replication stream error:', error)
    })

    stream.on('close', () => {
      this.log('Replication stream closed')
    })

    return replicationStream
  }

  /**
   * Wait for game core to be ready
   */
  async ready() {
    if (this.isReady) return

    return new Promise((resolve, reject) => {
      const checkReady = () => {
        if (this.isReady) {
          resolve()
        } else {
          setTimeout(checkReady, 100)
        }
      }

      // Timeout after 30 seconds
      setTimeout(() => {
        if (!this.isReady) {
          reject(new Error('Timeout waiting for game core to be ready'))
        }
      }, 30000)

      checkReady()
    })
  }

  /**
   * Get core statistics
   */
  getStats() {
    return {
      gameId: this.gameId,
      isReady: this.isReady,
      players: this.getPlayerList(),
      storage: this.options.storage
    }
  }

  /**
   * Log debug messages
   */
  log(...args) {
    if (this.options.debug) {
      console.log('[GameCore]', ...args)
    }
  }

  /**
   * Close and cleanup
   */
  async close() {
    this.log('Closing game core...')

    try {
      if (this.gameView) {
        this.gameView.destroy()
      }

      if (this.gameBase) {
        await this.gameBase.close()
      }

      if (this.store) {
        await this.store.close()
      }

      this.isReady = false
      this.log('Game core closed successfully')
    } catch (error) {
      this.log('Error closing game core:', error)
      throw error
    }
  }
}

// Export factory function
export function createGameCore(options = {}) {
  return new GameCore(options)
}