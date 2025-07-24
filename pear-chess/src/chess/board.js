/**
 * Pear's Gambit - Chess Board Logic
 * 
 * Handles board representation, coordinate conversion, and piece positioning
 */

/**
 * Chess Board Representation
 * Provides utilities for working with chess board coordinates and piece positions
 */
export class ChessBoard {
  constructor() {
    this.files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
    this.ranks = ['1', '2', '3', '4', '5', '6', '7', '8']
  }

  /**
   * Convert algebraic notation to array indices
   * @param {string} square - Square in algebraic notation (e.g., 'e4')
   * @returns {Object} {file: number, rank: number}
   */
  squareToIndices(square) {
    if (!square || square.length !== 2) {
      throw new Error('Invalid square notation')
    }

    const file = square[0].toLowerCase()
    const rank = square[1]

    const fileIndex = this.files.indexOf(file)
    const rankIndex = this.ranks.indexOf(rank)

    if (fileIndex === -1 || rankIndex === -1) {
      throw new Error('Invalid square notation')
    }

    return { file: fileIndex, rank: rankIndex }
  }

  /**
   * Convert array indices to algebraic notation
   * @param {number} fileIndex - File index (0-7)
   * @param {number} rankIndex - Rank index (0-7)
   * @returns {string} Square in algebraic notation
   */
  indicesToSquare(fileIndex, rankIndex) {
    if (fileIndex < 0 || fileIndex > 7 || rankIndex < 0 || rankIndex > 7) {
      throw new Error('Invalid indices')
    }

    return this.files[fileIndex] + this.ranks[rankIndex]
  }

  /**
   * Check if a square is valid
   * @param {string} square - Square in algebraic notation
   * @returns {boolean}
   */
  isValidSquare(square) {
    try {
      this.squareToIndices(square)
      return true
    } catch {
      return false
    }
  }

  /**
   * Get all squares on the board
   * @returns {string[]} Array of all squares
   */
  getAllSquares() {
    const squares = []
    for (let rank = 0; rank < 8; rank++) {
      for (let file = 0; file < 8; file++) {
        squares.push(this.indicesToSquare(file, rank))
      }
    }
    return squares
  }

  /**
   * Check if square is light or dark
   * @param {string} square - Square in algebraic notation
   * @returns {string} 'light' or 'dark'
   */
  getSquareColor(square) {
    const { file, rank } = this.squareToIndices(square)
    return (file + rank) % 2 === 0 ? 'dark' : 'light'
  }

  /**
   * Get distance between two squares
   * @param {string} square1 - First square
   * @param {string} square2 - Second square
   * @returns {Object} {files: number, ranks: number, total: number}
   */
  getDistance(square1, square2) {
    const pos1 = this.squareToIndices(square1)
    const pos2 = this.squareToIndices(square2)

    const fileDistance = Math.abs(pos2.file - pos1.file)
    const rankDistance = Math.abs(pos2.rank - pos1.rank)
    const totalDistance = Math.max(fileDistance, rankDistance)

    return {
      files: fileDistance,
      ranks: rankDistance,
      total: totalDistance
    }
  }

  /**
   * Check if two squares are on the same file
   * @param {string} square1 - First square
   * @param {string} square2 - Second square
   * @returns {boolean}
   */
  sameFile(square1, square2) {
    return square1[0] === square2[0]
  }

  /**
   * Check if two squares are on the same rank
   * @param {string} square1 - First square
   * @param {string} square2 - Second square
   * @returns {boolean}
   */
  sameRank(square1, square2) {
    return square1[1] === square2[1]
  }

  /**
   * Check if two squares are on the same diagonal
   * @param {string} square1 - First square
   * @param {string} square2 - Second square
   * @returns {boolean}
   */
  sameDiagonal(square1, square2) {
    const distance = this.getDistance(square1, square2)
    return distance.files === distance.ranks
  }

  /**
   * Get squares in a direction from a starting square
   * @param {string} startSquare - Starting square
   * @param {Object} direction - {file: number, rank: number} direction vector
   * @param {number} maxDistance - Maximum distance to travel
   * @returns {string[]} Array of squares in the direction
   */
  getSquaresInDirection(startSquare, direction, maxDistance = 7) {
    const squares = []
    const start = this.squareToIndices(startSquare)
    
    for (let i = 1; i <= maxDistance; i++) {
      const newFile = start.file + (direction.file * i)
      const newRank = start.rank + (direction.rank * i)
      
      if (newFile < 0 || newFile > 7 || newRank < 0 || newRank > 7) {
        break
      }
      
      squares.push(this.indicesToSquare(newFile, newRank))
    }
    
    return squares
  }

  /**
   * Get all squares in a rank
   * @param {string} rank - Rank number ('1'-'8')
   * @returns {string[]} Array of squares in the rank
   */
  getRankSquares(rank) {
    if (!this.ranks.includes(rank)) {
      throw new Error('Invalid rank')
    }
    
    return this.files.map(file => file + rank)
  }

  /**
   * Get all squares in a file
   * @param {string} file - File letter ('a'-'h')
   * @returns {string[]} Array of squares in the file
   */
  getFileSquares(file) {
    if (!this.files.includes(file.toLowerCase())) {
      throw new Error('Invalid file')
    }
    
    return this.ranks.map(rank => file.toLowerCase() + rank)
  }

  /**
   * Mirror a square (for flipping board perspective)
   * @param {string} square - Square to mirror
   * @returns {string} Mirrored square
   */
  mirrorSquare(square) {
    const { file, rank } = this.squareToIndices(square)
    return this.indicesToSquare(file, 7 - rank)
  }

  /**
   * Parse board representation from chess.js into a more usable format
   * @param {Array} chessJsBoard - Board from chess.js board() method
   * @returns {Object} Board representation with pieces by square
   */
  parseBoardArray(chessJsBoard) {
    const board = {}
    
    for (let rank = 0; rank < 8; rank++) {
      for (let file = 0; file < 8; file++) {
        const piece = chessJsBoard[7 - rank][file] // chess.js uses rank 7 = rank 8
        const square = this.indicesToSquare(file, rank)
        
        if (piece) {
          board[square] = {
            type: piece.type,
            color: piece.color,
            symbol: piece.color === 'w' ? piece.type.toUpperCase() : piece.type.toLowerCase()
          }
        } else {
          board[square] = null
        }
      }
    }
    
    return board
  }

  /**
   * Get piece symbol for display
   * @param {string} type - Piece type (p, n, b, r, q, k)
   * @param {string} color - Piece color (w, b)
   * @returns {string} Unicode chess symbol
   */
  getPieceSymbol(type, color) {
    const symbols = {
      'w': {
        'k': '♔', 'q': '♕', 'r': '♖', 'b': '♗', 'n': '♘', 'p': '♙'
      },
      'b': {
        'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟'
      }
    }
    
    return symbols[color]?.[type] || '?'
  }

  /**
   * Create ASCII representation of the board
   * @param {Object} boardState - Board state from parseBoardArray
   * @returns {string} ASCII board representation
   */
  toAscii(boardState) {
    let ascii = '\n  +---+---+---+---+---+---+---+---+\n'
    
    for (let rank = 7; rank >= 0; rank--) {
      ascii += (rank + 1) + ' |'
      
      for (let file = 0; file < 8; file++) {
        const square = this.indicesToSquare(file, rank)
        const piece = boardState[square]
        const symbol = piece ? this.getPieceSymbol(piece.type, piece.color) : ' '
        ascii += ` ${symbol} |`
      }
      
      ascii += '\n  +---+---+---+---+---+---+---+---+\n'
    }
    
    ascii += '    a   b   c   d   e   f   g   h\n'
    
    return ascii
  }
}

// Export singleton instance
export const chessBoard = new ChessBoard()