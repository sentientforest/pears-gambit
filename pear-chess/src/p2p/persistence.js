/**
 * Pear's Gambit - Game State Persistence
 * 
 * Handles saving and loading game states for recovery
 */

/* global Pear */

import fs from 'fs/promises'
import path from 'path'

/**
 * Game Persistence Manager
 * Saves game state to disk for recovery after disconnection
 */
export class GamePersistence {
  constructor(options = {}) {
    this.options = {
      storage: options.storage || './chess-games-state',
      maxSavedGames: options.maxSavedGames || 10,
      debug: options.debug || false,
      ...options
    }

    this.init()
  }

  /**
   * Initialize persistence directory
   */
  async init() {
    try {
      // Use Pear's storage if available
      if (typeof Pear !== 'undefined' && Pear.storage) {
        this.storageDir = path.join(Pear.storage.path, this.options.storage)
      } else {
        this.storageDir = this.options.storage
      }

      // Ensure storage directory exists
      await fs.mkdir(this.storageDir, { recursive: true })
      this.log('Game persistence initialized at:', this.storageDir)
    } catch (error) {
      this.log('Failed to initialize persistence:', error)
      throw error
    }
  }

  /**
   * Save game state
   * @param {string} gameId - Unique game identifier
   * @param {Object} gameState - Current game state to save
   */
  async saveGame(gameId, gameState) {
    try {
      const filename = this.getGameFilename(gameId)
      const filepath = path.join(this.storageDir, filename)

      const saveData = {
        gameId,
        timestamp: Date.now(),
        version: 1,
        state: {
          ...gameState,
          savedAt: new Date().toISOString()
        }
      }

      await fs.writeFile(filepath, JSON.stringify(saveData, null, 2))
      this.log('Game saved:', gameId)

      // Clean up old games if needed
      await this.cleanupOldGames()

      return { success: true, filepath }
    } catch (error) {
      this.log('Failed to save game:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Load game state
   * @param {string} gameId - Game identifier to load
   */
  async loadGame(gameId) {
    try {
      const filename = this.getGameFilename(gameId)
      const filepath = path.join(this.storageDir, filename)

      const data = await fs.readFile(filepath, 'utf8')
      const saveData = JSON.parse(data)

      this.log('Game loaded:', gameId)
      return { 
        success: true, 
        gameState: saveData.state,
        savedAt: saveData.timestamp
      }
    } catch (error) {
      if (error.code === 'ENOENT') {
        this.log('No saved game found:', gameId)
        return { success: false, error: 'Game not found' }
      }
      this.log('Failed to load game:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * List all saved games
   */
  async listSavedGames() {
    try {
      const files = await fs.readdir(this.storageDir)
      const gameFiles = files.filter(f => f.endsWith('.chess.json'))

      const games = []
      for (const file of gameFiles) {
        try {
          const filepath = path.join(this.storageDir, file)
          const data = await fs.readFile(filepath, 'utf8')
          const saveData = JSON.parse(data)
          
          games.push({
            gameId: saveData.gameId,
            savedAt: saveData.timestamp,
            players: saveData.state.players,
            moveCount: saveData.state.moveHistory?.length || 0
          })
        } catch (error) {
          this.log('Error reading game file:', file, error)
        }
      }

      // Sort by save time, newest first
      games.sort((a, b) => b.savedAt - a.savedAt)

      return games
    } catch (error) {
      this.log('Failed to list saved games:', error)
      return []
    }
  }

  /**
   * Delete saved game
   * @param {string} gameId - Game to delete
   */
  async deleteGame(gameId) {
    try {
      const filename = this.getGameFilename(gameId)
      const filepath = path.join(this.storageDir, filename)

      await fs.unlink(filepath)
      this.log('Game deleted:', gameId)
      return { success: true }
    } catch (error) {
      this.log('Failed to delete game:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Clean up old saved games
   */
  async cleanupOldGames() {
    try {
      const games = await this.listSavedGames()
      
      if (games.length > this.options.maxSavedGames) {
        // Delete oldest games
        const toDelete = games.slice(this.options.maxSavedGames)
        
        for (const game of toDelete) {
          await this.deleteGame(game.gameId)
        }
        
        this.log(`Cleaned up ${toDelete.length} old games`)
      }
    } catch (error) {
      this.log('Failed to cleanup old games:', error)
    }
  }

  /**
   * Get filename for game
   * @param {string} gameId - Game identifier
   */
  getGameFilename(gameId) {
    // Sanitize gameId for filesystem
    const safeId = gameId.replace(/[^a-zA-Z0-9-_]/g, '_')
    return `${safeId}.chess.json`
  }

  /**
   * Save P2P connection info
   * @param {string} gameId - Game identifier
   * @param {Object} connectionInfo - P2P connection details
   */
  async saveConnectionInfo(gameId, connectionInfo) {
    try {
      const filename = `${gameId}.connection.json`
      const filepath = path.join(this.storageDir, filename)

      const data = {
        gameId,
        timestamp: Date.now(),
        connection: {
          inviteCode: connectionInfo.inviteCode,
          gameKey: connectionInfo.gameKey,
          playerColor: connectionInfo.playerColor,
          isHost: connectionInfo.isHost,
          opponentInfo: connectionInfo.opponentInfo || {}
        }
      }

      await fs.writeFile(filepath, JSON.stringify(data, null, 2))
      this.log('Connection info saved:', gameId)
      return { success: true }
    } catch (error) {
      this.log('Failed to save connection info:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Load P2P connection info
   * @param {string} gameId - Game identifier
   */
  async loadConnectionInfo(gameId) {
    try {
      const filename = `${gameId}.connection.json`
      const filepath = path.join(this.storageDir, filename)

      const data = await fs.readFile(filepath, 'utf8')
      const connectionData = JSON.parse(data)

      this.log('Connection info loaded:', gameId)
      return { 
        success: true, 
        connectionInfo: connectionData.connection,
        savedAt: connectionData.timestamp
      }
    } catch (error) {
      if (error.code === 'ENOENT') {
        return { success: false, error: 'Connection info not found' }
      }
      this.log('Failed to load connection info:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Log debug messages
   */
  log(...args) {
    if (this.options.debug) {
      console.log('[GamePersistence]', ...args)
    }
  }
}

/**
 * Create persistence manager instance
 */
export function createGamePersistence(options = {}) {
  return new GamePersistence(options)
}