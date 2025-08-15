/**
 * Pear's Gambit - Engine Benchmarking Suite
 * 
 * Performance testing and comparison tools for chess engines
 */

import { SimpleStockfishEngine } from './external-engine-simple.js'
import { GameAnalyzer } from './game-analyzer.js'
import { OpeningBook } from './opening-book.js'
import { Chess } from 'chess.js'
import { EventEmitter } from 'events'

/**
 * Engine Performance Benchmarker
 * Tests engine speed, accuracy, and resource usage
 */
export class EngineBenchmark extends EventEmitter {
  constructor(options = {}) {
    super()
    
    this.options = {
      // Test suite configuration
      positions: options.positions || 'standard', // 'standard', 'tactical', 'endgame', 'custom'
      depths: options.depths || [10, 15, 20],
      timeControls: options.timeControls || [100, 500, 1000], // milliseconds
      repetitions: options.repetitions || 3,
      
      // Engine configuration
      engines: options.engines || [
        { name: 'Stockfish-Fast', depth: 10, skillLevel: 20 },
        { name: 'Stockfish-Deep', depth: 20, skillLevel: 20 }
      ],
      
      // Output options
      verbose: options.verbose || false,
      saveResults: options.saveResults !== false,
      outputPath: options.outputPath || './benchmark-results.json',
      
      ...options
    }
    
    this.results = []
    this.testPositions = []
    this.isRunning = false
  }

  /**
   * Run complete benchmark suite
   */
  async runBenchmark() {
    if (this.isRunning) {
      throw new Error('Benchmark already running')
    }
    
    this.isRunning = true
    this.emit('benchmark-start', { options: this.options })
    
    try {
      // Load test positions
      await this.loadTestPositions()
      
      // Run tests for each engine
      for (const engineConfig of this.options.engines) {
        await this.benchmarkEngine(engineConfig)
      }
      
      // Generate comparison report
      const report = this.generateReport()
      
      // Save results if requested
      if (this.options.saveResults) {
        await this.saveResults(report)
      }
      
      this.emit('benchmark-complete', { report, results: this.results })
      return report
      
    } catch (error) {
      this.emit('benchmark-error', error)
      throw error
    } finally {
      this.isRunning = false
    }
  }

  /**
   * Load test positions based on configuration
   */
  async loadTestPositions() {
    this.emit('loading-positions', { type: this.options.positions })
    
    if (this.options.positions === 'standard') {
      this.testPositions = this.getStandardPositions()
    } else if (this.options.positions === 'tactical') {
      this.testPositions = this.getTacticalPositions()
    } else if (this.options.positions === 'endgame') {
      this.testPositions = this.getEndgamePositions()
    } else if (Array.isArray(this.options.positions)) {
      this.testPositions = this.options.positions
    } else {
      throw new Error('Invalid positions configuration')
    }
    
    this.emit('positions-loaded', { count: this.testPositions.length })
  }

  /**
   * Benchmark a single engine configuration
   */
  async benchmarkEngine(engineConfig) {
    this.emit('engine-start', { engine: engineConfig.name })
    
    const engine = new SimpleStockfishEngine({
      debug: false,
      ...engineConfig
    })
    
    await engine.start()
    
    const engineResults = {
      name: engineConfig.name,
      config: engineConfig,
      tests: [],
      summary: {}
    }
    
    try {
      // Test different depth levels
      for (const depth of this.options.depths) {
        const depthResults = await this.testDepth(engine, depth, engineConfig.name)
        engineResults.tests.push(depthResults)
      }
      
      // Test different time controls
      for (const timeControl of this.options.timeControls) {
        const timeResults = await this.testTimeControl(engine, timeControl, engineConfig.name)
        engineResults.tests.push(timeResults)
      }
      
      // Calculate summary statistics
      engineResults.summary = this.calculateSummary(engineResults.tests)
      
    } finally {
      await engine.quit()
    }
    
    this.results.push(engineResults)
    this.emit('engine-complete', { engine: engineConfig.name, results: engineResults })
  }

  /**
   * Test engine performance at specific depth
   */
  async testDepth(engine, depth, engineName) {
    this.emit('test-start', { engine: engineName, type: 'depth', value: depth })
    
    const testResult = {
      type: 'depth',
      value: depth,
      positions: [],
      summary: {}
    }
    
    for (const position of this.testPositions) {
      for (let rep = 0; rep < this.options.repetitions; rep++) {
        const positionResult = await this.analyzePosition(engine, position, { depth })
        testResult.positions.push(positionResult)
        
        this.emit('position-complete', {
          engine: engineName,
          position: position.name,
          repetition: rep + 1,
          time: positionResult.time,
          nodes: positionResult.nodes
        })
      }
    }
    
    testResult.summary = this.calculatePositionSummary(testResult.positions)
    this.emit('test-complete', { engine: engineName, type: 'depth', summary: testResult.summary })
    
    return testResult
  }

  /**
   * Test engine performance with time control
   */
  async testTimeControl(engine, timeControl, engineName) {
    this.emit('test-start', { engine: engineName, type: 'time', value: timeControl })
    
    const testResult = {
      type: 'time',
      value: timeControl,
      positions: [],
      summary: {}
    }
    
    for (const position of this.testPositions) {
      for (let rep = 0; rep < this.options.repetitions; rep++) {
        const positionResult = await this.analyzePosition(engine, position, { movetime: timeControl })
        testResult.positions.push(positionResult)
        
        this.emit('position-complete', {
          engine: engineName,
          position: position.name,
          repetition: rep + 1,
          time: positionResult.time,
          depth: positionResult.depth
        })
      }
    }
    
    testResult.summary = this.calculatePositionSummary(testResult.positions)
    this.emit('test-complete', { engine: engineName, type: 'time', summary: testResult.summary })
    
    return testResult
  }

  /**
   * Analyze a single position
   */
  async analyzePosition(engine, position, options) {
    const startTime = Date.now()
    const startMemory = process.memoryUsage()
    
    try {
      const analysis = await engine.analyze(position.fen, options)
      const endTime = Date.now()
      const endMemory = process.memoryUsage()
      
      return {
        name: position.name,
        fen: position.fen,
        bestMove: analysis.bestMove,
        evaluation: analysis.lines[0]?.score?.value || 0,
        depth: analysis.depth,
        time: endTime - startTime,
        nodes: analysis.lines[0]?.nodes || 0,
        nps: this.calculateNPS(analysis.lines[0]?.nodes || 0, endTime - startTime),
        memoryUsed: endMemory.heapUsed - startMemory.heapUsed,
        expectedMove: position.expectedMove,
        correct: position.expectedMove ? analysis.bestMove === position.expectedMove : null
      }
    } catch (error) {
      return {
        name: position.name,
        fen: position.fen,
        error: error.message,
        time: Date.now() - startTime
      }
    }
  }

  /**
   * Calculate nodes per second
   */
  calculateNPS(nodes, timeMs) {
    if (timeMs <= 0) return 0
    return Math.round((nodes / timeMs) * 1000)
  }

  /**
   * Calculate summary statistics for position results
   */
  calculatePositionSummary(positions) {
    const validResults = positions.filter(p => !p.error)
    
    if (validResults.length === 0) {
      return { error: 'No valid results' }
    }
    
    const times = validResults.map(p => p.time)
    const nodes = validResults.map(p => p.nodes)
    const nps = validResults.map(p => p.nps)
    const depths = validResults.map(p => p.depth)
    const correctMoves = validResults.filter(p => p.correct === true).length
    const totalMoves = validResults.filter(p => p.correct !== null).length
    
    return {
      count: validResults.length,
      errors: positions.length - validResults.length,
      time: {
        min: Math.min(...times),
        max: Math.max(...times),
        avg: Math.round(times.reduce((a, b) => a + b, 0) / times.length),
        total: times.reduce((a, b) => a + b, 0)
      },
      nodes: {
        min: Math.min(...nodes),
        max: Math.max(...nodes),
        avg: Math.round(nodes.reduce((a, b) => a + b, 0) / nodes.length),
        total: nodes.reduce((a, b) => a + b, 0)
      },
      nps: {
        min: Math.min(...nps),
        max: Math.max(...nps),
        avg: Math.round(nps.reduce((a, b) => a + b, 0) / nps.length)
      },
      depth: {
        min: Math.min(...depths),
        max: Math.max(...depths),
        avg: Math.round(depths.reduce((a, b) => a + b, 0) / depths.length)
      },
      accuracy: totalMoves > 0 ? Math.round((correctMoves / totalMoves) * 100) : null
    }
  }

  /**
   * Calculate overall summary for engine
   */
  calculateSummary(tests) {
    const allPositions = tests.flatMap(t => t.positions).filter(p => !p.error)
    
    if (allPositions.length === 0) {
      return { error: 'No valid results' }
    }
    
    const summary = this.calculatePositionSummary(allPositions)
    
    // Add test-specific summaries
    summary.byDepth = {}
    summary.byTime = {}
    
    for (const test of tests) {
      if (test.type === 'depth') {
        summary.byDepth[test.value] = test.summary
      } else if (test.type === 'time') {
        summary.byTime[test.value] = test.summary
      }
    }
    
    return summary
  }

  /**
   * Generate comparative benchmark report
   */
  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      options: this.options,
      engines: this.results.length,
      positions: this.testPositions.length,
      results: this.results,
      comparison: {}
    }
    
    if (this.results.length >= 2) {
      report.comparison = this.generateComparison()
    }
    
    return report
  }

  /**
   * Generate engine comparison
   */
  generateComparison() {
    const comparison = {
      speed: {},
      accuracy: {},
      efficiency: {}
    }
    
    // Speed comparison (time)
    for (const result of this.results) {
      comparison.speed[result.name] = result.summary.time?.avg || 0
    }
    
    // Accuracy comparison
    for (const result of this.results) {
      comparison.accuracy[result.name] = result.summary.accuracy || 0
    }
    
    // Efficiency comparison (nodes per second)
    for (const result of this.results) {
      comparison.efficiency[result.name] = result.summary.nps?.avg || 0
    }
    
    // Find winners
    comparison.fastest = this.findBest(comparison.speed, false) // lower is better
    comparison.mostAccurate = this.findBest(comparison.accuracy, true) // higher is better
    comparison.mostEfficient = this.findBest(comparison.efficiency, true) // higher is better
    
    return comparison
  }

  /**
   * Find best performer in a category
   */
  findBest(scores, higherIsBetter) {
    const entries = Object.entries(scores)
    if (entries.length === 0) return null
    
    const best = entries.reduce((best, current) => {
      if (higherIsBetter) {
        return current[1] > best[1] ? current : best
      } else {
        return current[1] < best[1] ? current : best
      }
    })
    
    return { engine: best[0], score: best[1] }
  }

  /**
   * Save benchmark results to file
   */
  async saveResults(report) {
    if (typeof window !== 'undefined') {
      // Browser environment - use localStorage
      localStorage.setItem('pear-chess-benchmark', JSON.stringify(report))
    } else {
      // Node.js environment
      const fs = await import('fs/promises')
      await fs.writeFile(this.options.outputPath, JSON.stringify(report, null, 2))
    }
  }

  /**
   * Get standard test positions
   */
  getStandardPositions() {
    return [
      {
        name: 'Starting Position',
        fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        expectedMove: 'e2e4' // Common best move
      },
      {
        name: 'Sicilian Defense',
        fen: 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 2',
        expectedMove: 'g1f3'
      },
      {
        name: 'Queen\'s Gambit',
        fen: 'rnbqkbnr/ppp1pppp/8/3p4/2PP4/8/PP2PPPP/RNBQKBNR b KQkq c3 0 2',
        expectedMove: 'e7e6'
      },
      {
        name: 'King\'s Indian Defense',
        fen: 'rnbqkb1r/pppppp1p/5np1/8/2PP4/2N5/PP2PPPP/R1BQKBNR b KQkq - 0 3',
        expectedMove: 'f8g7'
      },
      {
        name: 'Middle Game Position',
        fen: 'r1bqkb1r/pppp1ppp/2n2n2/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4'
      }
    ]
  }

  /**
   * Get tactical test positions
   */
  getTacticalPositions() {
    return [
      {
        name: 'Fork Tactic',
        fen: 'rnbqkb1r/pppp1ppp/5n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 2 4',
        expectedMove: 'f3g5' // Knight fork
      },
      {
        name: 'Pin Tactic',
        fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3',
        expectedMove: 'f7f5' // Breaking the pin
      },
      {
        name: 'Discovered Attack',
        fen: 'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 4 4',
        expectedMove: 'c4f7' // Discovered check
      },
      {
        name: 'Back Rank Mate',
        fen: 'r5k1/ppp2ppp/3p4/8/8/8/PPP2PPP/4R1K1 w - - 0 1',
        expectedMove: 'e1e8' // Back rank mate
      },
      {
        name: 'Smothered Mate',
        fen: 'r3k2r/ppp2p1p/2n3p1/2Np4/2P5/8/PP3PPP/R3K2R w KQkq - 0 1',
        expectedMove: 'd5f6' // Smothered mate setup
      }
    ]
  }

  /**
   * Get endgame test positions
   */
  getEndgamePositions() {
    return [
      {
        name: 'King and Pawn vs King',
        fen: '8/8/8/3k4/3P4/3K4/8/8 w - - 0 1',
        expectedMove: 'd3c4' // King support
      },
      {
        name: 'Rook Endgame',
        fen: '8/8/8/8/8/3k4/3p4/3K3R w - - 0 1',
        expectedMove: 'h1h3' // Rook cut-off
      },
      {
        name: 'Queen vs Pawn',
        fen: '8/8/8/8/8/3k4/3p4/3KQ3 w - - 0 1',
        expectedMove: 'e1e2' // Queen blockade
      },
      {
        name: 'Bishop Endgame',
        fen: '8/8/8/8/8/2bk4/3p4/3KB3 w - - 0 1',
        expectedMove: 'e3d2' // Bishop blockade
      },
      {
        name: 'Knight Endgame',
        fen: '8/8/8/8/8/3k4/3p4/3KN3 w - - 0 1',
        expectedMove: 'e1d3' // Knight blockade
      }
    ]
  }

  /**
   * Stop benchmark if running
   */
  stop() {
    this.isRunning = false
    this.emit('benchmark-stopped')
  }
}

/**
 * Quick performance test utility
 */
export async function quickBenchmark(engineConfig = {}, options = {}) {
  const benchmark = new EngineBenchmark({
    engines: [engineConfig],
    positions: options.positions || 'standard',
    depths: options.depths || [10],
    timeControls: options.timeControls || [1000],
    repetitions: options.repetitions || 1,
    verbose: options.verbose || false,
    saveResults: false
  })
  
  const report = await benchmark.runBenchmark()
  return report.results[0] // Return single engine result
}

/**
 * Compare two engine configurations
 */
export async function compareEngines(engine1, engine2, options = {}) {
  const benchmark = new EngineBenchmark({
    engines: [engine1, engine2],
    positions: options.positions || 'standard',
    depths: options.depths || [15],
    timeControls: options.timeControls || [1000],
    repetitions: options.repetitions || 3,
    verbose: options.verbose || false,
    saveResults: options.saveResults || false
  })
  
  const report = await benchmark.runBenchmark()
  return report.comparison
}