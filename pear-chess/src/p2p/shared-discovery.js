/**
 * Pear's Gambit - Shared Game Discovery Registry
 * 
 * Cross-instance game discovery mechanism for spectators and matchmaking
 */

import fs from 'fs'
import path from 'path'

/**
 * Shared Discovery Registry
 * Manages a cross-instance registry of active games for spectator discovery
 */
export class SharedDiscoveryRegistry {
  constructor(options = {}) {
    this.options = {
      debug: options.debug || false,
      registryPath: options.registryPath || this.getRegistryPath(),
      cleanupInterval: options.cleanupInterval || 30000, // 30 seconds
      gameTimeout: options.gameTimeout || 300000, // 5 minutes
      ...options
    }

    // State
    this.localGames = new Map() // Games hosted by this instance
    this.cleanupTimer = null

    this.init()
  }

  /**
   * Get platform-appropriate registry path
   */
  getRegistryPath() {
    // Use Pear storage if available, otherwise use a shared directory
    if (typeof Pear !== 'undefined' && Pear.config && Pear.config.storage) {
      return path.join(Pear.config.storage, 'shared-games-registry.json')
    } else {
      // Use OS-appropriate shared directory
      const os = require('os')
      const homeDir = os.homedir()
      return path.join(homeDir, '.pear-chess', 'shared-games-registry.json')
    }
  }

  /**
   * Initialize the registry
   */
  init() {
    try {
      // Ensure registry directory exists
      const registryDir = path.dirname(this.options.registryPath)
      if (!fs.existsSync(registryDir)) {
        fs.mkdirSync(registryDir, { recursive: true })
      }

      // Start cleanup timer
      this.cleanupTimer = setInterval(() => {
        this.cleanupExpiredGames()
      }, this.options.cleanupInterval)

      this.log('Shared discovery registry initialized:', this.options.registryPath)
    } catch (error) {
      this.log('Failed to initialize shared registry:', error)
    }
  }

  /**
   * Register a new active game
   */
  async registerGame(gameInfo) {
    try {
      const gameEntry = {
        gameId: gameInfo.gameId,
        inviteCode: gameInfo.inviteCode,
        gameKey: gameInfo.gameKey,
        hostInfo: {
          instanceId: gameInfo.instanceId || 'unknown',
          playerName: gameInfo.playerName || 'Anonymous',
          timestamp: Date.now()
        },
        gameSettings: {
          timeControl: gameInfo.timeControl || null,
          variant: 'standard'
        },
        status: 'active',
        registeredAt: Date.now(),
        lastSeen: Date.now()
      }

      // Add to local games
      this.localGames.set(gameInfo.inviteCode, gameEntry)

      // Update shared registry
      await this.updateSharedRegistry()

      this.log('Game registered:', gameInfo.inviteCode)
      return { success: true, gameEntry }
    } catch (error) {
      this.log('Failed to register game:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Update game status (for heartbeat)
   */
  async updateGameStatus(inviteCode, status = {}) {
    try {
      const gameEntry = this.localGames.get(inviteCode)
      if (!gameEntry) {
        return { success: false, error: 'Game not found in local registry' }
      }

      // Update local entry
      gameEntry.lastSeen = Date.now()
      gameEntry.status = status.status || gameEntry.status
      
      if (status.playerCount !== undefined) {
        gameEntry.playerCount = status.playerCount
      }

      // Update shared registry
      await this.updateSharedRegistry()

      this.log('Game status updated:', inviteCode, status)
      return { success: true }
    } catch (error) {
      this.log('Failed to update game status:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Unregister a game (when it ends or host disconnects)
   */
  async unregisterGame(inviteCode) {
    try {
      // Remove from local games
      const removed = this.localGames.delete(inviteCode)

      if (removed) {
        // Update shared registry
        await this.updateSharedRegistry()
        this.log('Game unregistered:', inviteCode)
      }

      return { success: true }
    } catch (error) {
      this.log('Failed to unregister game:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Find games available for spectating
   */
  async findAvailableGames(criteria = {}) {
    try {
      const registry = await this.loadSharedRegistry()
      const availableGames = []

      for (const [inviteCode, gameEntry] of Object.entries(registry.games || {})) {
        // Skip expired games
        if (this.isGameExpired(gameEntry)) {
          continue
        }

        // Apply criteria filters
        if (criteria.excludeOwnGames && this.localGames.has(inviteCode)) {
          continue
        }

        if (criteria.timeControl && gameEntry.gameSettings?.timeControl !== criteria.timeControl) {
          continue
        }

        if (criteria.playerName && !gameEntry.hostInfo?.playerName?.includes(criteria.playerName)) {
          continue
        }

        availableGames.push({
          inviteCode,
          gameId: gameEntry.gameId,
          gameKey: gameEntry.gameKey,
          hostPlayer: gameEntry.hostInfo?.playerName || 'Anonymous',
          timeControl: gameEntry.gameSettings?.timeControl,
          status: gameEntry.status,
          playerCount: gameEntry.playerCount || 1,
          lastSeen: gameEntry.lastSeen,
          age: Date.now() - gameEntry.registeredAt
        })
      }

      // Sort by most recent
      availableGames.sort((a, b) => b.lastSeen - a.lastSeen)

      this.log(`Found ${availableGames.length} available games`)
      return { success: true, games: availableGames }
    } catch (error) {
      this.log('Failed to find available games:', error)
      return { success: false, error: error.message, games: [] }
    }
  }

  /**
   * Get game info by invite code
   */
  async getGameInfo(inviteCode) {
    try {
      const registry = await this.loadSharedRegistry()
      const gameEntry = registry.games?.[inviteCode]

      if (!gameEntry) {
        return { success: false, error: 'Game not found' }
      }

      if (this.isGameExpired(gameEntry)) {
        return { success: false, error: 'Game has expired' }
      }

      return { success: true, gameInfo: gameEntry }
    } catch (error) {
      this.log('Failed to get game info:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Update the shared registry file
   */
  async updateSharedRegistry() {
    try {
      // Load current registry
      const registry = await this.loadSharedRegistry()

      // Update with our local games
      for (const [inviteCode, gameEntry] of this.localGames) {
        registry.games[inviteCode] = gameEntry
      }

      // Write back to file
      registry.lastUpdated = Date.now()
      fs.writeFileSync(this.options.registryPath, JSON.stringify(registry, null, 2))

      this.log('Shared registry updated')
    } catch (error) {
      this.log('Failed to update shared registry:', error)
      throw error
    }
  }

  /**
   * Load the shared registry file
   */
  async loadSharedRegistry() {
    try {
      if (!fs.existsSync(this.options.registryPath)) {
        // Create initial registry
        const initialRegistry = {
          version: 1,
          games: {},
          createdAt: Date.now(),
          lastUpdated: Date.now()
        }
        fs.writeFileSync(this.options.registryPath, JSON.stringify(initialRegistry, null, 2))
        return initialRegistry
      }

      const registryData = fs.readFileSync(this.options.registryPath, 'utf-8')
      return JSON.parse(registryData)
    } catch (error) {
      this.log('Failed to load shared registry:', error)
      // Return empty registry on error
      return {
        version: 1,
        games: {},
        createdAt: Date.now(),
        lastUpdated: Date.now()
      }
    }
  }

  /**
   * Clean up expired games from registry
   */
  async cleanupExpiredGames() {
    try {
      const registry = await this.loadSharedRegistry()
      let removedCount = 0

      // Clean up expired games
      for (const [inviteCode, gameEntry] of Object.entries(registry.games || {})) {
        if (this.isGameExpired(gameEntry)) {
          delete registry.games[inviteCode]
          removedCount++
        }
      }

      // Also clean up our local games that might have expired
      for (const [inviteCode, gameEntry] of this.localGames) {
        if (this.isGameExpired(gameEntry)) {
          this.localGames.delete(inviteCode)
          removedCount++
        }
      }

      if (removedCount > 0) {
        registry.lastUpdated = Date.now()
        fs.writeFileSync(this.options.registryPath, JSON.stringify(registry, null, 2))
        this.log(`Cleaned up ${removedCount} expired games`)
      }
    } catch (error) {
      this.log('Failed to cleanup expired games:', error)
    }
  }

  /**
   * Check if a game entry has expired
   */
  isGameExpired(gameEntry) {
    const now = Date.now()
    return (now - gameEntry.lastSeen) > this.options.gameTimeout
  }

  /**
   * Get registry statistics
   */
  async getStats() {
    try {
      const registry = await this.loadSharedRegistry()
      const totalGames = Object.keys(registry.games || {}).length
      const localGames = this.localGames.size
      const activeGames = Object.values(registry.games || {}).filter(game => !this.isGameExpired(game)).length

      return {
        totalRegistered: totalGames,
        localGames,
        activeGames,
        expiredGames: totalGames - activeGames,
        registryPath: this.options.registryPath,
        lastUpdated: registry.lastUpdated
      }
    } catch (error) {
      this.log('Failed to get stats:', error)
      return { error: error.message }
    }
  }

  /**
   * Log debug messages
   */
  log(...args) {
    if (this.options.debug) {
      console.log('[SharedDiscovery]', ...args)
    }
  }

  /**
   * Cleanup and destroy
   */
  async destroy() {
    this.log('Destroying shared discovery registry...')

    // Clear cleanup timer
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
    }

    // Unregister all local games
    for (const inviteCode of this.localGames.keys()) {
      await this.unregisterGame(inviteCode)
    }

    this.localGames.clear()
    this.log('Shared discovery registry destroyed')
  }
}

// Export factory function
export function createSharedDiscoveryRegistry(options = {}) {
  return new SharedDiscoveryRegistry(options)
}