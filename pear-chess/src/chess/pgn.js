/**
 * Pear's Gambit - PGN Import/Export
 * 
 * Handles Portable Game Notation (PGN) for game import/export
 */

/**
 * PGN Handler for chess game import/export
 */
export class PgnHandler {
  constructor() {
    this.standardTags = [
      'Event', 'Site', 'Date', 'Round', 'White', 'Black', 'Result'
    ]
    
    this.optionalTags = [
      'WhiteElo', 'BlackElo', 'TimeControl', 'ECO', 'Opening', 'Variation',
      'Annotator', 'PlyCount', 'FEN', 'SetUp'
    ]
  }

  /**
   * Generate PGN from game data
   * @param {Object} gameData - Complete game information
   * @returns {string} PGN formatted string
   */
  generatePgn(gameData) {
    let pgn = ''

    // Add tags
    pgn += this.generateTags(gameData)
    pgn += '\n'

    // Add moves
    pgn += this.generateMovetext(gameData.moves)
    
    // Add result
    pgn += ' ' + this.formatResult(gameData.result)

    return pgn
  }

  /**
   * Generate PGN tags section
   * @param {Object} gameData - Game data
   * @returns {string} Formatted tags
   */
  generateTags(gameData) {
    const tags = []
    
    // Standard tags
    tags.push(`[Event "${gameData.event || 'Pear\'s Gambit Game'}"]`)
    tags.push(`[Site "${gameData.site || 'P2P Network'}"]`)
    tags.push(`[Date "${this.formatDate(gameData.date || new Date())}"]`)
    tags.push(`[Round "${gameData.round || '1'}"]`)
    tags.push(`[White "${gameData.players?.white || 'Unknown'}"]`)
    tags.push(`[Black "${gameData.players?.black || 'Unknown'}"]`)
    tags.push(`[Result "${this.formatResult(gameData.result)}"]`)

    // Optional tags
    if (gameData.whiteElo) {
      tags.push(`[WhiteElo "${gameData.whiteElo}"]`)
    }
    if (gameData.blackElo) {
      tags.push(`[BlackElo "${gameData.blackElo}"]`)
    }
    if (gameData.timeControl) {
      tags.push(`[TimeControl "${this.formatTimeControl(gameData.timeControl)}"]`)
    }
    if (gameData.opening?.eco) {
      tags.push(`[ECO "${gameData.opening.eco}"]`)
    }
    if (gameData.opening?.name) {
      tags.push(`[Opening "${gameData.opening.name}"]`)
    }
    if (gameData.startFen && gameData.startFen !== 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1') {
      tags.push(`[SetUp "1"]`)
      tags.push(`[FEN "${gameData.startFen}"]`)
    }
    if (gameData.moves) {
      tags.push(`[PlyCount "${gameData.moves.length}"]`)
    }

    // Custom Pear's Gambit tags
    tags.push(`[GameId "${gameData.gameId || 'unknown'}"]`)
    if (gameData.networkId) {
      tags.push(`[NetworkId "${gameData.networkId}"]`)
    }

    return tags.join('\n')
  }

  /**
   * Generate movetext section
   * @param {Array} moves - Array of move objects
   * @returns {string} Formatted movetext
   */
  generateMovetext(moves) {
    if (!moves || moves.length === 0) {
      return ''
    }

    let movetext = ''
    let moveNumber = 1
    
    for (let i = 0; i < moves.length; i++) {
      const move = moves[i]
      
      // Add move number for white moves
      if (i % 2 === 0) {
        movetext += `${moveNumber}. `
      }
      
      // Add the move
      movetext += move.san

      // Add annotations if present
      if (move.annotations) {
        movetext += this.formatAnnotations(move.annotations)
      }

      // Add comments if present
      if (move.comment) {
        movetext += ` {${move.comment}}`
      }

      // Add space or newline for formatting
      if (i < moves.length - 1) {
        movetext += ' '
        
        // Add newline every 8 moves for readability
        if ((i + 1) % 16 === 0) {
          movetext += '\n'
        }
      }

      // Increment move number after black's move
      if (i % 2 === 1) {
        moveNumber++
      }
    }

    return movetext
  }

  /**
   * Format game result for PGN
   * @param {Object} result - Game result object
   * @returns {string} PGN result format
   */
  formatResult(result) {
    if (!result) return '*'

    switch (result.result) {
      case 'checkmate':
        return result.winner === 'white' ? '1-0' : '0-1'
      case 'resignation':
        return result.winner === 'white' ? '1-0' : '0-1'
      case 'timeout':
        return result.winner === 'white' ? '1-0' : '0-1'
      case 'stalemate':
      case 'draw':
      case 'threefold_repetition':
      case 'insufficient_material':
      case 'fifty_move_rule':
        return '1/2-1/2'
      default:
        return '*'
    }
  }

  /**
   * Format date for PGN
   * @param {Date} date - Date object
   * @returns {string} PGN date format (YYYY.MM.DD)
   */
  formatDate(date) {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}.${month}.${day}`
  }

  /**
   * Format time control for PGN
   * @param {Object} timeControl - Time control object
   * @returns {string} PGN time control format
   */
  formatTimeControl(timeControl) {
    if (timeControl.type === 'classical') {
      return `${timeControl.initialTime}`
    } else if (timeControl.type === 'increment') {
      return `${timeControl.initialTime}+${timeControl.increment}`
    } else if (timeControl.type === 'correspondence') {
      return `${timeControl.daysPerMove}d`
    }
    return 'unknown'
  }

  /**
   * Format move annotations
   * @param {Object} annotations - Move annotations
   * @returns {string} Formatted annotations
   */
  formatAnnotations(annotations) {
    let result = ''
    
    if (annotations.nag) {
      // Numeric Annotation Glyphs
      result += ` $${annotations.nag}`
    }
    
    if (annotations.quality) {
      // Move quality symbols
      const symbols = {
        'brilliant': '!!',
        'good': '!',
        'interesting': '!?',
        'dubious': '?!',
        'mistake': '?',
        'blunder': '??'
      }
      result += symbols[annotations.quality] || ''
    }
    
    return result
  }

  /**
   * Parse PGN string into game data
   * @param {string} pgnString - PGN formatted string
   * @returns {Object} Parsed game data
   */
  parsePgn(pgnString) {
    const lines = pgnString.trim().split('\n')
    const gameData = {
      tags: {},
      moves: [],
      comments: {},
      result: null
    }

    let inTags = true
    let movetext = ''

    // Parse tags and collect movetext
    for (const line of lines) {
      const trimmedLine = line.trim()
      
      if (trimmedLine.startsWith('[') && trimmedLine.endsWith(']')) {
        // Parse tag
        const tagMatch = trimmedLine.match(/^\[(\w+)\s+"(.*)"\]$/)
        if (tagMatch) {
          gameData.tags[tagMatch[1]] = tagMatch[2]
        }
      } else if (trimmedLine.length > 0 && inTags) {
        inTags = false
        movetext += trimmedLine + ' '
      } else if (!inTags && trimmedLine.length > 0) {
        movetext += trimmedLine + ' '
      }
    }

    // Parse movetext
    if (movetext.trim()) {
      this.parseMovetext(movetext.trim(), gameData)
    }

    // Extract standard information
    this.extractGameInfo(gameData)

    return gameData
  }

  /**
   * Parse movetext section
   * @param {string} movetext - Movetext string
   * @param {Object} gameData - Game data object to populate
   */
  parseMovetext(movetext, gameData) {
    // Remove result from end
    const resultPattern = /\s*(1-0|0-1|1\/2-1\/2|\*)\s*$/
    const resultMatch = movetext.match(resultPattern)
    if (resultMatch) {
      gameData.result = this.parseResult(resultMatch[1])
      movetext = movetext.replace(resultPattern, '')
    }

    // Split into tokens
    const tokens = movetext.split(/\s+/).filter(token => token.length > 0)
    
    let i = 0
    while (i < tokens.length) {
      const token = tokens[i]
      
      // Skip move numbers
      if (token.match(/^\d+\.$/)) {
        i++
        continue
      }
      
      // Handle comments
      if (token.startsWith('{')) {
        let comment = token.substring(1)
        i++
        
        // Collect full comment
        while (i < tokens.length && !comment.includes('}')) {
          comment += ' ' + tokens[i]
          i++
        }
        
        comment = comment.replace('}', '')
        
        // Associate comment with last move
        if (gameData.moves.length > 0) {
          gameData.moves[gameData.moves.length - 1].comment = comment
        }
        
        i++
        continue
      }
      
      // Skip annotations and variations for now
      if (token.startsWith('(') || token.match(/^[\!\?\$]/)) {
        i++
        continue
      }
      
      // Process move
      if (this.isValidMoveToken(token)) {
        const move = this.parseMove(token, gameData.moves.length)
        gameData.moves.push(move)
      }
      
      i++
    }
  }

  /**
   * Check if token is a valid move
   * @param {string} token - Token to check
   * @returns {boolean} True if valid move
   */
  isValidMoveToken(token) {
    // Basic move pattern (simplified)
    return /^[NBRQK]?[a-h]?[1-8]?x?[a-h][1-8](=[NBRQ])?[\+#]?[\!\?]*$/.test(token) ||
           /^O-O(-O)?[\+#]?[\!\?]*$/.test(token)
  }

  /**
   * Parse individual move
   * @param {string} moveToken - Move token
   * @param {number} plyNumber - Ply number
   * @returns {Object} Move object
   */
  parseMove(moveToken, plyNumber) {
    // Strip annotations
    const cleanMove = moveToken.replace(/[\!\?\$\d]*$/, '')
    
    return {
      san: cleanMove,
      ply: plyNumber,
      annotations: this.extractAnnotations(moveToken)
    }
  }

  /**
   * Extract annotations from move token
   * @param {string} moveToken - Move token with annotations
   * @returns {Object} Annotations object
   */
  extractAnnotations(moveToken) {
    const annotations = {}
    
    if (moveToken.includes('!!')) annotations.quality = 'brilliant'
    else if (moveToken.includes('!?')) annotations.quality = 'interesting'
    else if (moveToken.includes('?!')) annotations.quality = 'dubious'
    else if (moveToken.includes('??')) annotations.quality = 'blunder'
    else if (moveToken.includes('!')) annotations.quality = 'good'
    else if (moveToken.includes('?')) annotations.quality = 'mistake'
    
    return Object.keys(annotations).length > 0 ? annotations : null
  }

  /**
   * Parse result string
   * @param {string} resultString - Result in PGN format
   * @returns {Object} Result object
   */
  parseResult(resultString) {
    switch (resultString) {
      case '1-0':
        return { result: 'win', winner: 'white' }
      case '0-1':
        return { result: 'win', winner: 'black' }
      case '1/2-1/2':
        return { result: 'draw', winner: null }
      case '*':
      default:
        return { result: 'ongoing', winner: null }
    }
  }

  /**
   * Extract game information from tags
   * @param {Object} gameData - Game data with tags
   */
  extractGameInfo(gameData) {
    const tags = gameData.tags
    
    gameData.event = tags.Event
    gameData.site = tags.Site
    gameData.date = tags.Date ? this.parseDate(tags.Date) : null
    gameData.round = tags.Round
    gameData.players = {
      white: tags.White,
      black: tags.Black
    }
    
    if (tags.WhiteElo) gameData.whiteElo = parseInt(tags.WhiteElo)
    if (tags.BlackElo) gameData.blackElo = parseInt(tags.BlackElo)
    
    if (tags.TimeControl) {
      gameData.timeControl = this.parseTimeControl(tags.TimeControl)
    }
    
    if (tags.ECO) {
      gameData.opening = gameData.opening || {}
      gameData.opening.eco = tags.ECO
    }
    
    if (tags.Opening) {
      gameData.opening = gameData.opening || {}
      gameData.opening.name = tags.Opening
    }
    
    if (tags.FEN) {
      gameData.startFen = tags.FEN
    }
    
    // Pear's Gambit specific tags
    if (tags.GameId) gameData.gameId = tags.GameId
    if (tags.NetworkId) gameData.networkId = tags.NetworkId
  }

  /**
   * Parse PGN date format
   * @param {string} dateString - Date in YYYY.MM.DD format
   * @returns {Date} Date object
   */
  parseDate(dateString) {
    const parts = dateString.split('.')
    if (parts.length === 3) {
      return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]))
    }
    return new Date()
  }

  /**
   * Parse time control string
   * @param {string} timeControlString - Time control in various formats
   * @returns {Object} Time control object
   */
  parseTimeControl(timeControlString) {
    if (timeControlString.includes('+')) {
      const parts = timeControlString.split('+')
      return {
        type: 'increment',
        initialTime: parseInt(parts[0]),
        increment: parseInt(parts[1])
      }
    } else if (timeControlString.includes('d')) {
      return {
        type: 'correspondence',
        daysPerMove: parseInt(timeControlString.replace('d', ''))
      }
    } else {
      return {
        type: 'classical',
        initialTime: parseInt(timeControlString)
      }
    }
  }
}

// Export singleton instance
export const pgnHandler = new PgnHandler()