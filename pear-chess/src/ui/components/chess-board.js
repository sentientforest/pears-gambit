/**
 * Pear's Gambit - Chess Board UI Component
 * 
 * Interactive chess board component with drag-and-drop functionality
 */

import { chessBoard } from '../../chess/board.js'

/**
 * Chess Board UI Component
 */
export class ChessBoardComponent {
  constructor(containerId, options = {}) {
    this.containerId = containerId
    this.container = document.getElementById(containerId)
    if (!this.container) {
      throw new Error(`Container element with id "${containerId}" not found`)
    }

    // Configuration
    this.options = {
      size: options.size || 400,
      coordinates: options.coordinates !== false,
      flipped: options.flipped || false,
      draggable: options.draggable !== false,
      highlightLegalMoves: options.highlightLegalMoves !== false,
      theme: options.theme || 'default',
      ...options
    }

    // State
    this.boardState = {}
    this.selectedSquare = null
    this.legalMoves = []
    this.draggedPiece = null
    this.gameInstance = null

    // Event handlers
    this.onMove = options.onMove || (() => {})
    this.onSquareClick = options.onSquareClick || (() => {})
    this.onPieceSelect = options.onPieceSelect || (() => {})

    this.init()
  }

  /**
   * Initialize the chess board
   */
  init() {
    this.createBoard()
    this.bindEvents()
    this.updateStyles()
  }

  /**
   * Create the board HTML structure
   */
  createBoard() {
    this.container.innerHTML = ''
    this.container.className = `chess-board ${this.options.theme}`
    
    // Create board wrapper
    const wrapper = document.createElement('div')
    wrapper.className = 'board-wrapper'
    
    // Create squares
    const boardElement = document.createElement('div')
    boardElement.className = 'board-squares'
    
    for (let rank = 7; rank >= 0; rank--) {
      for (let file = 0; file < 8; file++) {
        const square = chessBoard.indicesToSquare(file, rank)
        const squareElement = this.createSquareElement(square, file, rank)
        boardElement.appendChild(squareElement)
      }
    }
    
    wrapper.appendChild(boardElement)
    
    // Add coordinates if enabled
    if (this.options.coordinates) {
      this.addCoordinates(wrapper)
    }
    
    this.container.appendChild(wrapper)
    this.boardElement = boardElement
  }

  /**
   * Create individual square element
   */
  createSquareElement(square, file, rank) {
    const element = document.createElement('div')
    element.className = `square ${chessBoard.getSquareColor(square)}`
    element.dataset.square = square
    element.dataset.file = file
    element.dataset.rank = rank
    
    return element
  }

  /**
   * Add coordinate labels
   */
  addCoordinates(wrapper) {
    // File labels (a-h)
    const fileLabels = document.createElement('div')
    fileLabels.className = 'file-labels'
    
    for (let file = 0; file < 8; file++) {
      const label = document.createElement('div')
      label.className = 'file-label'
      label.textContent = chessBoard.files[file]
      fileLabels.appendChild(label)
    }
    
    // Rank labels (1-8)
    const rankLabels = document.createElement('div')
    rankLabels.className = 'rank-labels'
    
    for (let rank = 7; rank >= 0; rank--) {
      const label = document.createElement('div')
      label.className = 'rank-label'
      label.textContent = rank + 1
      rankLabels.appendChild(label)
    }
    
    wrapper.appendChild(fileLabels)
    wrapper.appendChild(rankLabels)
  }

  /**
   * Bind event handlers
   */
  bindEvents() {
    if (!this.options.draggable) return

    this.boardElement.addEventListener('mousedown', this.handleMouseDown.bind(this))
    this.boardElement.addEventListener('mousemove', this.handleMouseMove.bind(this))
    this.boardElement.addEventListener('mouseup', this.handleMouseUp.bind(this))
    this.boardElement.addEventListener('click', this.handleClick.bind(this))
    
    // Touch events for mobile
    this.boardElement.addEventListener('touchstart', this.handleTouchStart.bind(this))
    this.boardElement.addEventListener('touchmove', this.handleTouchMove.bind(this))
    this.boardElement.addEventListener('touchend', this.handleTouchEnd.bind(this))
  }

  /**
   * Handle mouse down
   */
  handleMouseDown(event) {
    event.preventDefault()
    const square = this.getSquareFromEvent(event)
    if (!square) return

    const piece = this.boardState[square]
    if (!piece) return

    this.startDrag(square, piece, event)
  }

  /**
   * Handle mouse move
   */
  handleMouseMove(event) {
    if (!this.draggedPiece) return
    
    event.preventDefault()
    this.updateDragPiece(event)
  }

  /**
   * Handle mouse up
   */
  handleMouseUp(event) {
    if (!this.draggedPiece) return
    
    event.preventDefault()
    const targetSquare = this.getSquareFromEvent(event)
    this.completeDrag(targetSquare)
  }

  /**
   * Handle click events
   */
  handleClick(event) {
    const square = this.getSquareFromEvent(event)
    if (!square) return

    this.onSquareClick(square)

    // Handle piece selection
    if (this.selectedSquare === square) {
      this.clearSelection()
    } else {
      this.selectSquare(square)
    }
  }

  /**
   * Touch event handlers
   */
  handleTouchStart(event) {
    if (event.touches.length !== 1) return
    this.handleMouseDown(event.touches[0])
  }

  handleTouchMove(event) {
    if (event.touches.length !== 1) return
    event.preventDefault()
    this.handleMouseMove(event.touches[0])
  }

  handleTouchEnd(event) {
    if (event.changedTouches.length !== 1) return
    this.handleMouseUp(event.changedTouches[0])
  }

  /**
   * Get square from event coordinates
   */
  getSquareFromEvent(event) {
    const rect = this.boardElement.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    
    const squareSize = rect.width / 8
    const file = Math.floor(x / squareSize)
    const rank = Math.floor((rect.height - y) / squareSize)
    
    if (file < 0 || file > 7 || rank < 0 || rank > 7) {
      return null
    }
    
    return chessBoard.indicesToSquare(file, rank)
  }

  /**
   * Start dragging a piece
   */
  startDrag(square, piece, event) {
    this.draggedPiece = {
      square,
      piece,
      element: this.createDragElement(piece),
      startX: event.clientX,
      startY: event.clientY
    }
    
    document.body.appendChild(this.draggedPiece.element)
    this.updateDragPiece(event)
    
    this.selectSquare(square)
  }

  /**
   * Update drag piece position
   */
  updateDragPiece(event) {
    if (!this.draggedPiece) return
    
    this.draggedPiece.element.style.left = (event.clientX - 25) + 'px'
    this.draggedPiece.element.style.top = (event.clientY - 25) + 'px'
  }

  /**
   * Complete drag operation
   */
  completeDrag(targetSquare) {
    if (!this.draggedPiece) return
    
    const fromSquare = this.draggedPiece.square
    
    // Remove drag element
    document.body.removeChild(this.draggedPiece.element)
    this.draggedPiece = null
    
    // Attempt move
    if (targetSquare && targetSquare !== fromSquare) {
      this.attemptMove(fromSquare, targetSquare)
    }
    
    this.clearSelection()
  }

  /**
   * Create draggable piece element
   */
  createDragElement(piece) {
    const element = document.createElement('div')
    element.className = 'drag-piece'
    element.textContent = chessBoard.getPieceSymbol(piece.type, piece.color)
    element.style.position = 'fixed'
    element.style.pointerEvents = 'none'
    element.style.fontSize = '40px'
    element.style.zIndex = '1000'
    return element
  }

  /**
   * Select a square
   */
  selectSquare(square) {
    this.clearSelection()
    this.selectedSquare = square
    
    const squareElement = this.getSquareElement(square)
    if (squareElement) {
      squareElement.classList.add('selected')
    }
    
    // Get legal moves if we have a game instance
    if (this.gameInstance && this.boardState[square]) {
      this.legalMoves = this.gameInstance.getLegalMovesForSquare(square)
      this.highlightLegalMoves()
    }
    
    this.onPieceSelect(square, this.boardState[square])
  }

  /**
   * Clear current selection
   */
  clearSelection() {
    if (this.selectedSquare) {
      const squareElement = this.getSquareElement(this.selectedSquare)
      if (squareElement) {
        squareElement.classList.remove('selected')
      }
    }
    
    this.selectedSquare = null
    this.legalMoves = []
    this.clearHighlights()
  }

  /**
   * Highlight legal moves
   */
  highlightLegalMoves() {
    if (!this.options.highlightLegalMoves) return
    
    this.legalMoves.forEach(move => {
      const squareElement = this.getSquareElement(move.to)
      if (squareElement) {
        squareElement.classList.add('legal-move')
        if (move.captured) {
          squareElement.classList.add('capture')
        }
      }
    })
  }

  /**
   * Clear all highlights
   */
  clearHighlights() {
    this.boardElement.querySelectorAll('.legal-move, .capture, .check, .last-move')
      .forEach(element => {
        element.classList.remove('legal-move', 'capture', 'check', 'last-move')
      })
  }

  /**
   * Attempt to make a move
   */
  attemptMove(from, to) {
    const move = { from, to }
    
    // Check if promotion is needed
    const piece = this.boardState[from]
    if (piece && piece.type === 'p') {
      const toRank = parseInt(to[1])
      if ((piece.color === 'w' && toRank === 8) || (piece.color === 'b' && toRank === 1)) {
        move.promotion = this.getPromotionChoice()
      }
    }
    
    this.onMove(move)
  }

  /**
   * Get promotion choice from user
   */
  getPromotionChoice() {
    // Simple prompt for now - in a real UI this would be a modal
    const choices = ['q', 'r', 'b', 'n']
    const choice = prompt('Promote to (q/r/b/n):')
    return choices.includes(choice) ? choice : 'q'
  }

  /**
   * Update board state
   */
  updateBoard(boardState) {
    this.boardState = boardState
    this.renderPieces()
  }

  /**
   * Render pieces on the board
   */
  renderPieces() {
    // Clear existing pieces
    this.boardElement.querySelectorAll('.piece').forEach(piece => piece.remove())
    
    // Add current pieces
    for (const [square, piece] of Object.entries(this.boardState)) {
      if (piece) {
        const squareElement = this.getSquareElement(square)
        if (squareElement) {
          const pieceElement = this.createPieceElement(piece)
          squareElement.appendChild(pieceElement)
        }
      }
    }
  }

  /**
   * Create piece element
   */
  createPieceElement(piece) {
    const element = document.createElement('div')
    element.className = 'piece'
    element.textContent = chessBoard.getPieceSymbol(piece.type, piece.color)
    return element
  }

  /**
   * Get square element by square name
   */
  getSquareElement(square) {
    return this.boardElement.querySelector(`[data-square="${square}"]`)
  }

  /**
   * Set game instance for move validation
   */
  setGameInstance(game) {
    this.gameInstance = game
  }

  /**
   * Highlight last move
   */
  highlightLastMove(from, to) {
    this.clearHighlights()
    
    const fromElement = this.getSquareElement(from)
    const toElement = this.getSquareElement(to)
    
    if (fromElement) fromElement.classList.add('last-move')
    if (toElement) toElement.classList.add('last-move')
  }

  /**
   * Show check indicator
   */
  showCheck(kingSquare) {
    const kingElement = this.getSquareElement(kingSquare)
    if (kingElement) {
      kingElement.classList.add('check')
    }
  }

  /**
   * Update board styles
   */
  updateStyles() {
    const style = document.createElement('style')
    style.textContent = this.generateCSS()
    document.head.appendChild(style)
  }

  /**
   * Generate CSS for the board
   */
  generateCSS() {
    const size = this.options.size
    const squareSize = size / 8
    
    return `
      .chess-board {
        display: inline-block;
        position: relative;
        font-family: Arial, sans-serif;
      }
      
      .board-wrapper {
        position: relative;
        width: ${size}px;
        height: ${size}px;
      }
      
      .board-squares {
        width: 100%;
        height: 100%;
        display: grid;
        grid-template-columns: repeat(8, 1fr);
        grid-template-rows: repeat(8, 1fr);
        border: 2px solid #333;
      }
      
      .square {
        position: relative;
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        user-select: none;
      }
      
      .square.light {
        background-color: #f0d9b5;
      }
      
      .square.dark {
        background-color: #b58863;
      }
      
      .square.selected {
        background-color: #ffff00 !important;
      }
      
      .square.legal-move::after {
        content: '';
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background-color: rgba(0, 0, 0, 0.3);
        position: absolute;
      }
      
      .square.legal-move.capture::after {
        width: 80%;
        height: 80%;
        border: 3px solid rgba(255, 0, 0, 0.8);
        background-color: transparent;
        border-radius: 0;
      }
      
      .square.check {
        background-color: #ff6b6b !important;
      }
      
      .square.last-move {
        background-color: rgba(255, 255, 0, 0.5) !important;
      }
      
      .piece {
        font-size: ${squareSize * 0.7}px;
        pointer-events: none;
        line-height: 1;
      }
      
      .drag-piece {
        font-size: 50px;
        text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
      }
      
      .file-labels {
        position: absolute;
        bottom: -20px;
        left: 0;
        width: 100%;
        display: flex;
        font-size: 12px;
        font-weight: bold;
      }
      
      .file-label {
        flex: 1;
        text-align: center;
      }
      
      .rank-labels {
        position: absolute;
        left: -20px;
        top: 0;
        height: 100%;
        display: flex;
        flex-direction: column-reverse;
        font-size: 12px;
        font-weight: bold;
      }
      
      .rank-label {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
      }
    `
  }

  /**
   * Flip the board
   */
  flip() {
    this.options.flipped = !this.options.flipped
    this.createBoard()
    this.renderPieces()
  }

  /**
   * Reset the board
   */
  reset() {
    this.clearSelection()
    this.boardState = {}
    this.renderPieces()
  }

  /**
   * Destroy the component
   */
  destroy() {
    if (this.draggedPiece && this.draggedPiece.element.parentNode) {
      this.draggedPiece.element.parentNode.removeChild(this.draggedPiece.element)
    }
    this.container.innerHTML = ''
  }
}