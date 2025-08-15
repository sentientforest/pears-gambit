/**
 * Pear's Gambit - AI Engine Stub
 * 
 * Placeholder implementation for when Stockfish is not available
 */

/**
 * Stub engine that gracefully handles AI requests without crashing
 */
export class StubEngine {
  constructor(options = {}) {
    this.options = options
    this.isReady = false
  }

  async start() {
    console.log('AI engine not available in this environment')
    this.isReady = false
    return false
  }

  async analyze(fen, options = {}) {
    return {
      fen,
      lines: [],
      depth: 0,
      bestMove: null
    }
  }

  async position(fen, moves = []) {
    return true
  }

  async go(options = {}) {
    return { bestMove: null }
  }

  async setOption(name, value) {
    return true
  }

  async quit() {
    return true
  }
}

/**
 * Stub game analyzer
 */
export class StubGameAnalyzer {
  constructor(options = {}) {
    this.options = options
  }

  async initialize() {
    return true
  }

  async analyzeGame(gameData) {
    return {
      moves: [],
      opening: { name: 'Unknown', eco: '---' },
      accuracy: { white: 0, black: 0 },
      blunders: { white: 0, black: 0 },
      mistakes: { white: 0, black: 0 },
      inaccuracies: { white: 0, black: 0 },
      brilliant: [],
      critical: [],
      summary: 'AI analysis not available'
    }
  }

  async shutdown() {
    return true
  }
}