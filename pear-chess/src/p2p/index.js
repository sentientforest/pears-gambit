/**
 * Pear's Gambit - P2P Module
 * 
 * Main P2P networking exports
 */

export { SwarmManager, createSwarmManager } from './swarm.js'
export { GameCore, createGameCore } from './core.js'
export { GameSync, createGameSync } from './sync.js'
export { GameDiscovery, createGameDiscovery } from './discovery.js'

// Import for internal use
import { createGameDiscovery } from './discovery.js'
import { createGameSync } from './sync.js'

/**
 * Create a complete P2P game session
 * @param {Object} options - Configuration options
 * @returns {Object} Complete P2P game session
 */
export function createP2PGameSession(options = {}) {
  const discovery = createGameDiscovery({
    debug: options.debug || false
  })

  const gameSync = createGameSync({
    debug: options.debug || false,
    storage: options.storage || './chess-games',
    ...options
  })

  return {
    discovery,
    gameSync,
    
    /**
     * Create and host a new game
     */
    async createGame(chessGame, gameConfig = {}) {
      // Create invitation
      const inviteResult = discovery.createGameInvitation(gameConfig)
      if (!inviteResult.success) {
        return inviteResult
      }

      // Start hosting the game with the invitation
      const hostResult = await gameSync.createGame(chessGame, inviteResult.invitation, gameConfig.timeControl)
      if (!hostResult.success) {
        return hostResult
      }

      return {
        success: true,
        invitation: inviteResult.invitation,
        gameSession: {
          gameId: hostResult.gameId,
          inviteCode: inviteResult.invitation.inviteCode,
          playerColor: hostResult.playerColor,
          isHost: true
        }
      }
    },

    /**
     * Join an existing game
     */
    async joinGame(inviteCode, chessGame, playerConfig = {}) {
      // Validate and join via discovery
      const joinResult = await discovery.joinGameByInvite(inviteCode, playerConfig)
      if (!joinResult.success) {
        return joinResult
      }

      // Connect to the game with join info  
      const connectResult = await gameSync.joinGame(inviteCode, chessGame, joinResult.joinInfo, playerConfig.timeControl)
      if (!connectResult.success) {
        return connectResult
      }

      return {
        success: true,
        gameSession: {
          gameId: connectResult.gameId,
          inviteCode,
          playerColor: connectResult.playerColor,
          isHost: false
        }
      }
    },

    /**
     * Get current status
     */
    getStatus() {
      return {
        discovery: discovery.getStats(),
        sync: gameSync.getStatus()
      }
    },

    /**
     * Cleanup everything
     */
    async destroy() {
      discovery.cleanup()
      await gameSync.destroy()
    }
  }
}

/**
 * P2P utilities
 */
export const P2PUtils = {
  /**
   * Validate invite code format
   */
  isValidInviteCode(code) {
    return /^[A-F0-9]{3}-[A-F0-9]{3}$/i.test(code)
  },

  /**
   * Generate game link
   */
  generateGameLink(inviteCode) {
    return `pears-gambit://join/${inviteCode}`
  },

  /**
   * Parse game link
   */
  parseGameLink(link) {
    try {
      // Handle custom protocol manually since URL constructor might not support it
      if (typeof link !== 'string') {
        return { valid: false }
      }
      
      const match = link.match(/^pears-gambit:\/\/join\/(.+)$/)
      if (match && match[1]) {
        const inviteCode = match[1]
        return {
          valid: this.isValidInviteCode(inviteCode),
          inviteCode
        }
      }
    } catch {}
    return { valid: false }
  },

  /**
   * Format connection status for display
   */
  formatConnectionStatus(status) {
    const stateMessages = {
      'waiting': 'Waiting for opponent...',
      'connecting': 'Connecting to opponent...',
      'syncing': 'Synchronizing game state...',
      'active': 'Connected and ready!',
      'finished': 'Game completed'
    }

    return stateMessages[status.gameState] || 'Unknown state'
  }
}