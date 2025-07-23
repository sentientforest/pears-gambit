/**
 * Pear's Gambit - Game View Component
 * 
 * Main game interface that coordinates the chess board and game logic
 */

import { ChessBoardComponent } from './components/chess-board.js'
import { createGame, chessBoard } from '../chess/index.js'

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
      ...options
    }

    // Game state
    this.game = null
    this.chessBoard = null
    this.gameState = 'waiting' // waiting, active, paused, finished

    // UI elements
    this.boardContainer = null
    this.controlsContainer = null
    this.moveHistoryContainer = null
    this.gameInfoContainer = null

    this.init()
  }

  /**
   * Initialize the game view
   */
  init() {
    this.createLayout()
    this.createChessBoard()
    this.createControls()
    this.createMoveHistory()
    this.createGameInfo()
    this.bindEvents()
    
    // Start a new game
    this.newGame()
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

    gameArea.appendChild(this.boardContainer)

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
    this.chessBoard = new ChessBoardComponent('chess-board-container', {
      size: 480,
      coordinates: true,
      draggable: true,
      onMove: this.handleMove.bind(this),
      onSquareClick: this.handleSquareClick.bind(this),
      onPieceSelect: this.handlePieceSelect.bind(this)
    })
  }

  /**
   * Create game controls
   */
  createControls() {
    if (!this.controlsContainer) return

    const controls = [
      { id: 'new-game', text: 'New Game', onClick: () => this.newGame() },
      { id: 'flip-board', text: 'Flip Board', onClick: () => this.flipBoard() },
      { id: 'undo-move', text: 'Undo', onClick: () => this.undoMove() },
      { id: 'export-pgn', text: 'Export PGN', onClick: () => this.exportPgn() }
    ]

    controls.forEach(control => {
      const button = document.createElement('button')
      button.id = control.id
      button.textContent = control.text
      button.className = 'control-button'
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
   * Create game information display
   */
  createGameInfo() {
    if (!this.gameInfoContainer) return

    this.gameInfoContainer.innerHTML = `
      <h3>Game Information</h3>
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
    `
  }

  /**
   * Bind event handlers
   */
  bindEvents() {
    // Window resize
    window.addEventListener('resize', this.handleResize.bind(this))
  }

  /**
   * Start a new game
   */
  newGame() {
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
    this.chessBoard.setGameInstance(this.game)
    this.updateDisplay()
    
    this.gameState = 'active'
    console.log('New game started:', this.game.getGameInfo())
  }

  /**
   * Handle move from chess board
   */
  handleMove(move) {
    if (this.gameState !== 'active') return

    console.log('Attempting move:', move)
    const result = this.game.makeMove(move)
    
    if (result.success) {
      console.log('Move successful:', result.move)
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
    console.log('Square clicked:', square)
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
    this.updateMoveHistory()
    
    // Highlight last move
    if (move.from && move.to) {
      this.chessBoard.highlightLastMove(move.from, move.to)
    }
  }

  /**
   * Handle game end event
   */
  onGameEnd(result) {
    console.log('Game ended:', result)
    this.gameState = 'finished'
    this.showGameResult(result)
    this.updateDisplay()
  }

  /**
   * Handle check event
   */
  onCheck(move) {
    console.log('Check detected:', move)
    
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
      'white-player': gameInfo.players.white || 'Unknown',
      'black-player': gameInfo.players.black || 'Unknown'
    }

    for (const [id, value] of Object.entries(elements)) {
      const element = document.getElementById(id)
      if (element) {
        element.textContent = value
      }
    }
  }

  /**
   * Get status text for display
   */
  getStatusText(gameInfo) {
    if (gameInfo.isGameOver && gameInfo.result) {
      switch (gameInfo.result.result) {
        case 'checkmate':
          return `Checkmate - ${gameInfo.result.winner} wins`
        case 'stalemate':
          return 'Stalemate - Draw'
        case 'draw':
          return 'Draw'
        case 'threefold_repetition':
          return 'Draw by repetition'
        case 'insufficient_material':
          return 'Draw - Insufficient material'
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
      whiteSpan.textContent = whiteMove.san

      moveRow.appendChild(numberSpan)
      moveRow.appendChild(whiteSpan)

      if (blackMove) {
        const blackSpan = document.createElement('span')
        blackSpan.className = 'move black-move'
        blackSpan.textContent = blackMove.san
        moveRow.appendChild(blackSpan)
      }

      historyList.appendChild(moveRow)
    }

    // Scroll to bottom
    historyList.scrollTop = historyList.scrollHeight
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
   * Show error message
   */
  showError(message) {
    // Simple alert for now - could be replaced with a modal
    alert(`Error: ${message}`)
  }

  /**
   * Show game result
   */
  showGameResult(result) {
    let message = 'Game Over!\n'
    
    switch (result.result) {
      case 'checkmate':
        message += `${result.winner} wins by checkmate!`
        break
      case 'stalemate':
        message += 'Draw by stalemate!'
        break
      case 'draw':
        message += 'Draw!'
        break
      case 'threefold_repetition':
        message += 'Draw by threefold repetition!'
        break
      case 'insufficient_material':
        message += 'Draw by insufficient material!'
        break
      default:
        message += 'Game finished!'
    }
    
    setTimeout(() => alert(message), 100)
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