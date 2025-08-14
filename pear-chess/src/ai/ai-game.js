/**
 * Pear's Gambit - AI vs AI Game Mode
 * 
 * Automated chess matches between AI engines
 */

import { SimpleStockfishEngine } from './external-engine-simple.js'
import { OpeningBook } from './opening-book.js'
import { Chess } from 'chess.js'
import { EventEmitter } from 'events'

/**
 * AI vs AI Game Manager
 * Orchestrates matches between AI engines
 */
export class AIGame extends EventEmitter {
  constructor(options = {}) {
    super()
    
    this.options = {
      whiteEngine: options.whiteEngine || { depth: 15, skillLevel: 20 },
      blackEngine: options.blackEngine || { depth: 15, skillLevel: 20 },
      moveTime: options.moveTime || 1000, // ms per move
      debug: options.debug || false,
      useOpeningBook: options.useOpeningBook !== false,
      bookDepth: options.bookDepth || 8,
      ...options
    }
    
    this.game = new Chess()
    this.whiteEngine = null
    this.blackEngine = null
    this.openingBook = new OpeningBook()
    
    this.gameState = {
      moves: [],
      evaluations: [],
      timeUsed: { white: 0, black: 0 },
      isPlaying: false,
      currentPlayer: 'white',
      result: null
    }
  }

  /**
   * Initialize both engines
   */
  async initialize() {
    this.emit('status', 'Initializing engines...')
    
    // Initialize White engine
    this.whiteEngine = new SimpleStockfishEngine({
      ...this.options.whiteEngine,
      debug: this.options.debug
    })
    await this.whiteEngine.start()
    
    // Initialize Black engine
    this.blackEngine = new SimpleStockfishEngine({
      ...this.options.blackEngine,
      debug: this.options.debug
    })
    await this.blackEngine.start()
    
    this.emit('status', 'Engines initialized')
    this.emit('engines-ready', {
      white: this.whiteEngine,
      black: this.blackEngine
    })
  }

  /**
   * Start a new AI vs AI game
   */
  async startGame() {
    if (this.gameState.isPlaying) {
      throw new Error('Game already in progress')
    }
    
    await this.initialize()
    
    this.game.reset()
    this.gameState = {
      moves: [],
      evaluations: [],
      timeUsed: { white: 0, black: 0 },
      isPlaying: true,
      currentPlayer: 'white',
      result: null
    }
    
    this.emit('game-start', {
      fen: this.game.fen(),
      turn: this.game.turn()
    })
    
    // Start the game loop
    this.playNextMove()
  }

  /**
   * Play the next move in the game
   */
  async playNextMove() {
    if (!this.gameState.isPlaying || this.game.isGameOver()) {
      return this.endGame()
    }
    
    const isWhite = this.game.turn() === 'w'
    const engine = isWhite ? this.whiteEngine : this.blackEngine
    const player = isWhite ? 'white' : 'black'
    
    this.emit('thinking', {
      player,
      fen: this.game.fen(),
      moveNumber: Math.floor(this.game.moveNumber())
    })
    
    const startTime = Date.now()
    let move = null
    
    try {
      // Check if we should use opening book
      if (this.options.useOpeningBook && this.game.moveNumber() <= this.options.bookDepth) {
        move = await this.getBookMove()
      }
      
      // If no book move, use engine
      if (!move) {
        move = await this.getEngineMove(engine, player)
      }
      
      const endTime = Date.now()
      const timeUsed = endTime - startTime
      this.gameState.timeUsed[player] += timeUsed
      
      // Make the move
      const moveObj = this.game.move(move)
      if (!moveObj) {
        throw new Error(`Invalid move: ${move}`)
      }
      
      // Update game state
      this.gameState.moves.push({
        san: moveObj.san,
        uci: moveObj.from + moveObj.to + (moveObj.promotion || ''),
        player,
        timeUsed,
        fen: this.game.fen()
      })
      
      this.emit('move', {
        move: moveObj,
        player,
        timeUsed,
        fen: this.game.fen(),
        moveNumber: Math.floor(this.game.moveNumber()),
        evaluation: null // Will be filled by analysis if requested
      })
      
      // Schedule next move
      setTimeout(() => this.playNextMove(), 100)
      
    } catch (error) {
      this.emit('error', {
        player,
        error: error.message,
        fen: this.game.fen()
      })
      this.endGame()
    }
  }

  /**
   * Get a move from the opening book
   */
  async getBookMove() {
    const moves = this.game.history()
    const opening = this.openingBook.getOpening(moves)
    
    if (!opening.book || !opening.suggestions || opening.suggestions.length === 0) {
      return null
    }
    
    // Pick a random suggestion from the book
    const suggestion = opening.suggestions[Math.floor(Math.random() * opening.suggestions.length)]
    
    // Validate the move is legal
    try {
      const testGame = new Chess(this.game.fen())
      const moveObj = testGame.move(suggestion.move)
      return moveObj ? suggestion.move : null
    } catch {
      return null
    }
  }

  /**
   * Get a move from the engine
   */
  async getEngineMove(engine, player) {
    // Set position
    await engine.position(this.game.fen())
    
    // Get the move
    const result = await engine.go({
      movetime: this.options.moveTime
    })
    
    if (!result.bestMove) {
      throw new Error('Engine returned no move')
    }
    
    return result.bestMove
  }

  /**
   * End the current game
   */
  endGame() {
    this.gameState.isPlaying = false
    
    // Determine result
    let result = '*'
    let reason = 'Unknown'
    
    if (this.game.isCheckmate()) {
      result = this.game.turn() === 'w' ? '0-1' : '1-0'
      reason = 'Checkmate'
    } else if (this.game.isDraw()) {
      result = '1/2-1/2'
      if (this.game.isStalemate()) reason = 'Stalemate'
      else if (this.game.isThreefoldRepetition()) reason = 'Threefold repetition'
      else if (this.game.isInsufficientMaterial()) reason = 'Insufficient material'
      else if (this.game.isDraw()) reason = 'Draw'
    }
    
    this.gameState.result = { result, reason }
    
    this.emit('game-end', {
      result,
      reason,
      moves: this.gameState.moves,
      timeUsed: this.gameState.timeUsed,
      finalFen: this.game.fen(),
      pgn: this.game.pgn()
    })
  }

  /**
   * Stop the current game
   */
  async stopGame() {
    this.gameState.isPlaying = false
    this.emit('game-stopped')
  }

  /**
   * Get current game state
   */
  getGameState() {
    return {
      ...this.gameState,
      fen: this.game.fen(),
      turn: this.game.turn(),
      moveNumber: this.game.moveNumber(),
      isGameOver: this.game.isGameOver(),
      pgn: this.game.pgn()
    }
  }

  /**
   * Analyze the completed game
   */
  async analyzeGame() {
    if (this.gameState.isPlaying) {
      throw new Error('Cannot analyze game in progress')
    }
    
    const { GameAnalyzer } = await import('./game-analyzer.js')
    const analyzer = new GameAnalyzer({
      debug: this.options.debug
    })
    
    try {
      const analysis = await analyzer.analyzeGame(this.game.pgn())
      await analyzer.shutdown()
      return analysis
    } catch (error) {
      await analyzer.shutdown()
      throw error
    }
  }

  /**
   * Set engine parameters
   */
  async setEngineOptions(color, options) {
    const engine = color === 'white' ? this.whiteEngine : this.blackEngine
    if (!engine) return
    
    for (const [name, value] of Object.entries(options)) {
      await engine.setOption(name, value)
    }
  }

  /**
   * Get engine information
   */
  getEngineInfo() {
    return {
      white: this.options.whiteEngine,
      black: this.options.blackEngine,
      initialized: !!(this.whiteEngine && this.blackEngine)
    }
  }

  /**
   * Cleanup resources
   */
  async shutdown() {
    this.gameState.isPlaying = false
    
    if (this.whiteEngine) {
      await this.whiteEngine.quit()
      this.whiteEngine = null
    }
    
    if (this.blackEngine) {
      await this.blackEngine.quit()
      this.blackEngine = null
    }
    
    this.emit('shutdown')
  }
}

/**
 * Tournament Manager for multiple AI games
 */
export class AITournament extends EventEmitter {
  constructor(options = {}) {
    super()
    
    this.options = {
      rounds: options.rounds || 10,
      timeControl: options.timeControl || 1000,
      engines: options.engines || [
        { name: 'Stockfish Level 15', depth: 12, skillLevel: 15 },
        { name: 'Stockfish Level 20', depth: 15, skillLevel: 20 }
      ],
      ...options
    }
    
    this.games = []
    this.results = []
    this.currentGame = 0
    this.isRunning = false
  }

  /**
   * Start the tournament
   */
  async startTournament() {
    if (this.isRunning) {
      throw new Error('Tournament already running')
    }
    
    this.isRunning = true
    this.results = []
    this.currentGame = 0
    
    this.emit('tournament-start', {
      rounds: this.options.rounds,
      engines: this.options.engines
    })
    
    for (let round = 0; round < this.options.rounds && this.isRunning; round++) {
      await this.playRound(round)
    }
    
    this.endTournament()
  }

  /**
   * Play a single round
   */
  async playRound(round) {
    const whiteEngine = this.options.engines[round % 2]
    const blackEngine = this.options.engines[(round + 1) % 2]
    
    this.emit('round-start', { round, whiteEngine, blackEngine })
    
    const game = new AIGame({
      whiteEngine,
      blackEngine,
      moveTime: this.options.timeControl,
      debug: false
    })
    
    // Track game events
    game.on('game-end', (result) => {
      this.results.push({
        round,
        white: whiteEngine.name,
        black: blackEngine.name,
        ...result
      })
      
      this.emit('round-end', {
        round,
        result,
        standings: this.getStandings()
      })
    })
    
    await game.startGame()
    
    // Wait for game to complete
    await new Promise(resolve => {
      game.on('game-end', resolve)
      game.on('error', resolve)
    })
    
    await game.shutdown()
    this.currentGame++
  }

  /**
   * Get current standings
   */
  getStandings() {
    const standings = {}
    
    for (const engine of this.options.engines) {
      standings[engine.name] = { wins: 0, draws: 0, losses: 0, points: 0 }
    }
    
    for (const result of this.results) {
      if (result.result === '1-0') {
        standings[result.white].wins++
        standings[result.white].points += 1
        standings[result.black].losses++
      } else if (result.result === '0-1') {
        standings[result.black].wins++
        standings[result.black].points += 1
        standings[result.white].losses++
      } else {
        standings[result.white].draws++
        standings[result.white].points += 0.5
        standings[result.black].draws++
        standings[result.black].points += 0.5
      }
    }
    
    return standings
  }

  /**
   * Stop the tournament
   */
  stopTournament() {
    this.isRunning = false
    this.emit('tournament-stopped')
  }

  /**
   * End the tournament
   */
  endTournament() {
    this.isRunning = false
    
    this.emit('tournament-end', {
      results: this.results,
      standings: this.getStandings(),
      totalGames: this.results.length
    })
  }
}