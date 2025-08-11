/**
 * Pear's Gambit - Chess Board UI Component
 * 
 * Interactive chess board component with drag-and-drop functionality
 */

import { chessBoard } from '../../chess/board.js'
import { soundManager } from '../sound-manager.js'

/**
 * Chess Board UI Component
 */
export class ChessBoardComponent {
  constructor(containerId, options = {}) {
    this.containerId = containerId
    this.container = document.getElementById(containerId)
    console.log('[ChessBoard] Initializing with container:', containerId, 'found:', !!this.container)
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
    console.log('[ChessBoard] Starting initialization')
    this.createBoard()
    
    // Delay event binding to ensure DOM is ready
    setTimeout(() => {
      this.bindEvents()
    }, 100)
    
    this.updateStyles()
    console.log('[ChessBoard] Initialization complete')
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
    
    // Create squares - handle flipped orientation
    if (this.options.flipped) {
      // When flipped, start from rank 0 and go up
      for (let rank = 0; rank <= 7; rank++) {
        for (let file = 7; file >= 0; file--) {
          const square = chessBoard.indicesToSquare(file, rank)
          const squareElement = this.createSquareElement(square, file, rank)
          boardElement.appendChild(squareElement)
        }
      }
    } else {
      // Normal orientation - white on bottom
      for (let rank = 7; rank >= 0; rank--) {
        for (let file = 0; file < 8; file++) {
          const square = chessBoard.indicesToSquare(file, rank)
          const squareElement = this.createSquareElement(square, file, rank)
          boardElement.appendChild(squareElement)
        }
      }
    }
    
    // Add coordinates if enabled
    if (this.options.coordinates) {
      this.addCoordinates(wrapper)
    }
    
    wrapper.appendChild(boardElement)
    this.container.appendChild(wrapper)
    this.boardElement = boardElement
    console.log('[ChessBoard] Board structure created and appended to DOM')
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
    
    if (this.options.flipped) {
      // When flipped, files go from h to a
      for (let file = 7; file >= 0; file--) {
        const label = document.createElement('div')
        label.className = 'file-label'
        label.textContent = chessBoard.files[file]
        fileLabels.appendChild(label)
      }
    } else {
      // Normal orientation: a to h
      for (let file = 0; file < 8; file++) {
        const label = document.createElement('div')
        label.className = 'file-label'
        label.textContent = chessBoard.files[file]
        fileLabels.appendChild(label)
      }
    }
    
    // Rank labels (1-8)
    const rankLabels = document.createElement('div')
    rankLabels.className = 'rank-labels'
    
    if (this.options.flipped) {
      // When flipped, ranks go from 1 to 8
      for (let rank = 0; rank <= 7; rank++) {
        const label = document.createElement('div')
        label.className = 'rank-label'
        label.textContent = rank + 1
        rankLabels.appendChild(label)
      }
    } else {
      // Normal orientation: 8 to 1
      for (let rank = 7; rank >= 0; rank--) {
        const label = document.createElement('div')
        label.className = 'rank-label'
        label.textContent = rank + 1
        rankLabels.appendChild(label)
      }
    }
    
    wrapper.appendChild(fileLabels)
    wrapper.appendChild(rankLabels)
  }

  /**
   * Bind event handlers
   */
  bindEvents() {
    console.log('[ChessBoard] Binding events, draggable:', this.options.draggable)
    console.log('[ChessBoard] Board element for events:', this.boardElement)
    
    if (!this.boardElement) {
      console.error('[ChessBoard] No boardElement to bind events to!')
      return
    }
    
    // Test if element is in DOM
    console.log('[ChessBoard] Board element in DOM:', document.contains(this.boardElement))
    
    // Clean up any existing drag artifacts before binding
    this.cleanupDragArtifacts()
    
    // Always bind click events for piece selection
    this.boardElement.addEventListener('click', this.handleClick.bind(this))
    
    // Add a test event to make sure it's working
    this.boardElement.addEventListener('mouseenter', () => {
      console.log('[ChessBoard] Mouse entered board - events are working!')
    })
    
    // Only bind drag events if draggable is enabled
    if (this.options.draggable) {
      this.boardElement.addEventListener('mousedown', this.handleMouseDown.bind(this))
      this.boardElement.addEventListener('mousemove', this.handleMouseMove.bind(this))
      this.boardElement.addEventListener('mouseup', this.handleMouseUp.bind(this))
      
      // Touch events for mobile
      this.boardElement.addEventListener('touchstart', this.handleTouchStart.bind(this))
      this.boardElement.addEventListener('touchmove', this.handleTouchMove.bind(this))
      this.boardElement.addEventListener('touchend', this.handleTouchEnd.bind(this))
      
      // Global mouse up to catch drags that end outside the board
      document.addEventListener('mouseup', async (event) => {
        if (this.draggedPiece) {
          await this.completeDrag(null) // Complete drag without move
        }
      })
    }
    
    console.log('[ChessBoard] Events bound successfully')
  }

  /**
   * Handle mouse down
   */
  handleMouseDown(event) {
    event.preventDefault()
    
    // Clean up any existing drag operations first
    this.cleanupDragArtifacts()
    
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
  async handleMouseUp(event) {
    if (!this.draggedPiece) return
    
    event.preventDefault()
    const targetSquare = this.getSquareFromEvent(event)
    await this.completeDrag(targetSquare)
  }

  /**
   * Handle click events
   */
  handleClick(event) {
    console.log('[ChessBoard] Click event received:', event)
    const square = this.getSquareFromEvent(event)
    console.log('[ChessBoard] Square from event:', square)
    if (!square) return

    this.onSquareClick(square)

    // If we have a selected piece and clicked on a different square, try to move
    if (this.selectedSquare && this.selectedSquare !== square) {
      // Check if this is a legal move
      if (this.legalMoves.includes(square)) {
        this.onMove({
          from: this.selectedSquare,
          to: square
        })
        this.clearSelection()
        return
      }
    }

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
    
    // Additional cleanup for touch events
    setTimeout(() => {
      this.cleanupDragArtifacts()
    }, 100)
  }

  /**
   * Get square from event coordinates
   */
  getSquareFromEvent(event) {
    const rect = this.boardElement.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    
    const squareSize = rect.width / 8
    let file = Math.floor(x / squareSize)
    let rank = Math.floor((rect.height - y) / squareSize)
    
    if (file < 0 || file > 7 || rank < 0 || rank > 7) {
      return null
    }
    
    // Adjust for flipped board
    if (this.options.flipped) {
      file = 7 - file
      rank = 7 - rank
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
  async completeDrag(targetSquare) {
    if (!this.draggedPiece) return
    
    const fromSquare = this.draggedPiece.square
    
    // Remove drag element safely
    if (this.draggedPiece.element && this.draggedPiece.element.parentNode) {
      this.draggedPiece.element.parentNode.removeChild(this.draggedPiece.element)
    }
    this.draggedPiece = null
    
    // Attempt move
    if (targetSquare && targetSquare !== fromSquare) {
      await this.attemptMove(fromSquare, targetSquare)
    }
    
    this.clearSelection()
  }

  /**
   * Create draggable piece element
   */
  createDragElement(piece) {
    const element = document.createElement('div')
    element.className = 'drag-piece chess-drag-piece' // Add unique class for cleanup
    element.textContent = chessBoard.getPieceSymbol(piece.type, piece.color)
    element.style.position = 'fixed'
    element.style.pointerEvents = 'none'
    element.style.fontSize = '40px'
    element.style.zIndex = '1000'
    element.style.userSelect = 'none'
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
  async attemptMove(from, to) {
    const move = { from, to }
    
    // Check if promotion is needed
    const piece = this.boardState[from]
    if (piece && piece.type === 'p') {
      const toRank = parseInt(to[1])
      if ((piece.color === 'w' && toRank === 8) || (piece.color === 'b' && toRank === 1)) {
        const pieceColor = piece.color === 'w' ? 'white' : 'black'
        move.promotion = await this.getPromotionChoice(pieceColor)
      }
    }
    
    this.onMove(move)
  }

  /**
   * Get promotion choice from user
   */
  async getPromotionChoice(color = 'white') {
    return new Promise((resolve) => {
      // Create promotion modal
      const modal = this.createPromotionModal(color, (piece) => {
        resolve(piece)
      })
      
      // Add to DOM
      document.body.appendChild(modal)
      
      // Focus on queen by default
      modal.querySelector('[data-piece="q"]').focus()
    })
  }

  /**
   * Create promotion modal UI
   */
  createPromotionModal(color, onSelect) {
    const modal = document.createElement('div')
    modal.className = 'promotion-modal-overlay'
    
    const dialog = document.createElement('div')
    dialog.className = 'promotion-modal'
    
    const title = document.createElement('h3')
    title.textContent = 'Choose promotion piece:'
    dialog.appendChild(title)
    
    const piecesContainer = document.createElement('div')
    piecesContainer.className = 'promotion-pieces'
    
    const pieces = [
      { piece: 'q', name: 'Queen' },
      { piece: 'r', name: 'Rook' },
      { piece: 'b', name: 'Bishop' },
      { piece: 'n', name: 'Knight' }
    ]
    
    pieces.forEach((pieceInfo, index) => {
      const pieceButton = document.createElement('button')
      pieceButton.className = 'promotion-piece-btn'
      pieceButton.setAttribute('data-piece', pieceInfo.piece)
      
      // Create piece symbol
      const pieceSymbol = this.getPieceSymbol(color, pieceInfo.piece)
      pieceButton.innerHTML = `
        <div class="piece-symbol">${pieceSymbol}</div>
        <div class="piece-name">${pieceInfo.name}</div>
      `
      
      pieceButton.onclick = () => {
        this.closePromotionModal(modal)
        onSelect(pieceInfo.piece)
      }
      
      // Add keyboard navigation
      pieceButton.onkeydown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          pieceButton.click()
        } else if (e.key === 'ArrowLeft' && index > 0) {
          pieces[index - 1] && piecesContainer.children[index - 1].focus()
        } else if (e.key === 'ArrowRight' && index < pieces.length - 1) {
          pieces[index + 1] && piecesContainer.children[index + 1].focus()
        } else if (e.key === 'Escape') {
          this.closePromotionModal(modal)
          onSelect('q') // Default to queen on escape
        }
      }
      
      piecesContainer.appendChild(pieceButton)
    })
    
    dialog.appendChild(piecesContainer)
    
    // Add instructions
    const instructions = document.createElement('p')
    instructions.className = 'promotion-instructions'
    instructions.textContent = 'Click a piece or use arrow keys and Enter'
    dialog.appendChild(instructions)
    
    modal.appendChild(dialog)
    
    // Close on overlay click
    modal.onclick = (e) => {
      if (e.target === modal) {
        this.closePromotionModal(modal)
        onSelect('q') // Default to queen
      }
    }
    
    return modal
  }

  /**
   * Get piece symbol for promotion modal
   */
  getPieceSymbol(color, piece) {
    const symbols = {
      white: {
        q: '♕', r: '♖', b: '♗', n: '♘'
      },
      black: {
        q: '♛', r: '♜', b: '♝', n: '♞'
      }
    }
    
    return symbols[color]?.[piece] || '♕'
  }

  /**
   * Close promotion modal
   */
  closePromotionModal(modal) {
    if (modal && modal.parentNode) {
      modal.parentNode.removeChild(modal)
    }
  }

  /**
   * Update board state
   */
  updateBoard(boardState) {
    // Clean up any drag artifacts before updating
    this.cleanupDragArtifacts()
    
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

      /* Promotion modal styles */
      .promotion-modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        backdrop-filter: blur(2px);
      }

      .promotion-modal {
        background: white;
        border-radius: 12px;
        padding: 30px;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        text-align: center;
        min-width: 350px;
        max-width: 90vw;
      }

      .promotion-modal h3 {
        margin: 0 0 20px 0;
        color: #333;
        font-size: 18px;
        font-weight: 600;
      }

      .promotion-pieces {
        display: flex;
        justify-content: center;
        gap: 15px;
        margin: 20px 0;
      }

      .promotion-piece-btn {
        background: white;
        border: 2px solid #ddd;
        border-radius: 8px;
        padding: 15px;
        cursor: pointer;
        transition: all 0.2s ease;
        min-width: 70px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 5px;
      }

      .promotion-piece-btn:hover {
        border-color: #007bff;
        background: #f8f9fa;
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 123, 255, 0.2);
      }

      .promotion-piece-btn:focus {
        outline: none;
        border-color: #007bff;
        background: #e3f2fd;
        box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
      }

      .promotion-piece-btn .piece-symbol {
        font-size: 28px;
        line-height: 1;
      }

      .promotion-piece-btn .piece-name {
        font-size: 12px;
        color: #666;
        font-weight: 500;
      }

      .promotion-instructions {
        margin: 15px 0 0 0;
        color: #666;
        font-size: 14px;
      }

      /* Responsive adjustments */
      @media (max-width: 480px) {
        .promotion-modal {
          padding: 20px;
          min-width: 300px;
        }

        .promotion-pieces {
          gap: 10px;
        }

        .promotion-piece-btn {
          padding: 12px;
          min-width: 60px;
        }

        .promotion-piece-btn .piece-symbol {
          font-size: 24px;
        }
      }
    `
  }

  /**
   * Flip the board
   */
  flip() {
    // Clean up any drag operations and artifacts first
    this.cleanupDragArtifacts()
    
    this.options.flipped = !this.options.flipped
    this.createBoard()
    
    // Re-bind events after recreating the board
    setTimeout(() => {
      this.bindEvents()
    }, 100)
    
    this.renderPieces()
    console.log('[ChessBoard] Board flipped, orientation:', this.options.flipped ? 'black' : 'white')
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
   * Clean up drag artifacts
   */
  cleanupDragArtifacts() {
    // Clean up any leftover drag elements with our unique class
    document.querySelectorAll('.chess-drag-piece').forEach(element => {
      if (element.parentNode) {
        element.parentNode.removeChild(element)
      }
    })
    
    // Clean up current drag state
    if (this.draggedPiece) {
      if (this.draggedPiece.element && this.draggedPiece.element.parentNode) {
        this.draggedPiece.element.parentNode.removeChild(this.draggedPiece.element)
      }
      this.draggedPiece = null
    }
  }

  /**
   * Destroy the component
   */
  destroy() {
    this.cleanupDragArtifacts()
    this.container.innerHTML = ''
  }
}