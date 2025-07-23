/**
 * Pear's Gambit - Autobase Game Core
 * 
 * Handles multi-writer game state synchronization using Autobase
 */

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

      // Create corestore
      this.store = new Corestore(this.options.storage)
      await this.store.ready()

      // Create autobase for multi-writer coordination
      this.gameBase = new Autobase({
        inputs: [this.store.get({ name: 'local-moves' })],
        localInput: this.store.get({ name: 'local-moves' }),
        valueEncoding: moveEncoding
      })

      // Set up view for reading moves
      this.gameView = this.gameBase.createReadStream()
      this.bindEvents()

      await this.gameBase.ready()
      this.isReady = true

      this.log('Game core initialized successfully')
    } catch (error) {
      this.log('Failed to initialize game core:', error)
      this.onError(error)
      throw error
    }
  }

  /**
   * Bind event handlers
   */
  bindEvents() {
    // Listen for new moves
    this.gameView.on('data', (node) => {
      this.handleNewMove(node)
    })

    this.gameView.on('error', (error) => {
      this.log('Game view error:', error)
      this.onError(error)
    })

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
      
      // Create snapshot and read all moves
      const snapshot = this.gameBase.createReadStream()
      
      return new Promise((resolve, reject) => {
        snapshot.on('data', (node) => {
          if (node.value) {
            moves.push(node.value)
          }
        })

        snapshot.on('end', () => {
          this.log(`Retrieved ${moves.length} moves from game log`)
          resolve(moves)
        })

        snapshot.on('error', (error) => {
          this.log('Error reading moves:', error)
          reject(error)
        })
      })
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
    if (!this.gameBase) return []

    return this.gameBase.inputs.map(input => ({
      key: input.key.toString('hex'),
      length: input.length,
      writable: input.writable
    }))
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