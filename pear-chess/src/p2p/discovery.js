/**
 * Pear's Gambit - Game Discovery and Invitations
 * 
 * Handles game discovery, invitations, and matchmaking
 */

import hypercoreCrypto from 'hypercore-crypto'

/**
 * Game Discovery Manager
 * Handles creating and joining games through invitation codes
 */
export class GameDiscovery {
  constructor(options = {}) {
    this.options = {
      debug: options.debug || false,
      inviteCodeLength: options.inviteCodeLength || 6,
      ...options
    }

    // State
    this.activeGames = new Map()
    this.pendingInvites = new Map()
    this.gameHistory = []

    // Event handlers
    this.onGameCreated = options.onGameCreated || (() => {})
    this.onGameJoined = options.onGameJoined || (() => {})
    this.onInviteReceived = options.onInviteReceived || (() => {})
    this.onError = options.onError || (() => {})
  }

  /**
   * Generate human-readable invite code
   */
  generateInviteCode() {
    // Use base36 encoding for human-friendly codes
    const randomPart = hypercoreCrypto.randomBytes(4).toString('hex').toUpperCase()
    
    // Format as XXX-XXX for readability
    const code = randomPart.substring(0, 3) + '-' + randomPart.substring(3, 6)
    
    return code
  }

  /**
   * Generate game key from invite code
   */
  inviteCodeToGameKey(inviteCode) {
    // Remove dashes and convert to buffer
    const cleanCode = inviteCode.replace(/-/g, '').toLowerCase()
    
    // Pad to 64 characters (32 bytes hex) for game key
    const paddedCode = cleanCode.padEnd(64, '0')
    
    return Buffer.from(paddedCode, 'hex')
  }

  /**
   * Create a new game invitation
   */
  createGameInvitation(gameConfig = {}) {
    try {
      const inviteCode = this.generateInviteCode()
      const gameKey = this.inviteCodeToGameKey(inviteCode)
      
      const invitation = {
        inviteCode,
        gameKey: gameKey.toString('hex'),
        gameId: hypercoreCrypto.randomBytes(16).toString('hex'),
        createdAt: Date.now(),
        hostInfo: {
          playerId: hypercoreCrypto.randomBytes(8).toString('hex'),
          playerName: gameConfig.playerName || 'Anonymous',
          rating: gameConfig.rating || null
        },
        gameSettings: {
          timeControl: gameConfig.timeControl || null,
          variant: gameConfig.variant || 'standard',
          rated: gameConfig.rated || false,
          private: gameConfig.private || false
        },
        status: 'pending' // pending, active, expired, cancelled
      }

      this.pendingInvites.set(inviteCode, invitation)
      
      this.log('Created game invitation:', invitation)
      this.onGameCreated(invitation)

      return {
        success: true,
        invitation
      }
    } catch (error) {
      this.log('Failed to create game invitation:', error)
      this.onError(error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Join game by invitation code
   */
  async joinGameByInvite(inviteCode, playerConfig = {}) {
    try {
      this.log(`Attempting to join game with code: ${inviteCode}`)

      // Validate invite code format
      if (!this.isValidInviteCode(inviteCode)) {
        throw new Error('Invalid invite code format')
      }

      const gameKey = this.inviteCodeToGameKey(inviteCode)
      
      const joinInfo = {
        inviteCode,
        gameKey: gameKey.toString('hex'),
        joinedAt: Date.now(),
        playerInfo: {
          playerId: hypercoreCrypto.randomBytes(8).toString('hex'),
          playerName: playerConfig.playerName || 'Anonymous',
          rating: playerConfig.rating || null
        }
      }

      this.log('Joining game:', joinInfo)
      this.onGameJoined(joinInfo)

      return {
        success: true,
        gameKey,
        joinInfo
      }
    } catch (error) {
      this.log('Failed to join game:', error)
      this.onError(error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Validate invite code format
   */
  isValidInviteCode(inviteCode) {
    if (!inviteCode || typeof inviteCode !== 'string') {
      return false
    }

    // Check format: XXX-XXX
    const pattern = /^[A-F0-9]{3}-[A-F0-9]{3}$/i
    return pattern.test(inviteCode)
  }

  /**
   * Accept a game invitation
   */
  acceptInvitation(inviteCode) {
    const invitation = this.pendingInvites.get(inviteCode)
    
    if (!invitation) {
      return { success: false, error: 'Invitation not found' }
    }

    if (invitation.status !== 'pending') {
      return { success: false, error: 'Invitation no longer available' }
    }

    // Mark as active
    invitation.status = 'active'
    invitation.acceptedAt = Date.now()

    // Move to active games
    this.activeGames.set(inviteCode, invitation)
    this.pendingInvites.delete(inviteCode)

    this.log('Invitation accepted:', invitation)

    return { success: true, invitation }
  }

  /**
   * Cancel a game invitation
   */
  cancelInvitation(inviteCode) {
    const invitation = this.pendingInvites.get(inviteCode)
    
    if (!invitation) {
      return { success: false, error: 'Invitation not found' }
    }

    invitation.status = 'cancelled'
    invitation.cancelledAt = Date.now()

    this.pendingInvites.delete(inviteCode)
    this.gameHistory.push(invitation)

    this.log('Invitation cancelled:', invitation)

    return { success: true }
  }

  /**
   * Get active game by invite code
   */
  getGame(inviteCode) {
    return this.activeGames.get(inviteCode) || null
  }

  /**
   * Get pending invitation by code
   */
  getPendingInvite(inviteCode) {
    return this.pendingInvites.get(inviteCode) || null
  }

  /**
   * List all pending invitations
   */
  getPendingInvites() {
    return Array.from(this.pendingInvites.values())
  }

  /**
   * List all active games
   */
  getActiveGames() {
    return Array.from(this.activeGames.values())
  }

  /**
   * Complete a game
   */
  completeGame(inviteCode, result) {
    const game = this.activeGames.get(inviteCode)
    
    if (!game) {
      return { success: false, error: 'Game not found' }
    }

    game.status = 'completed'
    game.completedAt = Date.now()
    game.result = result

    // Move to history
    this.activeGames.delete(inviteCode)
    this.gameHistory.push(game)

    this.log('Game completed:', game)

    return { success: true, game }
  }

  /**
   * Clean up expired invitations
   */
  cleanupExpiredInvites(maxAge = 3600000) { // 1 hour default
    const now = Date.now()
    const expired = []

    for (const [code, invite] of this.pendingInvites) {
      if (now - invite.createdAt > maxAge) {
        invite.status = 'expired'
        invite.expiredAt = now
        expired.push(invite)
        this.pendingInvites.delete(code)
        this.gameHistory.push(invite)
      }
    }

    if (expired.length > 0) {
      this.log(`Cleaned up ${expired.length} expired invitations`)
    }

    return expired
  }

  /**
   * Get discovery statistics
   */
  getStats() {
    return {
      pendingInvites: this.pendingInvites.size,
      activeGames: this.activeGames.size,
      completedGames: this.gameHistory.filter(g => g.status === 'completed').length,
      expiredInvites: this.gameHistory.filter(g => g.status === 'expired').length,
      cancelledInvites: this.gameHistory.filter(g => g.status === 'cancelled').length
    }
  }

  /**
   * Create quick play invitation (simplified)
   */
  createQuickPlay(playerConfig = {}) {
    return this.createGameInvitation({
      playerName: playerConfig.playerName || 'Quick Player',
      timeControl: playerConfig.timeControl || { type: 'blitz', minutes: 5, increment: 0 },
      variant: 'standard',
      rated: false,
      private: false
    })
  }

  /**
   * Search for available games (future feature)
   */
  searchGames(criteria = {}) {
    // This would search for public games matching criteria
    const availableGames = Array.from(this.pendingInvites.values())
      .filter(invite => {
        if (invite.gameSettings.private) return false
        
        // Filter by criteria
        if (criteria.timeControl && invite.gameSettings.timeControl !== criteria.timeControl) {
          return false
        }
        
        if (criteria.variant && invite.gameSettings.variant !== criteria.variant) {
          return false
        }
        
        if (criteria.rated !== undefined && invite.gameSettings.rated !== criteria.rated) {
          return false
        }
        
        return true
      })

    return availableGames
  }

  /**
   * Generate shareable game link
   */
  generateGameLink(inviteCode, baseUrl = 'pears-gambit://') {
    return `${baseUrl}join/${inviteCode}`
  }

  /**
   * Parse game link
   */
  parseGameLink(link) {
    try {
      const url = new URL(link)
      
      if (url.protocol === 'pears-gambit:') {
        const pathParts = url.pathname.split('/')
        
        if (pathParts[1] === 'join' && pathParts[2]) {
          return {
            action: 'join',
            inviteCode: pathParts[2],
            valid: this.isValidInviteCode(pathParts[2])
          }
        }
      }
      
      return { valid: false, error: 'Invalid game link format' }
    } catch (error) {
      return { valid: false, error: 'Malformed game link' }
    }
  }

  /**
   * Log debug messages
   */
  log(...args) {
    if (this.options.debug) {
      console.log('[GameDiscovery]', ...args)
    }
  }

  /**
   * Cleanup and reset
   */
  cleanup() {
    this.log('Cleaning up game discovery...')
    
    // Cancel all pending invites
    for (const [code, invite] of this.pendingInvites) {
      this.cancelInvitation(code)
    }

    // Clear active games
    this.activeGames.clear()

    this.log('Game discovery cleaned up')
  }
}

// Export factory function
export function createGameDiscovery(options = {}) {
  return new GameDiscovery(options)
}