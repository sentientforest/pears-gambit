/**
 * Pear's Gambit - Game View Component
 * 
 * Main game interface that coordinates the chess board and game logic
 */

import { ChessBoardComponent } from './components/chess-board.js'
import { ChessClockComponent } from './components/chess-clock.js'
import { createGame, chessBoard } from '../chess/index.js'
import { soundManager } from './sound-manager.js'

/**
 * Game View Component
 * Manages the complete chess game interface
 */
export class GameView {
  constructor(containerId, options = {}) {
    this.containerId = containerId
    this.container = document.getElementById(containerId)
    if (!this.container) {
      throw new Error(`Container element with id "${containerId}" not found`)
    }

    this.options = {
      showControls: options.showControls !== false,
      showMoveHistory: options.showMoveHistory !== false,
      showGameInfo: options.showGameInfo !== false,
      mode: options.mode || 'single-player', // single-player, p2p, spectator
      spectating: options.spectating || false,
      ...options
    }

    // Game state
    this.game = options.chessGame || null
    this.chessBoard = null
    this.chessClock = null
    this.gameState = 'waiting' // waiting, active, paused, finished
    this.timeControl = options.timeControl || null
    this.lastClockSave = null

    // P2P state
    this.p2pSession = options.p2pSession || null
    this.gameSession = options.gameSession || null
    this.playerColor = options.gameSession?.playerColor || null
    this.isHost = options.gameSession?.isHost || false

    // UI elements
    this.boardContainer = null
    this.controlsContainer = null
    this.moveHistoryContainer = null
    this.gameInfoContainer = null
    this.clockContainer = null

    this.init()
  }

  /**
   * Initialize the game view
   */
  init() {
    console.log('[GameView] Initializing game view for player:', this.playerColor)
    this.createLayout()
    this.createChessBoard()
    this.createChessClock()
    this.createControls()
    this.createMoveHistory()
    this.createGameInfo()
    this.bindEvents()
    
    // Start a new game
    this.newGame()
    console.log('[GameView] Game view initialized')
  }

  /**
   * Create the layout structure
   */
  createLayout() {
    this.container.innerHTML = ''
    this.container.className = 'game-view'

    const layout = document.createElement('div')
    layout.className = 'game-layout'

    // Main game area
    const gameArea = document.createElement('div')
    gameArea.className = 'game-area'

    // Board container
    this.boardContainer = document.createElement('div')
    this.boardContainer.id = 'chess-board-container'
    this.boardContainer.className = 'board-container'

    // Clock container
    this.clockContainer = document.createElement('div')
    this.clockContainer.id = 'chess-clock-container'
    this.clockContainer.className = 'clock-container'

    gameArea.appendChild(this.boardContainer)
    gameArea.appendChild(this.clockContainer)

    // Side panel
    const sidePanel = document.createElement('div')
    sidePanel.className = 'side-panel'

    if (this.options.showGameInfo) {
      this.gameInfoContainer = document.createElement('div')
      this.gameInfoContainer.className = 'game-info'
      sidePanel.appendChild(this.gameInfoContainer)
    }

    if (this.options.showControls) {
      this.controlsContainer = document.createElement('div')
      this.controlsContainer.className = 'game-controls'
      sidePanel.appendChild(this.controlsContainer)
    }

    if (this.options.showMoveHistory) {
      this.moveHistoryContainer = document.createElement('div')
      this.moveHistoryContainer.className = 'move-history'
      sidePanel.appendChild(this.moveHistoryContainer)
    }

    layout.appendChild(gameArea)
    layout.appendChild(sidePanel)
    this.container.appendChild(layout)

    this.addStyles()
  }

  /**
   * Create the chess board component
   */
  createChessBoard() {
    console.log('[GameView] Creating chess board component')
    this.chessBoard = new ChessBoardComponent('chess-board-container', {
      size: 480,
      coordinates: true,
      draggable: !this.options.spectating, // Disable dragging for spectators
      onMove: this.handleMove.bind(this),
      onSquareClick: this.handleSquareClick.bind(this),
      onPieceSelect: this.handlePieceSelect.bind(this)
    })
    console.log('[GameView] Chess board component created:', this.chessBoard)
  }

  /**
   * Create chess clock component
   */
  createChessClock() {
    console.log('[GameView] Creating chess clock component')
    
    // Determine if clock should be enabled
    const clockEnabled = this.timeControl && this.timeControl.type !== 'none'
    
    this.chessClock = new ChessClockComponent('chess-clock-container', {
      enabled: clockEnabled,
      initialTime: this.timeControl?.minutes * 60000 || 300000, // Convert minutes to milliseconds
      increment: this.timeControl?.increment * 1000 || 0, // Convert seconds to milliseconds
      onTimeUpdate: this.handleTimeUpdate.bind(this),
      onTimeExpired: this.handleTimeExpired.bind(this),
      onClockClick: this.handleClockClick.bind(this)
    })
    
    console.log('[GameView] Chess clock component created:', this.chessClock)
  }

  /**
   * Create game controls
   */
  createControls() {
    if (!this.controlsContainer) return

    // Different controls based on game mode
    let controls
    if (this.options.spectating) {
      // Spectator controls - limited options
      controls = [
        { id: 'leave-spectate', text: 'Leave', onClick: () => this.leaveSpectatorMode() },
        { id: 'flip-board', text: 'Flip Board', onClick: () => this.flipBoard() },
        { id: 'toggle-sound', text: soundManager.options.enabled ? '🔊 Sound' : '🔇 Sound', onClick: () => this.toggleSound() }
      ]
    } else if (this.p2pSession && this.gameState === 'active') {
      // P2P game controls - replace New Game with Resign
      controls = [
        { id: 'resign-game', text: 'Resign', onClick: () => this.resignGame(), className: 'resign-button' },
        { id: 'flip-board', text: 'Flip Board', onClick: () => this.flipBoard() },
        { id: 'export-pgn', text: 'Export PGN', onClick: () => this.exportPgn() },
        { id: 'toggle-sound', text: soundManager.options.enabled ? '🔊 Sound' : '🔇 Sound', onClick: () => this.toggleSound() }
      ]
    } else {
      // Single player or inactive game controls
      controls = [
        { id: 'new-game', text: 'New Game', onClick: () => this.newGame() },
        { id: 'flip-board', text: 'Flip Board', onClick: () => this.flipBoard() },
        { id: 'export-pgn', text: 'Export PGN', onClick: () => this.exportPgn() },
        { id: 'toggle-sound', text: soundManager.options.enabled ? '🔊 Sound' : '🔇 Sound', onClick: () => this.toggleSound() }
      ]
    }

    controls.forEach(control => {
      const button = document.createElement('button')
      button.id = control.id
      button.textContent = control.text
      button.className = control.className || 'control-button'
      button.addEventListener('click', control.onClick)
      this.controlsContainer.appendChild(button)
    })
  }

  /**
   * Create move history display
   */
  createMoveHistory() {
    if (!this.moveHistoryContainer) return

    const title = document.createElement('h3')
    title.textContent = 'Move History'
    this.moveHistoryContainer.appendChild(title)

    const historyList = document.createElement('div')
    historyList.id = 'move-history-list'
    historyList.className = 'move-list'
    this.moveHistoryContainer.appendChild(historyList)
  }

  /**
   * Create invite code display for P2P games
   */
  createInviteCodeDisplay() {
    // Try to get the invite code from the current session
    const inviteCode = this.getCurrentInviteCode()
    
    if (!inviteCode) return ''
    
    return `
      <div class="invite-code-info">
        <div class="invite-label">Spectator Code:</div>
        <div class="invite-code-display-small">
          <span id="current-invite-code">${inviteCode}</span>
          <button id="copy-spectator-code" class="copy-button-small" title="Copy spectator code">📋</button>
        </div>
        <small>Share this code with spectators</small>
      </div>
    `
  }

  /**
   * Get current invite code from P2P session
   */
  getCurrentInviteCode() {
    // Try to get invite code from various sources
    if (this.gameSession && this.gameSession.inviteCode) {
      return this.gameSession.inviteCode
    }
    
    // Check if we have it stored in the P2P session
    if (this.p2pSession && this.p2pSession.currentInvite) {
      return this.p2pSession.currentInvite.inviteCode
    }
    
    return null
  }

  /**
   * Create game information display
   */
  createGameInfo() {
    if (!this.gameInfoContainer) return

    this.gameInfoContainer.innerHTML = `
      <h3>Game Information</h3>
      ${this.options.spectating ? '<div class="spectator-badge">👁️ SPECTATING</div>' : ''}
      ${this.p2pSession && !this.options.spectating ? this.createInviteCodeDisplay() : ''}
      <div class="info-row">
        <span class="label">Status:</span>
        <span id="game-status" class="value">Waiting</span>
      </div>
      <div class="info-row">
        <span class="label">Turn:</span>
        <span id="current-turn" class="value">White</span>
      </div>
      <div class="info-row">
        <span class="label">Moves:</span>
        <span id="move-count" class="value">0</span>
      </div>
      <div class="info-row">
        <span class="label">White:</span>
        <span id="white-player" class="value">Human</span>
      </div>
      <div class="info-row">
        <span class="label">Black:</span>
        <span id="black-player" class="value">Human</span>
      </div>
      <div class="captured-pieces-section">
        <div class="captured-pieces white-captured">
          <span class="captured-label">White captured:</span>
          <span id="white-captured" class="captured-pieces-list"></span>
        </div>
        <div class="captured-pieces black-captured">
          <span class="captured-label">Black captured:</span>
          <span id="black-captured" class="captured-pieces-list"></span>
        </div>
      </div>
    `
  }

  /**
   * Bind event handlers
   */
  bindEvents() {
    // Window resize
    window.addEventListener('resize', this.handleResize.bind(this))
    
    // Bind copy spectator code button if it exists
    setTimeout(() => {
      const copyBtn = document.getElementById('copy-spectator-code')
      if (copyBtn) {
        copyBtn.addEventListener('click', () => this.copySpectatorCode())
      }
    }, 100) // Small delay to ensure DOM is ready
  }

  /**
   * Copy spectator code to clipboard
   */
  async copySpectatorCode() {
    const inviteCode = document.getElementById('current-invite-code')?.textContent
    
    if (!inviteCode) return
    
    try {
      await navigator.clipboard.writeText(inviteCode)
      
      const button = document.getElementById('copy-spectator-code')
      if (button) {
        const originalText = button.textContent
        button.textContent = '✅'
        
        setTimeout(() => {
          button.textContent = originalText
        }, 2000)
      }
      
      console.log('Spectator code copied to clipboard:', inviteCode)
    } catch (error) {
      console.error('Failed to copy spectator code:', error)
      
      // Fallback: select the text
      const codeElement = document.getElementById('current-invite-code')
      if (codeElement) {
        const range = document.createRange()
        range.selectNode(codeElement)
        window.getSelection().removeAllRanges()
        window.getSelection().addRange(range)
      }
    }
  }

  /**
   * Restore a saved game
   */
  async restoreGame(savedGameState) {
    console.log('Restoring saved game:', savedGameState)
    
    // Restore the chess game state
    if (this.game) {
      // Apply move history to restore board state
      if (savedGameState.moveHistory && savedGameState.moveHistory.length > 0) {
        for (const move of savedGameState.moveHistory) {
          const chessMove = {
            from: move.from,
            to: move.to
          }
          if (move.promotion) {
            chessMove.promotion = move.promotion
          }
          
          const result = this.game.makeMove(chessMove)
          if (!result.success) {
            console.error('Failed to restore move:', move, result.error)
            break
          }
        }
      }
    }
    
    // Restore clock state if available
    if (savedGameState.clockState && this.chessClock && this.chessClock.options.enabled) {
      console.log('Restoring clock state:', savedGameState.clockState)
      this.chessClock.setTimeState(savedGameState.clockState)
    }
    
    // Update the display
    this.updateDisplay()
    
    // Force update the board with the current position
    const boardState = chessBoard.parseBoardArray(this.game.getBoard())
    this.chessBoard.updateBoard(boardState)
    
    this.gameState = 'active'
    console.log('Game restored successfully')
  }

  /**
   * Start a new game
   */
  newGame() {
    // Skip confirmation for spectator mode
    if (!this.options.spectating) {
      // For solo games, show confirmation if there's an existing game
      if (!this.p2pSession && this.game && this.game.moveHistory && this.game.moveHistory.length > 0) {
        const confirmed = confirm('The current board state will be lost if you start a new game. Do you wish to proceed?')
        if (!confirmed) {
          return
        }
      }
    }

    // Create new game (solo, P2P, or spectator)
    if (this.options.spectating) {
      // Spectator mode - game is already provided from lobby
      if (this.game) {
        this.game.onMove = this.onGameMove.bind(this)
        this.game.onGameEnd = this.onGameEnd.bind(this)
        this.game.onCheck = this.onCheck.bind(this)
      }
    } else if (!this.p2pSession) {
      // Solo game - always create fresh game
      this.game = createGame({
        players: {
          white: 'Human Player',
          black: 'Human Player'
        },
        onMove: this.onGameMove.bind(this),
        onGameEnd: this.onGameEnd.bind(this),
        onCheck: this.onCheck.bind(this)
      })
      this.game.start()
    } else {
      // P2P game - set up event handlers on existing game
      if (this.game) {
        this.game.onMove = this.onGameMove.bind(this)
        this.game.onGameEnd = this.onGameEnd.bind(this)
        this.game.onCheck = this.onCheck.bind(this)
      }
    }

    // Reset board state and update display
    this.chessBoard.setGameInstance(this.game)
    this.chessBoard.reset() // Clear the board visual state
    
    // Force update the board with the initial position
    const initialBoard = chessBoard.parseBoardArray(this.game.getBoard())
    this.chessBoard.updateBoard(initialBoard)
    this.updateDisplay()
    
    // Set up P2P event handlers if in P2P mode
    if (this.p2pSession) {
      this.setupP2PHandlers()
    }
    
    this.gameState = 'active'
    console.log('Game started:', this.game.getGameInfo())
    
    // Play game start sound
    soundManager.play('gameStart')
    
    // Start the chess clock if enabled
    if (this.chessClock && this.chessClock.options.enabled) {
      this.chessClock.reset()
      this.chessClock.start()
    }
    
    // Flip board for black player in P2P mode
    if (this.playerColor === 'black') {
      this.chessBoard.flip()
    }
    
    // Recreate controls with appropriate buttons for the current game state
    this.controlsContainer.innerHTML = ''
    this.createControls()
  }

  /**
   * Set up P2P event handlers
   */
  setupP2PHandlers() {
    if (!this.p2pSession) return

    console.log('Setting up P2P event handlers')
    
    // Handle remote moves
    this.p2pSession.gameSync.onMoveReceived = (move) => {
      this.handleRemoteMove(move)
    }

    // Handle connection changes
    this.p2pSession.gameSync.onConnectionChange = (peerId, status) => {
      this.updateConnectionStatus(peerId, status)
    }

    // Handle game state changes
    this.p2pSession.gameSync.onGameStateChange = (state, status) => {
      this.handleGameStateChange(state, status)
    }

    // Handle errors
    this.p2pSession.gameSync.onError = (error) => {
      console.error('P2P error:', error)
      this.showError('Network error: ' + error.message)
    }

    // Handle game end from opponent
    this.p2pSession.gameSync.onGameEnd = (result) => {
      this.handleOpponentGameEnd(result)
    }
  }

  /**
   * Send move to opponent through P2P network
   */
  async sendMoveToOpponent(move) {
    try {
      console.log('Sending move to opponent:', move)
      
      // Validate our own move before sending
      if (!this.validateOutgoingMove(move)) {
        console.error('Attempted to send invalid move:', move)
        this.showError('Internal error: Invalid move generated')
        return
      }
      
      // Check if P2P is ready
      if (!this.p2pSession.gameSync.isReadyForMoves()) {
        console.warn('P2P not ready for moves yet, move not sent')
        this.showError('Waiting for connection to stabilize...')
        return
      }
      
      // Get current clock state to send with move
      const clockState = this.chessClock && this.chessClock.options.enabled ? 
        this.chessClock.getTimeState() : null
      
      await this.p2pSession.gameSync.sendMove(move, clockState)
      console.log('Move sent successfully')
    } catch (error) {
      console.error('Failed to send move:', error)
      if (error.message.includes('not active')) {
        this.showError('Game connection not ready yet. Please wait...')
      } else {
        this.showError('Failed to send move to opponent: ' + error.message)
      }
    }
  }

  /**
   * Validate outgoing move before sending
   */
  validateOutgoingMove(move) {
    // Ensure all required fields are present
    if (!move.from || !move.to || !move.player || !move.piece) {
      console.error('Outgoing move missing required fields')
      return false
    }
    
    // Ensure player color matches our assigned color
    if (move.player !== this.playerColor) {
      console.error('Outgoing move has wrong player color')
      return false
    }
    
    // Ensure we have valid FEN and SAN
    if (!move.fen || !move.san) {
      console.error('Outgoing move missing FEN or SAN')
      return false
    }
    
    return true
  }

  /**
   * Handle move received from opponent
   */
  handleRemoteMove(move, clockState = null) {
    console.log('Received remote move:', move, 'clockState:', clockState)
    
    // Enhanced validation
    if (!this.validateRemoteMove(move)) {
      console.error('Invalid remote move received:', move)
      this.showError('Invalid move received from opponent')
      this.handleSyncError()
      return
    }
    
    // Validate it's the opponent's turn
    if (move.player === this.playerColor) {
      console.log('Ignoring our own move')
      return
    }
    
    // Validate turn order
    const expectedTurn = this.game.getTurn()
    const opponentColor = this.playerColor === 'white' ? 'black' : 'white'
    if (expectedTurn !== opponentColor) {
      console.error('Turn order mismatch - expected:', expectedTurn, 'got move from:', opponentColor)
      this.showError('Turn order synchronization error')
      this.handleSyncError()
      return
    }
    
    // Extract just the fields needed for makeMove
    const chessMove = {
      from: move.from,
      to: move.to
    }
    
    // Add promotion if present
    if (move.promotion) {
      chessMove.promotion = move.promotion
    }
    
    // Apply the move to our local game
    const result = this.game.makeMove(chessMove)
    
    if (result.success) {
      console.log('Remote move applied successfully:', result)
      
      // Verify the resulting FEN matches what was sent
      if (move.fen && result.move.fen !== move.fen) {
        console.warn('FEN mismatch after move - local:', result.move.fen, 'remote:', move.fen)
        // Continue anyway but log the discrepancy
      }
      
      // Synchronize clock state from opponent if provided
      if (clockState && this.chessClock && this.chessClock.options.enabled) {
        console.log('Synchronizing clock state from opponent:', clockState)
        this.chessClock.setTimeState(clockState)
      }
      
      this.updateDisplay()
      
      // Force board update
      const boardState = chessBoard.parseBoardArray(this.game.getBoard())
      this.chessBoard.updateBoard(boardState)
      
      // Highlight the move
      if (move.from && move.to) {
        this.chessBoard.highlightLastMove(move.from, move.to)
      }
    } else {
      console.error('Failed to apply remote move:', result.error)
      this.showError('Sync error: Failed to apply opponent move - ' + result.error)
      this.handleSyncError()
    }
  }

  /**
   * Update connection status display
   */
  updateConnectionStatus(peerId, status) {
    console.log(`Connection ${status}:`, peerId)
    
    // Update game info to show connection status
    if (this.gameInfoContainer) {
      const statusElement = document.getElementById('game-status')
      if (statusElement) {
        if (status === 'connected') {
          statusElement.textContent = 'Connected'
          statusElement.style.color = '#28a745'
        } else if (status === 'disconnected') {
          statusElement.textContent = 'Disconnected'
          statusElement.style.color = '#dc3545'
        }
      }
    }
  }

  /**
   * Handle P2P game state changes
   */
  handleGameStateChange(state, status) {
    console.log('P2P game state changed:', state, status)
    
    // Update UI based on P2P state
    switch (state) {
      case 'waiting':
        this.updateGameStatus('Waiting for opponent...')
        break
      case 'connecting':
        this.updateGameStatus('Connecting...')
        break
      case 'syncing':
        this.updateGameStatus('Synchronizing...')
        break
      case 'active':
        this.updateGameStatus('Active')
        this.gameState = 'active'
        break
      case 'finished':
        this.updateGameStatus('Game finished')
        this.gameState = 'finished'
        break
    }
  }

  /**
   * Update game status display
   */
  updateGameStatus(statusText) {
    const statusElement = document.getElementById('game-status')
    if (statusElement) {
      statusElement.textContent = statusText
    }
  }

  /**
   * Handle move from chess board
   */
  handleMove(move) {
    console.log('handleMove called:', move, 'gameState:', this.gameState, 'turn:', this.game.getTurn(), 'playerColor:', this.playerColor)
    
    // Block moves in spectator mode
    if (this.options.spectating) {
      console.log('Cannot make moves in spectator mode')
      soundManager.play('invalid')
      return
    }
    
    if (this.gameState !== 'active') {
      console.log('Game not active, ignoring move')
      return
    }
    
    // In P2P mode, check if it's our turn
    if (this.p2pSession && this.playerColor !== this.game.getTurn()) {
      console.log('Not player turn:', this.playerColor, '!==', this.game.getTurn())
      this.showError("It's not your turn")
      return
    }
    
    const result = this.game.makeMove(move)
    
    if (result.success) {
      console.log('Move successful:', result.move)
      
      // Send move through P2P network if in P2P mode
      if (this.p2pSession && this.gameSession) {
        this.sendMoveToOpponent(result.move)
      }
      
      this.updateDisplay()
    } else {
      console.log('Move failed:', result.error)
      this.showError(result.error)
    }
  }

  /**
   * Handle square click
   */
  handleSquareClick(square) {
    console.log('Square clicked:', square, 'gameState:', this.gameState, 'piece:', this.chessBoard.boardState[square])
  }

  /**
   * Handle piece selection
   */
  handlePieceSelect(square, piece) {
    console.log('Piece selected:', square, piece)
  }

  /**
   * Handle game move event
   */
  onGameMove(move) {
    console.log('Game move event:', move)
    
    // Play move sound
    soundManager.playMove(move)
    
    this.updateMoveHistory()
    
    // Switch clock turn after move
    if (this.chessClock && this.gameState === 'active') {
      this.chessClock.switchTurn()
    }
    
    // Highlight last move
    if (move.from && move.to) {
      this.chessBoard.highlightLastMove(move.from, move.to)
    }
  }

  /**
   * Handle clock time update
   */
  handleTimeUpdate(timeState) {
    // Update time display in game info if needed
    // Could add time warnings, etc.
    
    // Periodically save game state with clock (every 30 seconds)
    if (this.p2pSession && this.gameState === 'active') {
      const now = Date.now()
      if (!this.lastClockSave || now - this.lastClockSave > 30000) {
        this.lastClockSave = now
        this.p2pSession.gameSync.saveGameState(timeState).catch(error => {
          console.error('Failed to save clock state:', error)
        })
      }
    }
  }

  /**
   * Handle clock time expiration
   */
  handleTimeExpired(player) {
    console.log(`Time expired for ${player}`)
    
    // Play timeout sound
    soundManager.play('timeout')
    
    // End game due to time expiration
    const winner = player === 'white' ? 'black' : 'white'
    const result = {
      result: 'timeout',
      winner: winner,
      loser: player,
      method: 'time_expiration',
      timestamp: Date.now()
    }
    
    this.gameState = 'finished'
    
    // Stop the clock
    if (this.chessClock) {
      this.chessClock.stop()
    }
    
    // Send timeout to opponent if P2P
    if (this.p2pSession && this.gameSession) {
      this.sendGameEndToOpponent(result)
    }
    
    this.showGameResult(result)
    this.updateDisplay()
  }

  /**
   * Handle clock click (for manual clock controls)
   */
  handleClockClick(player) {
    // Could implement manual clock switching for casual games
    console.log(`Clock clicked for ${player}`)
  }

  /**
   * Handle game end event
   */
  onGameEnd(result) {
    console.log('Game ended:', result)
    this.gameState = 'finished'
    
    // Play game end sound
    soundManager.play('gameEnd')
    
    // Notify P2P session about game end
    if (this.p2pSession && this.gameSession) {
      this.sendGameEndToOpponent(result)
    }
    
    this.showGameResult(result)
    this.updateDisplay()
  }

  /**
   * Send game end notification to opponent
   */
  async sendGameEndToOpponent(result) {
    try {
      if (this.p2pSession.gameSync.isReadyForMoves()) {
        // Get final clock state
        const clockState = this.chessClock && this.chessClock.options.enabled ? 
          this.chessClock.getTimeState() : null
        
        // Send game end as a special message
        const gameEndMessage = {
          type: 'game_end',
          result: result,
          gameId: this.gameSession.gameId,
          clockState: clockState,
          timestamp: Date.now()
        }
        
        // Send via P2P sync
        await this.p2pSession.gameSync.swarmManager.broadcast(gameEndMessage)
        console.log('Game end notification sent to opponent')
        
        // Save final game state with clock
        if (this.p2pSession.gameSync) {
          await this.p2pSession.gameSync.saveGameState(clockState)
        }
      }
    } catch (error) {
      console.error('Failed to send game end notification:', error)
    }
  }

  /**
   * Handle check event
   */
  onCheck(move) {
    console.log('Check detected:', move)
    
    // Play check sound
    soundManager.play('check')
    
    // Find king square and highlight it
    const currentBoard = chessBoard.parseBoardArray(this.game.getBoard())
    const kingSquare = this.findKingSquare(currentBoard, this.game.getTurn())
    
    if (kingSquare) {
      this.chessBoard.showCheck(kingSquare)
    }
  }

  /**
   * Find king square for given color
   */
  findKingSquare(boardState, color) {
    for (const [square, piece] of Object.entries(boardState)) {
      if (piece && piece.type === 'k' && piece.color === (color === 'white' ? 'w' : 'b')) {
        return square
      }
    }
    return null
  }

  /**
   * Update the display
   */
  updateDisplay() {
    if (!this.game) return

    // Update board
    const boardState = chessBoard.parseBoardArray(this.game.getBoard())
    this.chessBoard.updateBoard(boardState)

    // Update game info
    this.updateGameInfo()
    this.updateMoveHistory()
  }

  /**
   * Update game information display
   */
  updateGameInfo() {
    if (!this.gameInfoContainer) return

    const gameInfo = this.game.getGameInfo()
    
    const elements = {
      'game-status': this.getStatusText(gameInfo),
      'current-turn': gameInfo.currentTurn === 'white' ? 'White' : 'Black',
      'move-count': gameInfo.moveCount,
      'white-player': this.getPlayerName('white', gameInfo),
      'black-player': this.getPlayerName('black', gameInfo)
    }

    for (const [id, value] of Object.entries(elements)) {
      const element = document.getElementById(id)
      if (element) {
        element.textContent = value
        
        // Highlight current player in P2P mode
        if (id.includes('player') && this.p2pSession) {
          const isCurrentPlayer = (id === 'white-player' && this.playerColor === 'white') ||
                                 (id === 'black-player' && this.playerColor === 'black')
          element.style.fontWeight = isCurrentPlayer ? 'bold' : 'normal'
          element.style.color = isCurrentPlayer ? '#007bff' : '#333'
        }
      }
    }
    
    // Update captured pieces
    this.updateCapturedPieces()
  }

  /**
   * Update captured pieces display
   */
  updateCapturedPieces() {
    const whiteCaptured = []
    const blackCaptured = []
    
    // Count captured pieces from move history
    this.game.moveHistory.forEach(move => {
      if (move.captured) {
        const pieceSymbol = chessBoard.getPieceSymbol(move.captured, move.player === 'white' ? 'b' : 'w')
        if (move.player === 'white') {
          blackCaptured.push(pieceSymbol)
        } else {
          whiteCaptured.push(pieceSymbol)
        }
      }
    })
    
    // Update display
    const whiteCapturedElement = document.getElementById('white-captured')
    const blackCapturedElement = document.getElementById('black-captured')
    
    if (whiteCapturedElement) {
      whiteCapturedElement.textContent = whiteCaptured.join(' ') || 'None'
    }
    
    if (blackCapturedElement) {
      blackCapturedElement.textContent = blackCaptured.join(' ') || 'None'
    }
  }

  /**
   * Get player name for display
   */
  getPlayerName(color, gameInfo) {
    if (this.p2pSession) {
      if (color === this.playerColor) {
        return 'You'
      } else {
        return gameInfo.players[color] || 'Opponent'
      }
    }
    return gameInfo.players[color] || 'Human'
  }

  /**
   * Get status text for display
   */
  getStatusText(gameInfo) {
    if (gameInfo.isGameOver && gameInfo.result) {
      switch (gameInfo.result.result) {
        case 'checkmate':
          return `Checkmate - ${gameInfo.result.winner} wins`
        case 'resignation':
          return `Resignation - ${gameInfo.result.winner} wins`
        case 'stalemate':
          return 'Stalemate - Draw'
        case 'draw':
          return 'Draw'
        case 'threefold_repetition':
          return 'Draw by repetition'
        case 'insufficient_material':
          return 'Draw - Insufficient material'
        case 'timeout':
          return `Time out - ${gameInfo.result.winner} wins`
        default:
          return 'Game Over'
      }
    }
    
    return this.gameState === 'active' ? 'Active' : 'Waiting'
  }

  /**
   * Update move history display
   */
  updateMoveHistory() {
    if (!this.moveHistoryContainer) return

    const historyList = document.getElementById('move-history-list')
    if (!historyList) return

    historyList.innerHTML = ''

    const moves = this.game.moveHistory
    
    // Add header with column labels
    if (moves.length > 0) {
      const headerRow = document.createElement('div')
      headerRow.className = 'move-header-row'
      headerRow.innerHTML = '<span class="move-number-header">#</span><span class="move-header">White</span><span class="move-header">Black</span>'
      historyList.appendChild(headerRow)
    }
    
    for (let i = 0; i < moves.length; i += 2) {
      const moveNumber = Math.floor(i / 2) + 1
      const whiteMove = moves[i]
      const blackMove = moves[i + 1]

      const moveRow = document.createElement('div')
      moveRow.className = 'move-row'

      const numberSpan = document.createElement('span')
      numberSpan.className = 'move-number'
      numberSpan.textContent = `${moveNumber}.`

      const whiteSpan = document.createElement('span')
      whiteSpan.className = 'move white-move'
      whiteSpan.textContent = this.formatMoveNotation(whiteMove)
      whiteSpan.title = `Click to view position after ${whiteMove.san}`
      whiteSpan.dataset.moveIndex = i
      whiteSpan.addEventListener('click', () => this.jumpToMove(i))

      moveRow.appendChild(numberSpan)
      moveRow.appendChild(whiteSpan)

      if (blackMove) {
        const blackSpan = document.createElement('span')
        blackSpan.className = 'move black-move'
        blackSpan.textContent = this.formatMoveNotation(blackMove)
        blackSpan.title = `Click to view position after ${blackMove.san}`
        blackSpan.dataset.moveIndex = i + 1
        blackSpan.addEventListener('click', () => this.jumpToMove(i + 1))
        moveRow.appendChild(blackSpan)
      } else {
        // Add empty span for layout consistency
        const emptySpan = document.createElement('span')
        emptySpan.className = 'move black-move'
        moveRow.appendChild(emptySpan)
      }

      // Highlight last move
      if (i === moves.length - 1 || (blackMove && i + 1 === moves.length - 1)) {
        moveRow.classList.add('last-move-row')
      }

      historyList.appendChild(moveRow)
    }

    // Add result if game is over
    if (this.game.isGameOver()) {
      const resultRow = document.createElement('div')
      resultRow.className = 'move-result'
      const gameInfo = this.game.getGameInfo()
      if (gameInfo.result) {
        resultRow.textContent = this.getResultNotation(gameInfo.result)
      }
      historyList.appendChild(resultRow)
    }

    // Scroll to bottom
    historyList.scrollTop = historyList.scrollHeight
  }

  /**
   * Format move notation with symbols
   */
  formatMoveNotation(move) {
    let notation = move.san
    
    // Add check/checkmate symbols if not already present
    if (move.checkmate && !notation.includes('#')) {
      notation += '#'
    } else if (move.check && !notation.includes('+')) {
      notation += '+'
    }
    
    // Add capture symbol for better visibility
    if (move.captured) {
      notation = notation.replace('x', '×')
    }
    
    return notation
  }

  /**
   * Get result notation for display
   */
  getResultNotation(result) {
    switch (result.result) {
      case 'checkmate':
        return result.winner === 'white' ? '1-0' : '0-1'
      case 'stalemate':
      case 'draw':
      case 'threefold_repetition':
      case 'insufficient_material':
        return '½-½'
      case 'resignation':
        return result.winner === 'white' ? '1-0 (Resignation)' : '0-1 (Resignation)'
      case 'timeout':
        return result.winner === 'white' ? '1-0 (Time)' : '0-1 (Time)'
      default:
        return '*'
    }
  }

  /**
   * Jump to a specific move in history (view-only for now)
   */
  jumpToMove(moveIndex) {
    // TODO: Implement position viewer for historical moves
    console.log('View position after move', moveIndex)
    // For now, just highlight the selected move
    const moves = document.querySelectorAll('.move')
    moves.forEach(move => move.classList.remove('selected-move'))
    const selectedMove = document.querySelector(`[data-move-index="${moveIndex}"]`)
    if (selectedMove) {
      selectedMove.classList.add('selected-move')
    }
  }

  /**
   * Resign the game
   */
  resignGame() {
    if (this.gameState !== 'active') {
      console.log('Cannot resign - game not active')
      return
    }

    // Show confirmation dialog
    const confirmed = confirm('Are you sure you want to resign? This will end the game in a loss.')
    if (!confirmed) {
      return
    }

    console.log('Player resigned the game')
    
    // Play resign/game end sound
    soundManager.play('gameEnd')
    
    // Create resignation result
    const resignationResult = {
      result: 'resignation',
      winner: this.playerColor === 'white' ? 'black' : 'white', // Opponent wins
      loser: this.playerColor,
      method: 'resignation',
      timestamp: Date.now()
    }

    // Update local game state
    this.gameState = 'finished'
    
    // Send resignation to opponent if P2P
    if (this.p2pSession && this.gameSession) {
      this.sendResignationToOpponent(resignationResult)
    }
    
    // Show game result
    this.showGameResult(resignationResult)
    this.updateDisplay()
  }

  /**
   * Send resignation notification to opponent
   */
  async sendResignationToOpponent(result) {
    try {
      if (this.p2pSession.gameSync.isReadyForMoves()) {
        // Get final clock state
        const clockState = this.chessClock && this.chessClock.options.enabled ? 
          this.chessClock.getTimeState() : null
        
        const resignationMessage = {
          type: 'game_end',
          result: result,
          gameId: this.gameSession.gameId,
          clockState: clockState,
          timestamp: Date.now()
        }
        
        await this.p2pSession.gameSync.swarmManager.broadcast(resignationMessage)
        console.log('Resignation notification sent to opponent')
        
        // Save final game state with clock
        if (this.p2pSession.gameSync) {
          await this.p2pSession.gameSync.saveGameState(clockState)
        }
      }
    } catch (error) {
      console.error('Failed to send resignation notification:', error)
    }
  }

  /**
   * Flip the board
   */
  flipBoard() {
    this.chessBoard.flip()
  }

  /**
   * Undo last move
   */
  undoMove() {
    if (this.gameState !== 'active') return

    const result = this.game.undoMove()
    if (result.success) {
      this.updateDisplay()
      console.log('Move undone:', result.move)
    } else {
      console.log('Cannot undo:', result.error)
      this.showError(result.error)
    }
  }

  /**
   * Export game as PGN
   */
  exportPgn() {
    if (!this.game) return

    const pgn = this.game.toPgn()
    console.log('PGN export:', pgn)
    
    // Create download link
    const blob = new Blob([pgn], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pears-gambit-${Date.now()}.pgn`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  /**
   * Toggle sound on/off
   */
  toggleSound() {
    const enabled = !soundManager.options.enabled
    soundManager.setEnabled(enabled)
    
    // Update button text
    const button = document.getElementById('toggle-sound')
    if (button) {
      button.textContent = enabled ? '🔊 Sound' : '🔇 Sound'
    }
    
    // Play a test sound if enabling
    if (enabled) {
      soundManager.play('move')
    }
    
    console.log('Sound toggled:', enabled)
  }

  /**
   * Leave spectator mode and return to lobby
   */
  leaveSpectatorMode() {
    console.log('Leaving spectator mode')
    
    // Clean up spectator connections
    if (this.p2pSession && this.options.spectating) {
      // Disconnect from the game topic
      // In a full implementation, this would properly leave the swarm
    }
    
    // Return to lobby
    if (this.options.onLeaveSpectator) {
      this.options.onLeaveSpectator()
    } else {
      // Reload to go back to lobby
      window.location.reload()
    }
  }

  /**
   * Show error message
   */
  showError(message) {
    // Simple alert for now - could be replaced with a modal
    alert(`Error: ${message}`)
  }

  /**
   * Handle game end from opponent
   */
  handleOpponentGameEnd(result, clockState = null) {
    console.log('Opponent game end received:', result, 'clockState:', clockState)
    this.gameState = 'finished'
    
    // Update clock state from opponent's final state
    if (clockState && this.chessClock && this.chessClock.options.enabled) {
      this.chessClock.setTimeState(clockState)
    }
    
    this.showGameResult(result, true)
    this.updateDisplay()
  }

  /**
   * Show game result
   */
  showGameResult(result, fromOpponent = false) {
    let title = 'Game Over!'
    let message = ''
    let isWin = false
    
    switch (result.result) {
      case 'checkmate':
        if (this.p2pSession) {
          // In P2P mode, show personal result
          isWin = (result.winner === this.playerColor)
          message = isWin ? 'You won by checkmate!' : 'You lost by checkmate!'
        } else {
          message = `${result.winner} wins by checkmate!`
        }
        break
      case 'resignation':
        if (this.p2pSession) {
          // In P2P mode, show personal result
          isWin = (result.winner === this.playerColor)
          if (fromOpponent) {
            message = isWin ? 'Your opponent resigned. You win!' : 'You resigned. You lose!'
          } else {
            message = isWin ? 'Your opponent resigned. You win!' : 'You resigned. You lose!'
          }
        } else {
          message = `${result.winner} wins by resignation!`
        }
        break
      case 'stalemate':
        message = 'Draw by stalemate!'
        break
      case 'draw':
        message = 'Draw!'
        break
      case 'threefold_repetition':
        message = 'Draw by threefold repetition!'
        break
      case 'insufficient_material':
        message = 'Draw by insufficient material!'
        break
      case 'timeout':
        if (this.p2pSession) {
          // In P2P mode, show personal result
          isWin = (result.winner === this.playerColor)
          message = isWin ? 'Your opponent ran out of time. You win!' : 'You ran out of time. You lose!'
        } else {
          message = `${result.winner} wins on time!`
        }
        break
      default:
        message = 'Game finished!'
    }
    
    // Create a more sophisticated modal instead of alert
    this.showGameEndModal(title, message, isWin, fromOpponent)
  }

  /**
   * Show game end modal
   */
  showGameEndModal(title, message, isWin, fromOpponent) {
    // Create modal backdrop
    const backdrop = document.createElement('div')
    backdrop.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.7);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
    `
    
    // Create modal content
    const modal = document.createElement('div')
    modal.style.cssText = `
      background-color: white;
      padding: 30px;
      border-radius: 10px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
      text-align: center;
      max-width: 400px;
      min-width: 300px;
    `
    
    const titleElement = document.createElement('h2')
    titleElement.textContent = title
    titleElement.style.color = isWin ? '#28a745' : (isWin === false && title === 'Game Over!' ? '#dc3545' : '#333')
    titleElement.style.marginTop = '0'
    
    const messageElement = document.createElement('p')
    messageElement.textContent = message
    messageElement.style.fontSize = '18px'
    messageElement.style.margin = '20px 0'
    
    const buttonContainer = document.createElement('div')
    buttonContainer.style.cssText = `
      display: flex;
      gap: 10px;
      justify-content: center;
      margin-top: 20px;
    `
    
    const newGameButton = document.createElement('button')
    newGameButton.textContent = 'Return to Lobby'
    newGameButton.style.cssText = `
      padding: 10px 20px;
      background-color: #007bff;
      color: white;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      font-size: 16px;
    `
    
    newGameButton.onclick = () => {
      backdrop.remove()
      // Return to lobby logic would go here
      if (typeof window.pearsGambit !== 'undefined') {
        window.pearsGambit.returnToLobby()
      }
    }
    
    buttonContainer.appendChild(newGameButton)
    modal.appendChild(titleElement)
    modal.appendChild(messageElement)
    modal.appendChild(buttonContainer)
    backdrop.appendChild(modal)
    document.body.appendChild(backdrop)
    
    // Remove modal when clicking backdrop
    backdrop.onclick = (e) => {
      if (e.target === backdrop) {
        backdrop.remove()
      }
    }
  }

  /**
   * Validate remote move structure and data
   */
  validateRemoteMove(move) {
    // Check required fields
    if (!move || typeof move !== 'object') {
      console.error('Move is not an object')
      return false
    }
    
    if (!move.from || !move.to) {
      console.error('Move missing from/to fields')
      return false
    }
    
    // Validate square format (a1-h8)
    const squareRegex = /^[a-h][1-8]$/
    if (!squareRegex.test(move.from) || !squareRegex.test(move.to)) {
      console.error('Invalid square format:', move.from, move.to)
      return false
    }
    
    // Validate player field
    if (!move.player || (move.player !== 'white' && move.player !== 'black')) {
      console.error('Invalid player field:', move.player)
      return false
    }
    
    // Validate promotion if present
    if (move.promotion && !['q', 'r', 'b', 'n'].includes(move.promotion)) {
      console.error('Invalid promotion piece:', move.promotion)
      return false
    }
    
    // Validate timestamp is reasonable (within last minute)
    if (move.timestamp) {
      const now = Date.now()
      const moveAge = now - move.timestamp
      if (moveAge < 0 || moveAge > 60000) {
        console.warn('Suspicious move timestamp:', move.timestamp, 'age:', moveAge)
        // Don't reject, just warn
      }
    }
    
    return true
  }

  /**
   * Handle synchronization errors
   */
  handleSyncError() {
    console.error('Game synchronization error detected')
    
    // TODO: In future, implement game state recovery
    // For now, just log and continue
    
    if (this.p2pSession && this.gameSession) {
      // Could request full game state from opponent
      console.log('TODO: Implement game state recovery')
    }
  }

  /**
   * Handle window resize
   */
  handleResize() {
    // Could adjust board size based on window size
  }

  /**
   * Add component styles
   */
  addStyles() {
    const style = document.createElement('style')
    style.textContent = `
      .game-view {
        font-family: Arial, sans-serif;
        padding: 20px;
        background-color: #f5f5f5;
        min-height: 100vh;
      }
      
      .game-layout {
        display: flex;
        gap: 20px;
        max-width: 1200px;
        margin: 0 auto;
      }
      
      .game-area {
        flex: 0 0 auto;
      }
      
      .board-container {
        background-color: white;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      }
      
      .side-panel {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 20px;
        min-width: 300px;
      }
      
      .game-info, .game-controls, .move-history {
        background-color: white;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      }
      
      .connection-status {
        padding: 10px;
        border-radius: 4px;
        margin-bottom: 10px;
        text-align: center;
        font-weight: bold;
      }
      
      .connection-status.connected {
        background-color: #d4edda;
        color: #155724;
        border: 1px solid #c3e6cb;
      }
      
      .connection-status.disconnected {
        background-color: #f8d7da;
        color: #721c24;
        border: 1px solid #f5c6cb;
      }
      
      .connection-status.connecting {
        background-color: #fff3cd;
        color: #856404;
        border: 1px solid #ffeaa7;
      }
      
      .game-info h3, .move-history h3 {
        margin-top: 0;
        color: #333;
        border-bottom: 2px solid #eee;
        padding-bottom: 10px;
      }
      
      .info-row {
        display: flex;
        justify-content: space-between;
        margin-bottom: 8px;
      }
      
      .info-row .label {
        font-weight: bold;
        color: #666;
      }
      
      .info-row .value {
        color: #333;
      }
      
      .captured-pieces-section {
        margin-top: 15px;
        padding-top: 15px;
        border-top: 1px solid #eee;
      }
      
      .captured-pieces {
        margin-bottom: 8px;
        display: flex;
        align-items: center;
      }
      
      .captured-label {
        font-size: 12px;
        font-weight: bold;
        color: #666;
        margin-right: 8px;
        min-width: 100px;
      }
      
      .captured-pieces-list {
        font-size: 20px;
        font-family: Arial, sans-serif;
        letter-spacing: 2px;
      }
      
      .white-captured .captured-pieces-list {
        color: #000;
      }
      
      .black-captured .captured-pieces-list {
        color: #000;
        text-shadow: 0 0 1px #666;
      }
      
      .game-controls {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
      }
      
      .control-button {
        padding: 10px 15px;
        border: none;
        border-radius: 4px;
        background-color: #007bff;
        color: white;
        cursor: pointer;
        font-size: 14px;
        transition: background-color 0.2s;
      }
      
      .control-button:hover {
        background-color: #0056b3;
      }
      
      .control-button:active {
        background-color: #004080;
      }
      
      .resign-button {
        padding: 10px 15px;
        border: none;
        border-radius: 4px;
        background-color: #dc3545;
        color: white;
        cursor: pointer;
        font-size: 14px;
        transition: background-color 0.2s;
      }
      
      .resign-button:hover {
        background-color: #c82333;
      }
      
      .resign-button:active {
        background-color: #bd2130;
      }
      
      .move-history {
        flex: 1;
        min-height: 300px;
      }
      
      .move-list {
        max-height: 400px;
        overflow-y: auto;
        border: 1px solid #eee;
        border-radius: 4px;
        padding: 10px;
        background-color: #fafafa;
        font-family: 'Courier New', monospace;
      }
      
      .move-row {
        display: flex;
        align-items: center;
        margin-bottom: 4px;
        font-family: monospace;
      }
      
      .move-number {
        width: 30px;
        font-weight: bold;
        color: #666;
      }
      
      .move {
        min-width: 60px;
        padding: 2px 6px;
        margin-right: 8px;
        border-radius: 3px;
        cursor: pointer;
        transition: all 0.2s;
      }
      
      .white-move {
        background-color: #f8f9fa;
      }
      
      .black-move {
        background-color: #e9ecef;
      }
      
      .move:hover {
        background-color: #007bff;
        color: white;
      }
      
      .move.selected-move {
        background-color: #28a745;
        color: white;
      }
      
      .move-header-row {
        display: flex;
        align-items: center;
        border-bottom: 2px solid #dee2e6;
        margin-bottom: 4px;
        font-weight: bold;
        font-size: 12px;
        color: #666;
      }
      
      .move-number-header {
        width: 30px;
        text-align: center;
      }
      
      .move-header {
        min-width: 60px;
        padding: 2px 6px;
        margin-right: 8px;
      }
      
      .last-move-row {
        background-color: #fff3cd;
        border-radius: 3px;
      }
      
      .move-result {
        text-align: center;
        font-weight: bold;
        font-size: 16px;
        margin-top: 10px;
        padding: 8px;
        background-color: #f8f9fa;
        border-radius: 4px;
      }
      
      .spectator-badge {
        background: #17a2b8;
        color: white;
        padding: 8px 16px;
        border-radius: 4px;
        text-align: center;
        font-weight: bold;
        margin-bottom: 15px;
        font-size: 14px;
        letter-spacing: 1px;
      }
      
      .invite-code-info {
        background: #f8f9fa;
        border: 1px solid #e9ecef;
        border-radius: 6px;
        padding: 12px;
        margin-bottom: 15px;
        font-size: 13px;
      }
      
      .invite-label {
        font-weight: 600;
        color: #495057;
        margin-bottom: 6px;
      }
      
      .invite-code-display-small {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 4px;
      }
      
      .invite-code-display-small span {
        font-family: 'Courier New', monospace;
        font-weight: bold;
        font-size: 14px;
        color: #007bff;
        letter-spacing: 1px;
      }
      
      .copy-button-small {
        background: #28a745;
        color: white;
        border: none;
        padding: 4px 6px;
        border-radius: 3px;
        cursor: pointer;
        font-size: 12px;
        transition: background-color 0.2s;
      }
      
      .copy-button-small:hover {
        background: #218838;
      }
      
      .invite-code-info small {
        color: #6c757d;
        font-size: 11px;
      }
      
      @media (max-width: 768px) {
        .game-layout {
          flex-direction: column;
        }
        
        .side-panel {
          min-width: auto;
        }
        
        .board-container {
          display: flex;
          justify-content: center;
        }
      }
    `
    document.head.appendChild(style)
  }

  /**
   * Destroy the component
   */
  destroy() {
    if (this.chessBoard) {
      this.chessBoard.destroy()
    }
    this.container.innerHTML = ''
  }
}