/**
 * Pear's Gambit - Game Lobby UI
 * 
 * UI for creating and joining P2P games
 */

import { createP2PGameSession, P2PUtils } from '../p2p/index.js'

/**
 * Game Lobby Component
 */
export class GameLobby {
  constructor(containerId, options = {}) {
    this.containerId = containerId
    this.container = document.getElementById(containerId)
    if (!this.container) {
      throw new Error(`Container element with id "${containerId}" not found`)
    }

    this.options = {
      debug: options.debug || false,
      ...options
    }

    // State
    this.p2pSession = null
    this.currentInvite = null
    
    // Event handlers
    this.onGameStart = options.onGameStart || (() => {})
    this.onError = options.onError || (() => {})

    this.init()
  }

  /**
   * Initialize the lobby
   */
  init() {
    this.createUI()
    this.bindEvents()
    this.initP2P()
  }

  /**
   * Generate a unique instance identifier
   */
  generateInstanceId() {
    // Use process ID if available, otherwise use timestamp + random
    if (typeof process !== 'undefined' && process.pid) {
      return `Player-${process.pid}`
    }
    
    // Fallback to timestamp + random for browsers/other environments
    const timestamp = Date.now().toString(36)
    const random = Math.random().toString(36).substring(2, 5).toUpperCase()
    return `Player-${random}`
  }

  /**
   * Update the UI to show instance information
   */
  updateInstanceDisplay() {
    const titleElement = document.querySelector('.game-lobby h2')
    if (titleElement && this.instanceId) {
      titleElement.innerHTML = `🍐 Pear's Gambit <small style="font-size: 0.5em; color: #666;">(${this.instanceId})</small>`
    }
  }

  /**
   * Initialize P2P session
   */
  async initP2P() {
    try {
      // Generate instance ID for this session
      this.instanceId = this.generateInstanceId()
      
      this.p2pSession = createP2PGameSession({
        debug: this.options.debug,
        instanceId: this.instanceId
      })
      
      this.log(`P2P session initialized with instance ID: ${this.instanceId}`)
      this.updateInstanceDisplay()
    } catch (error) {
      this.log('Failed to initialize P2P session:', error)
      this.showError('Failed to initialize networking: ' + error.message)
    }
  }

  /**
   * Create the lobby UI
   */
  createUI() {
    this.container.innerHTML = `
      <div class="game-lobby">
        <h2>🍐 Pear's Gambit</h2>
        <p class="subtitle">Peer-to-Peer Chess with AI Assistance</p>
        
        <div class="lobby-section">
          <h3>Create New Game</h3>
          <div class="create-game-form">
            <div class="form-group">
              <label for="player-name">Your Name:</label>
              <input type="text" id="player-name" placeholder="Enter your name" value="Player">
            </div>
            
            <div class="form-group">
              <label for="time-control">Time Control:</label>
              <select id="time-control">
                <option value="none">No time limit</option>
                <option value="blitz">5+0 Blitz</option>
                <option value="rapid">10+0 Rapid</option>
                <option value="classical">30+0 Classical</option>
              </select>
            </div>
            
            <button id="create-game-btn" class="primary-button">Create Game</button>
          </div>
          
          <div id="game-created" class="game-created hidden">
            <h4>🎯 Game Created!</h4>
            <p>Share this invite code with your opponent:</p>
            <div class="invite-code-display">
              <input type="text" id="invite-code" readonly>
              <button id="copy-invite" class="copy-button">📋 Copy</button>
            </div>
            <div class="connection-status">
              <span id="connection-status">Waiting for opponent...</span>
              <div class="loading-spinner"></div>
            </div>
            <button id="cancel-game" class="secondary-button">Cancel Game</button>
          </div>
        </div>

        <div class="lobby-divider">OR</div>

        <div class="lobby-section">
          <h3>Join Existing Game</h3>
          <div class="join-game-form">
            <div class="form-group">
              <label for="join-player-name">Your Name:</label>
              <input type="text" id="join-player-name" placeholder="Enter your name" value="Player">
            </div>
            
            <div class="form-group">
              <label for="invite-code-input">Invite Code:</label>
              <input type="text" id="invite-code-input" placeholder="XXX-XXX" maxlength="7">
              <small>Enter the 6-character invite code from your opponent</small>
            </div>
            
            <button id="join-game-btn" class="primary-button">Join Game</button>
          </div>
          
          <div id="joining-game" class="joining-game hidden">
            <h4>🔄 Joining Game...</h4>
            <div class="connection-status">
              <span id="join-status">Connecting to opponent...</span>
              <div class="loading-spinner"></div>
            </div>
            <button id="cancel-join" class="secondary-button">Cancel</button>
          </div>
        </div>

        <div class="lobby-section">
          <h3>Single Player</h3>
          <p>Practice against the computer or analyze positions</p>
          <button id="single-player-btn" class="secondary-button">Play Solo</button>
        </div>

        <div class="lobby-section" id="saved-games-section">
          <h3>Resume Game</h3>
          <div id="saved-games-list" class="saved-games-list">
            <p class="loading-text">Loading saved games...</p>
          </div>
        </div>
      </div>
    `

    this.addStyles()
    this.loadSavedGames()
  }

  /**
   * Bind event handlers
   */
  bindEvents() {
    // Create game
    document.getElementById('create-game-btn').addEventListener('click', () => {
      this.createGame()
    })

    // Join game
    document.getElementById('join-game-btn').addEventListener('click', () => {
      this.joinGame()
    })

    // Single player
    document.getElementById('single-player-btn').addEventListener('click', () => {
      this.startSinglePlayer()
    })

    // Cancel actions
    document.getElementById('cancel-game').addEventListener('click', () => {
      this.cancelGame()
    })

    document.getElementById('cancel-join').addEventListener('click', () => {
      this.cancelJoin()
    })

    // Copy invite code
    document.getElementById('copy-invite').addEventListener('click', () => {
      this.copyInviteCode()
    })

    // Auto-format invite code input
    document.getElementById('invite-code-input').addEventListener('input', (e) => {
      this.formatInviteCode(e.target)
    })
  }

  /**
   * Create a new P2P game
   */
  async createGame() {
    try {
      const playerName = document.getElementById('player-name').value || 'Anonymous'
      const timeControl = document.getElementById('time-control').value

      this.log('Creating game with config:', { playerName, timeControl })

      // Show creating state
      this.showCreatingGame()

      // Create chess game instance (will be passed to P2P session)
      const { createGame } = await import('../chess/index.js')
      const chessGame = createGame({
        players: { white: playerName, black: 'Waiting for opponent...' }
      })
      chessGame.start()

      // Create P2P game
      const result = await this.p2pSession.createGame(chessGame, {
        playerName,
        timeControl: this.parseTimeControl(timeControl)
      })

      if (!result.success) {
        throw new Error(result.error)
      }

      this.currentInvite = result.invitation
      this.log('Game created successfully:', result)

      // Show invite code
      this.showGameCreated(result.invitation.inviteCode)

      // Set up game state monitoring
      this.p2pSession.gameSync.onGameStateChange = (state, status) => {
        this.updateConnectionStatus(state, status)
        
        if (state === 'active') {
          this.startGame(chessGame, result.gameSession)
        }
      }

    } catch (error) {
      this.log('Failed to create game:', error)
      this.showError('Failed to create game: ' + error.message)
      this.resetUI()
    }
  }

  /**
   * Join an existing P2P game
   */
  async joinGame() {
    try {
      const playerName = document.getElementById('join-player-name').value || 'Anonymous'
      const inviteCode = document.getElementById('invite-code-input').value.toUpperCase()

      if (!P2PUtils.isValidInviteCode(inviteCode)) {
        throw new Error('Please enter a valid invite code (format: XXX-XXX)')
      }

      this.log('Joining game with code:', inviteCode)

      // Show joining state
      this.showJoiningGame()

      // Create chess game instance
      const { createGame } = await import('../chess/index.js')
      const chessGame = createGame({
        players: { white: 'Opponent', black: playerName }
      })
      chessGame.start()

      // Join P2P game
      const result = await this.p2pSession.joinGame(inviteCode, chessGame, {
        playerName
      })

      if (!result.success) {
        throw new Error(result.error)
      }

      this.log('Joined game successfully:', result)

      // Set up game state monitoring
      this.p2pSession.gameSync.onGameStateChange = (state, status) => {
        this.updateJoinStatus(state, status)
        
        if (state === 'active') {
          this.startGame(chessGame, result.gameSession)
        }
      }

    } catch (error) {
      this.log('Failed to join game:', error)
      this.showError('Failed to join game: ' + error.message)
      this.resetUI()
    }
  }

  /**
   * Start single player game
   */
  startSinglePlayer() {
    this.onGameStart({
      mode: 'single-player',
      chessGame: null,
      p2pSession: null
    })
  }

  /**
   * Parse time control setting
   */
  parseTimeControl(timeControl) {
    const controls = {
      'none': null,
      'blitz': { type: 'blitz', minutes: 5, increment: 0 },
      'rapid': { type: 'rapid', minutes: 10, increment: 0 },
      'classical': { type: 'classical', minutes: 30, increment: 0 }
    }
    
    return controls[timeControl] || null
  }

  /**
   * Show creating game state
   */
  showCreatingGame() {
    document.getElementById('create-game-btn').disabled = true
    document.getElementById('create-game-btn').textContent = 'Creating...'
  }

  /**
   * Show game created with invite code
   */
  showGameCreated(inviteCode) {
    document.getElementById('game-created').classList.remove('hidden')
    document.getElementById('invite-code').value = inviteCode
    document.querySelector('.create-game-form').style.display = 'none'
  }

  /**
   * Show joining game state
   */
  showJoiningGame() {
    document.getElementById('joining-game').classList.remove('hidden')
    document.getElementById('join-game-btn').disabled = true
    document.querySelector('.join-game-form').style.display = 'none'
  }

  /**
   * Update connection status for host
   */
  updateConnectionStatus(state, status) {
    const statusElement = document.getElementById('connection-status')
    const message = P2PUtils.formatConnectionStatus(status)
    
    if (statusElement) {
      statusElement.textContent = message
    }

    // Hide spinner when connected
    if (state === 'active') {
      const spinner = document.querySelector('#game-created .loading-spinner')
      if (spinner) {
        spinner.style.display = 'none'
      }
    }
  }

  /**
   * Update join status for guest
   */
  updateJoinStatus(state, status) {
    const statusElement = document.getElementById('join-status')
    const message = P2PUtils.formatConnectionStatus(status)
    
    if (statusElement) {
      statusElement.textContent = message
    }

    // Hide spinner when connected
    if (state === 'active') {
      const spinner = document.querySelector('#joining-game .loading-spinner')
      if (spinner) {
        spinner.style.display = 'none'
      }
    }
  }

  /**
   * Start the actual game
   */
  startGame(chessGame, gameSession) {
    this.log('Starting P2P game:', gameSession)
    
    this.onGameStart({
      mode: 'p2p',
      chessGame,
      gameSession,
      p2pSession: this.p2pSession
    })
  }

  /**
   * Cancel game creation
   */
  async cancelGame() {
    if (this.currentInvite) {
      this.p2pSession.discovery.cancelInvitation(this.currentInvite.inviteCode)
    }
    
    if (this.p2pSession) {
      await this.p2pSession.destroy()
      await this.initP2P()
    }
    
    this.resetUI()
  }

  /**
   * Cancel joining game
   */
  async cancelJoin() {
    if (this.p2pSession) {
      await this.p2pSession.destroy()
      await this.initP2P()
    }
    
    this.resetUI()
  }

  /**
   * Copy invite code to clipboard
   */
  async copyInviteCode() {
    const inviteCode = document.getElementById('invite-code').value
    
    try {
      await navigator.clipboard.writeText(inviteCode)
      
      const button = document.getElementById('copy-invite')
      const originalText = button.textContent
      button.textContent = '✅ Copied!'
      
      setTimeout(() => {
        button.textContent = originalText
      }, 2000)
    } catch (error) {
      this.log('Failed to copy to clipboard:', error)
      // Fallback: select the text
      document.getElementById('invite-code').select()
    }
  }

  /**
   * Format invite code input
   */
  formatInviteCode(input) {
    let value = input.value.toUpperCase().replace(/[^A-F0-9]/g, '')
    
    if (value.length > 3) {
      value = value.substring(0, 3) + '-' + value.substring(3, 6)
    }
    
    input.value = value
  }

  /**
   * Reset UI to initial state
   */
  resetUI() {
    // Hide status sections
    document.getElementById('game-created').classList.add('hidden')
    document.getElementById('joining-game').classList.add('hidden')
    
    // Show forms
    document.querySelector('.create-game-form').style.display = 'block'
    document.querySelector('.join-game-form').style.display = 'block'
    
    // Reset buttons
    document.getElementById('create-game-btn').disabled = false
    document.getElementById('create-game-btn').textContent = 'Create Game'
    document.getElementById('join-game-btn').disabled = false
    
    // Clear inputs
    document.getElementById('invite-code-input').value = ''
    
    // Reset state
    this.currentInvite = null
  }

  /**
   * Show error message
   */
  showError(message) {
    // Simple alert for now - could be enhanced with modal
    alert('Error: ' + message)
  }

  /**
   * Add component styles
   */
  addStyles() {
    const style = document.createElement('style')
    style.textContent = `
      .game-lobby {
        max-width: 600px;
        margin: 0 auto;
        padding: 40px 20px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      
      .game-lobby h2 {
        text-align: center;
        color: #333;
        margin-bottom: 10px;
        font-size: 2.5em;
      }
      
      .subtitle {
        text-align: center;
        color: #666;
        margin-bottom: 40px;
        font-size: 1.1em;
      }
      
      .lobby-section {
        background: white;
        border-radius: 12px;
        padding: 30px;
        margin-bottom: 20px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      }
      
      .lobby-section h3 {
        margin-top: 0;
        color: #333;
        border-bottom: 2px solid #eee;
        padding-bottom: 10px;
      }
      
      .lobby-divider {
        text-align: center;
        color: #999;
        font-weight: bold;
        margin: 30px 0;
        position: relative;
      }
      
      .lobby-divider::before {
        content: '';
        position: absolute;
        top: 50%;
        left: 0;
        right: 0;
        height: 1px;
        background: #ddd;
        z-index: 1;
      }
      
      .lobby-divider::after {
        content: 'OR';
        background: #f5f5f5;
        padding: 0 20px;
        position: relative;
        z-index: 2;
      }
      
      .form-group {
        margin-bottom: 20px;
      }
      
      .form-group label {
        display: block;
        margin-bottom: 5px;
        font-weight: 600;
        color: #333;
      }
      
      .form-group input,
      .form-group select {
        width: 100%;
        padding: 12px;
        border: 2px solid #ddd;
        border-radius: 6px;
        font-size: 16px;
        transition: border-color 0.2s;
      }
      
      .form-group input:focus,
      .form-group select:focus {
        outline: none;
        border-color: #007bff;
      }
      
      .form-group small {
        display: block;
        margin-top: 5px;
        color: #666;
        font-size: 14px;
      }
      
      .primary-button {
        background: #007bff;
        color: white;
        border: none;
        padding: 15px 30px;
        border-radius: 6px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        width: 100%;
        transition: background-color 0.2s;
      }
      
      .primary-button:hover:not(:disabled) {
        background: #0056b3;
      }
      
      .primary-button:disabled {
        background: #ccc;
        cursor: not-allowed;
      }
      
      .secondary-button {
        background: #6c757d;
        color: white;
        border: none;
        padding: 12px 24px;
        border-radius: 6px;
        font-size: 14px;
        cursor: pointer;
        transition: background-color 0.2s;
      }
      
      .secondary-button:hover {
        background: #545b62;
      }
      
      .hidden {
        display: none !important;
      }
      
      .game-created,
      .joining-game {
        text-align: center;
      }
      
      .game-created h4,
      .joining-game h4 {
        color: #28a745;
        margin-bottom: 20px;
      }
      
      .invite-code-display {
        display: flex;
        gap: 10px;
        margin: 20px 0;
      }
      
      .invite-code-display input {
        flex: 1;
        text-align: center;
        font-family: monospace;
        font-size: 18px;
        font-weight: bold;
        letter-spacing: 2px;
        background: #f8f9fa;
      }
      
      .copy-button {
        background: #28a745;
        color: white;
        border: none;
        padding: 12px 16px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        transition: background-color 0.2s;
      }
      
      .copy-button:hover {
        background: #218838;
      }
      
      .connection-status {
        margin: 20px 0;
        padding: 15px;
        background: #f8f9fa;
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
      }
      
      .loading-spinner {
        width: 20px;
        height: 20px;
        border: 2px solid #e3e3e3;
        border-top: 2px solid #007bff;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }
      
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      
      .saved-games-list {
        max-height: 200px;
        overflow-y: auto;
      }
      
      .saved-game-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px;
        margin-bottom: 8px;
        background: #f8f9fa;
        border-radius: 6px;
        transition: all 0.2s;
      }
      
      .saved-game-item:hover {
        background: #e9ecef;
      }
      
      .saved-game-info {
        flex: 1;
      }
      
      .saved-game-players {
        font-weight: 600;
        color: #333;
        margin-bottom: 4px;
      }
      
      .saved-game-details {
        font-size: 12px;
        color: #666;
      }
      
      .saved-game-actions {
        display: flex;
        gap: 8px;
      }
      
      .resume-button {
        background: #28a745;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 4px;
        font-size: 14px;
        cursor: pointer;
        transition: background-color 0.2s;
      }
      
      .resume-button:hover {
        background: #218838;
      }
      
      .delete-button {
        background: #dc3545;
        color: white;
        border: none;
        padding: 8px 12px;
        border-radius: 4px;
        font-size: 14px;
        cursor: pointer;
        transition: background-color 0.2s;
      }
      
      .delete-button:hover {
        background: #c82333;
      }
      
      .no-saved-games,
      .loading-text,
      .error-text {
        text-align: center;
        color: #666;
        font-style: italic;
        padding: 20px;
      }
      
      .error-text {
        color: #dc3545;
      }
      
      @media (max-width: 768px) {
        .game-lobby {
          padding: 20px 10px;
        }
        
        .lobby-section {
          padding: 20px 15px;
        }
        
        .invite-code-display {
          flex-direction: column;
        }
        
        .saved-game-item {
          flex-direction: column;
          align-items: flex-start;
        }
        
        .saved-game-actions {
          margin-top: 8px;
          width: 100%;
        }
        
        .resume-button {
          flex: 1;
        }
      }
    `
    document.head.appendChild(style)
  }

  /**
   * Load and display saved games
   */
  async loadSavedGames() {
    try {
      const savedGames = await this.p2pSession.gameSync.listSavedGames()
      const listContainer = document.getElementById('saved-games-list')
      
      if (!listContainer) return
      
      if (savedGames.length === 0) {
        listContainer.innerHTML = '<p class="no-saved-games">No saved games found</p>'
        return
      }
      
      listContainer.innerHTML = ''
      
      savedGames.forEach((game, index) => {
        const gameItem = document.createElement('div')
        gameItem.className = 'saved-game-item'
        
        const gameInfo = document.createElement('div')
        gameInfo.className = 'saved-game-info'
        
        const players = document.createElement('div')
        players.className = 'saved-game-players'
        players.textContent = `${game.players.white} vs ${game.players.black}`
        
        const details = document.createElement('div')
        details.className = 'saved-game-details'
        const savedDate = new Date(game.savedAt)
        details.textContent = `${game.moveCount} moves · ${savedDate.toLocaleDateString()}`
        
        gameInfo.appendChild(players)
        gameInfo.appendChild(details)
        
        const actions = document.createElement('div')
        actions.className = 'saved-game-actions'
        
        const resumeBtn = document.createElement('button')
        resumeBtn.className = 'resume-button'
        resumeBtn.textContent = 'Resume'
        resumeBtn.onclick = () => this.resumeGame(game.gameId)
        
        const deleteBtn = document.createElement('button')
        deleteBtn.className = 'delete-button'
        deleteBtn.textContent = '🗑️'
        deleteBtn.title = 'Delete saved game'
        deleteBtn.onclick = () => this.deleteSavedGame(game.gameId)
        
        actions.appendChild(resumeBtn)
        actions.appendChild(deleteBtn)
        
        gameItem.appendChild(gameInfo)
        gameItem.appendChild(actions)
        
        listContainer.appendChild(gameItem)
      })
    } catch (error) {
      this.log('Failed to load saved games:', error)
      const listContainer = document.getElementById('saved-games-list')
      if (listContainer) {
        listContainer.innerHTML = '<p class="error-text">Failed to load saved games</p>'
      }
    }
  }

  /**
   * Resume a saved game
   */
  async resumeGame(gameId) {
    try {
      this.log('Resuming game:', gameId)
      
      // Show loading state
      const section = document.getElementById('saved-games-section')
      if (section) {
        section.style.opacity = '0.5'
        section.style.pointerEvents = 'none'
      }
      
      // Restore game state
      const result = await this.p2pSession.gameSync.restoreGameState(gameId)
      if (!result.success) {
        throw new Error(result.error)
      }
      
      // Create chess game instance with restored state
      const { createGame } = await import('../chess/index.js')
      const chessGame = createGame({
        players: result.gameState.players
      })
      
      // Restore game from FEN
      chessGame.loadFromFen(result.gameState.fen)
      
      // Restore move history
      if (result.gameState.moveHistory) {
        chessGame.moveHistory = result.gameState.moveHistory
      }
      
      // Set game state
      chessGame.start()
      
      // Rejoin P2P network with saved connection info
      const gameKey = Buffer.from(result.connectionInfo.gameKey, 'hex')
      await this.p2pSession.gameSync.swarmManager.joinTopic(gameKey, {
        client: true,
        server: result.connectionInfo.isHost
      })
      
      // Start the game
      const gameSession = {
        gameId: gameId,
        playerColor: result.gameState.playerColor,
        isHost: result.gameState.isHost
      }
      
      this.onGameStart({
        mode: 'p2p',
        chessGame,
        gameSession,
        p2pSession: this.p2pSession,
        resumed: true
      })
      
    } catch (error) {
      this.log('Failed to resume game:', error)
      this.showError('Failed to resume game: ' + error.message)
      
      // Reset UI state
      const section = document.getElementById('saved-games-section')
      if (section) {
        section.style.opacity = '1'
        section.style.pointerEvents = 'auto'
      }
    }
  }

  /**
   * Delete a saved game
   */
  async deleteSavedGame(gameId) {
    try {
      const confirmed = confirm('Are you sure you want to delete this saved game?')
      if (!confirmed) return
      
      await this.p2pSession.gameSync.persistence.deleteGame(gameId)
      this.log('Deleted saved game:', gameId)
      
      // Reload the list
      await this.loadSavedGames()
    } catch (error) {
      this.log('Failed to delete saved game:', error)
      this.showError('Failed to delete saved game')
    }
  }

  /**
   * Log debug messages
   */
  log(...args) {
    if (this.options.debug) {
      console.log('[GameLobby]', ...args)
    }
  }

  /**
   * Destroy the component
   */
  async destroy() {
    if (this.p2pSession) {
      await this.p2pSession.destroy()
    }
    this.container.innerHTML = ''
  }
}