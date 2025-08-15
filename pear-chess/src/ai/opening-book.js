/**
 * Pear's Gambit - Opening Book
 * 
 * Chess opening database and move suggestions
 */

/**
 * Opening Book Manager
 * Provides opening theory moves and explanations
 */
export class OpeningBook {
  constructor() {
    // Popular openings with their main lines
    this.openings = new Map([
      // Italian Game
      ['1.e4 e5 2.Nf3 Nc6 3.Bc4', {
        name: 'Italian Game',
        eco: 'C50-C54',
        moves: ['Bc5', 'Nf6', 'f5'],
        description: 'A classical opening focusing on quick development and center control'
      }],
      
      // Spanish Opening (Ruy Lopez)
      ['1.e4 e5 2.Nf3 Nc6 3.Bb5', {
        name: 'Spanish Opening (Ruy Lopez)',
        eco: 'C60-C99',
        moves: ['a6', 'Nf6', 'f5'],
        description: 'One of the oldest and most respected openings, putting pressure on Black\'s center'
      }],
      
      // Sicilian Defense
      ['1.e4 c5', {
        name: 'Sicilian Defense',
        eco: 'B20-B99',
        moves: ['2.Nf3', '2.Nc3', '2.c3'],
        description: 'The most popular defense, leading to sharp, complex positions'
      }],
      
      // French Defense
      ['1.e4 e6', {
        name: 'French Defense',
        eco: 'C00-C19',
        moves: ['2.d4', '2.Nf3', '2.Nc3'],
        description: 'A solid defense that often leads to closed positions'
      }],
      
      // Queen\'s Gambit
      ['1.d4 d5 2.c4', {
        name: 'Queen\'s Gambit',
        eco: 'D06-D69',
        moves: ['e6', 'dxc4', 'c6'],
        description: 'A classical opening offering a pawn to gain center control'
      }],
      
      // King\'s Indian Defense
      ['1.d4 Nf6 2.c4 g6', {
        name: 'King\'s Indian Defense',
        eco: 'E60-E99',
        moves: ['3.Nc3', '3.Nf3', '3.g3'],
        description: 'A hypermodern defense allowing White to build a center'
      }],
      
      // English Opening
      ['1.c4', {
        name: 'English Opening',
        eco: 'A10-A39',
        moves: ['e5', 'Nf6', 'c5'],
        description: 'A flexible opening that can transpose into many different systems'
      }],
      
      // Caro-Kann Defense
      ['1.e4 c6', {
        name: 'Caro-Kann Defense',
        eco: 'B10-B19',
        moves: ['2.d4', '2.Nc3', '2.Nf3'],
        description: 'A solid defense aiming for a strong pawn structure'
      }]
    ])
    
    // ECO code to opening name mapping
    this.ecoMap = {
      'A': 'Flank Openings',
      'B': 'Semi-Open Games',
      'C': 'Open Games',
      'D': 'Closed Games',
      'E': 'Indian Defenses'
    }
    
    // Common opening principles
    this.principles = [
      'Control the center with pawns',
      'Develop knights before bishops',
      'Castle early for king safety',
      'Don\'t move the same piece twice in the opening',
      'Don\'t bring your queen out too early',
      'Connect your rooks',
      'Avoid creating weaknesses in your position'
    ]
    
    // Transposition detection
    this.transpositions = new Map()
  }

  /**
   * Get opening information from moves
   * @param {string[]} moves - Array of moves in UCI or SAN format
   * @returns {Object} Opening information
   */
  getOpening(moves) {
    if (!moves || moves.length === 0) {
      return {
        name: 'Starting Position',
        eco: 'A00',
        description: 'The initial chess position',
        book: true,
        suggestions: this.getStartingMoves()
      }
    }
    
    // Convert moves to standard notation for lookup
    const moveLine = this.formatMoveLine(moves)
    
    // Look for exact match
    for (const [line, opening] of this.openings) {
      if (moveLine.startsWith(line)) {
        return {
          ...opening,
          line,
          book: true,
          suggestions: this.getSuggestions(line, moveLine)
        }
      }
    }
    
    // Check for transpositions
    const position = this.getPositionKey(moves)
    if (this.transpositions.has(position)) {
      return this.transpositions.get(position)
    }
    
    // No known opening found
    return {
      name: 'Unknown Opening',
      eco: '---',
      description: 'Position not in opening book',
      book: false,
      suggestions: []
    }
  }

  /**
   * Get starting move suggestions
   * @returns {Array} Suggested starting moves
   */
  getStartingMoves() {
    return [
      { move: 'e4', name: 'King\'s Pawn', popularity: 45 },
      { move: 'd4', name: 'Queen\'s Pawn', popularity: 35 },
      { move: 'Nf3', name: 'Réti Opening', popularity: 10 },
      { move: 'c4', name: 'English Opening', popularity: 8 },
      { move: 'g3', name: 'Benko Opening', popularity: 2 }
    ]
  }

  /**
   * Get move suggestions for current position
   * @param {string} openingLine - Known opening line
   * @param {string} currentLine - Current move sequence
   * @returns {Array} Suggested moves
   */
  getSuggestions(openingLine, currentLine) {
    const opening = this.openings.get(openingLine)
    if (!opening || !opening.moves) return []
    
    return opening.moves.map(move => ({
      move,
      theory: true,
      description: `Main line continuation`
    }))
  }

  /**
   * Format move line for comparison
   * @param {string[]} moves - Array of moves
   * @returns {string} Formatted move line
   */
  formatMoveLine(moves) {
    const formatted = []
    for (let i = 0; i < moves.length; i++) {
      if (i % 2 === 0) {
        formatted.push(`${Math.floor(i / 2) + 1}.`)
      }
      formatted.push(this.normalizeMove(moves[i]))
    }
    return formatted.join(' ')
  }

  /**
   * Normalize move notation
   * @param {string} move - Move in any format
   * @returns {string} Normalized move
   */
  normalizeMove(move) {
    // Simple normalization - in production would be more sophisticated
    return move.replace(/[+#]/, '')
  }

  /**
   * Get position key for transposition detection
   * @param {string[]} moves - Array of moves
   * @returns {string} Position key
   */
  getPositionKey(moves) {
    // In a real implementation, this would generate a position hash
    return moves.sort().join(',')
  }

  /**
   * Check if position is still in book
   * @param {string[]} moves - Array of moves
   * @returns {boolean} True if in book
   */
  isInBook(moves) {
    const opening = this.getOpening(moves)
    return opening.book
  }

  /**
   * Get opening principles for education
   * @returns {Array} Opening principles
   */
  getOpeningPrinciples() {
    return this.principles
  }

  /**
   * Get ECO classification
   * @param {string} eco - ECO code
   * @returns {string} Classification name
   */
  getECOClassification(eco) {
    if (!eco || eco === '---') return 'Unclassified'
    const letter = eco[0]
    return this.ecoMap[letter] || 'Unknown'
  }

  /**
   * Search openings by name
   * @param {string} query - Search query
   * @returns {Array} Matching openings
   */
  searchOpenings(query) {
    const results = []
    const lowerQuery = query.toLowerCase()
    
    for (const [line, opening] of this.openings) {
      if (opening.name.toLowerCase().includes(lowerQuery)) {
        results.push({ line, ...opening })
      }
    }
    
    return results
  }

  /**
   * Get popular responses to a move
   * @param {string[]} moves - Current moves
   * @returns {Array} Popular responses with statistics
   */
  getPopularResponses(moves) {
    // In a real implementation, this would use a database
    // For now, return some common responses
    
    if (moves.length === 0) {
      return this.getStartingMoves()
    }
    
    // Simplified response generation
    const lastMove = moves[moves.length - 1]
    
    if (lastMove === 'e4' || lastMove === 'e2e4') {
      return [
        { move: 'e5', name: 'King\'s Pawn Game', popularity: 30, winRate: 48 },
        { move: 'c5', name: 'Sicilian Defense', popularity: 35, winRate: 51 },
        { move: 'e6', name: 'French Defense', popularity: 15, winRate: 49 },
        { move: 'c6', name: 'Caro-Kann Defense', popularity: 10, winRate: 50 },
        { move: 'd5', name: 'Scandinavian Defense', popularity: 5, winRate: 47 }
      ]
    }
    
    if (lastMove === 'd4' || lastMove === 'd2d4') {
      return [
        { move: 'd5', name: 'Closed Game', popularity: 35, winRate: 49 },
        { move: 'Nf6', name: 'Indian Defense', popularity: 40, winRate: 50 },
        { move: 'f5', name: 'Dutch Defense', popularity: 5, winRate: 46 },
        { move: 'e6', name: 'French-like', popularity: 10, winRate: 48 }
      ]
    }
    
    return []
  }

  /**
   * Get opening study recommendations
   * @param {string} playerLevel - Player skill level
   * @returns {Array} Recommended openings to study
   */
  getStudyRecommendations(playerLevel = 'intermediate') {
    const recommendations = {
      beginner: [
        { opening: 'Italian Game', reason: 'Natural development and clear plans' },
        { opening: 'London System', reason: 'Simple setup that works against many defenses' },
        { opening: 'King\'s Indian Attack', reason: 'Flexible system with standard patterns' }
      ],
      intermediate: [
        { opening: 'Spanish Opening', reason: 'Rich middlegame positions' },
        { opening: 'Queen\'s Gambit', reason: 'Classical chess understanding' },
        { opening: 'Sicilian Defense', reason: 'Sharp tactical play' }
      ],
      advanced: [
        { opening: 'Najdorf Sicilian', reason: 'Complex theoretical battles' },
        { opening: 'Grünfeld Defense', reason: 'Dynamic counterplay' },
        { opening: 'Semi-Slav Defense', reason: 'Strategic complexity' }
      ]
    }
    
    return recommendations[playerLevel] || recommendations.intermediate
  }
}