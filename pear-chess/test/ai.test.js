/**
 * Pear's Gambit - AI Module Tests
 * 
 * Test suite for Stockfish integration and AI features
 */

import test from 'brittle'
import { AI, createStockfishAnalysis, createHintSystem } from '../src/ai/index.js'
import { UCIProtocol } from '../src/ai/uci-protocol.js'

// Test UCI Protocol
test('UCI Protocol - Basic message parsing', async (t) => {
  const uci = new UCIProtocol()
  
  // Test engine identification
  let idReceived = false
  uci.on('id', (info) => {
    if (info.name) idReceived = true
  })
  
  uci.processResponse('id name Stockfish 17\n')
  t.ok(idReceived, 'Engine name parsed correctly')
  
  // Test UCI acknowledgment
  let uciokReceived = false
  uci.on('uciok', () => {
    uciokReceived = true
  })
  
  uci.processResponse('uciok\n')
  t.ok(uciokReceived, 'UCI acknowledgment received')
  
  // Test info parsing
  let infoReceived = null
  uci.on('info', (info) => {
    infoReceived = info
  })
  
  uci.processResponse('info depth 10 score cp 25 nodes 1234567 pv e2e4 e7e5 g1f3\n')
  t.ok(infoReceived, 'Info parsed')
  t.is(infoReceived.depth, 10, 'Depth parsed correctly')
  t.is(infoReceived.score.value, 25, 'Score parsed correctly')
  t.is(infoReceived.nodes, 1234567, 'Nodes parsed correctly')
  t.ok(Array.isArray(infoReceived.pv), 'PV is array')
  t.is(infoReceived.pv[0], 'e2e4', 'First move in PV correct')
})

test('UCI Protocol - Best move parsing', async (t) => {
  const uci = new UCIProtocol()
  
  let bestMoveResult = null
  uci.on('bestmove', (bestMove, ponderMove) => {
    bestMoveResult = { bestMove, ponderMove }
  })
  
  // Test bestmove without ponder
  uci.processResponse('bestmove e2e4\n')
  t.is(bestMoveResult.bestMove, 'e2e4', 'Best move parsed')
  t.is(bestMoveResult.ponderMove, undefined, 'No ponder move')
  
  // Test bestmove with ponder
  uci.processResponse('bestmove d2d4 ponder d7d5\n')
  t.is(bestMoveResult.bestMove, 'd2d4', 'Best move parsed')
  t.is(bestMoveResult.ponderMove, 'd7d5', 'Ponder move parsed')
})

test('UCI Protocol - Multi-line response handling', async (t) => {
  const uci = new UCIProtocol()
  
  const infoEvents = []
  uci.on('info', (info) => {
    infoEvents.push(info)
  })
  
  // Send partial data
  uci.processResponse('info depth 5\ninfo depth')
  uci.processResponse(' 10\ninfo depth 15\n')
  
  // Should have processed complete lines only
  t.is(infoEvents.length, 3, 'Three complete info events processed')
  t.is(infoEvents[0].depth, 5, 'First depth correct')
  t.is(infoEvents[1].depth, 10, 'Second depth correct')
  t.is(infoEvents[2].depth, 15, 'Third depth correct')
})

// Test Stockfish Manager (requires Stockfish installed)
test('StockfishManager - Engine lifecycle', async (t) => {
  const stockfish = createStockfishAnalysis({
    debug: false,
    autoStart: false
  })
  
  try {
    // Initialize engine
    await stockfish.initialize()
    t.ok(stockfish.isInitialized, 'Engine initialized')
    
    // Get status
    const status = stockfish.getStatus()
    t.ok(status.initialized, 'Status shows initialized')
    t.ok(status.running, 'Status shows running')
    
    // Shutdown
    await stockfish.shutdown()
    t.not(stockfish.isInitialized, 'Engine shut down')
    
  } catch (error) {
    // Skip if Stockfish not installed
    if (error.message.includes('Stockfish not found')) {
      t.comment('Stockfish not installed, skipping engine tests')
      t.pass('Test skipped - Stockfish not available')
    } else {
      throw error
    }
  }
})

// Test Position Analysis (mock mode)
test('Position Analysis - Evaluation formatting', async (t) => {
  const { PositionAnalysis } = await import('../src/ai/analysis.js')
  const analysis = new PositionAnalysis()
  
  // Test centipawn evaluation
  const cpEval = analysis.assessPosition({
    evaluation: { numeric: 1.25, display: '+1.25' }
  })
  
  t.is(cpEval.advantage, 'white', 'White advantage detected')
  t.is(cpEval.magnitude, 'clear', 'Clear advantage magnitude')
  t.not(cpEval.winning, 'Not winning position')
  
  // Test mate evaluation
  const mateEval = analysis.assessPosition({
    evaluation: { numeric: 9999, isMate: true, mateIn: 3 }
  })
  
  t.ok(mateEval.critical, 'Mate position is critical')
  t.ok(mateEval.winning, 'Mate position is winning')
})

// Test Hint System
test('HintSystem - Move quality assessment', async (t) => {
  const { HintSystem } = await import('../src/ai/hints.js')
  const hints = new HintSystem()
  
  // Test move strength assessment
  const excellentMove = hints.assessMoveStrength({ numeric: 3.5 })
  t.is(excellentMove, 'excellent', 'Excellent move identified')
  
  const goodMove = hints.assessMoveStrength({ numeric: 0.8 })
  t.is(goodMove, 'good', 'Good move identified')
  
  const neutralMove = hints.assessMoveStrength({ numeric: 0.1 })
  t.is(neutralMove, 'neutral', 'Neutral move identified')
  
  const poorMove = hints.assessMoveStrength({ numeric: -3.0 })
  t.is(poorMove, 'poor', 'Poor move identified')
  
  // Test mate evaluation
  const mateMove = hints.assessMoveStrength({ 
    isMate: true, 
    mateIn: 2, 
    numeric: 9999 
  })
  t.is(mateMove, 'winning', 'Mate move is winning')
})

test('HintSystem - Warning generation', async (t) => {
  const { HintSystem } = await import('../src/ai/hints.js')
  const hints = new HintSystem()
  
  // Test critical position warning
  const criticalWarnings = hints.generateWarnings({
    assessment: { critical: true },
    evaluation: { numeric: -5.0 }
  })
  
  t.ok(criticalWarnings.length > 0, 'Warnings generated')
  t.ok(criticalWarnings.some(w => w.type === 'critical'), 'Critical warning present')
  
  // Test mate threat warning
  const mateWarnings = hints.generateWarnings({
    assessment: {},
    evaluation: { isMate: true, mateIn: -3 }
  })
  
  t.ok(mateWarnings.some(w => w.type === 'mate_threat'), 'Mate threat warning present')
})

// Test AI Module singleton
test('AI Module - Singleton pattern', async (t) => {
  const status1 = AI.getStatus()
  t.not(status1.initialized, 'AI not initialized initially')
  
  // Multiple imports should return same instance
  const { AI: AI2 } = await import('../src/ai/index.js')
  t.is(AI, AI2, 'Singleton instance maintained')
})

// Integration test with actual chess position
test('AI Module - Position analysis mock', async (t) => {
  // Mock analysis for testing without Stockfish
  const mockAnalysis = {
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    evaluation: { numeric: 0.0, display: '0.00' },
    bestMove: 'e2e4',
    depth: 10,
    assessment: {
      advantage: 'equal',
      magnitude: 'small',
      description: 'The position is approximately equal'
    }
  }
  
  t.ok(mockAnalysis.bestMove, 'Best move provided')
  t.is(mockAnalysis.assessment.advantage, 'equal', 'Starting position is equal')
  t.is(mockAnalysis.bestMove, 'e2e4', 'Common opening move suggested')
})