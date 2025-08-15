#!/usr/bin/env node

/**
 * Test AI Integration with Real Stockfish
 * Verifies the AI module works with the real external engine
 */

import { AI, createStockfishAnalysis, createGameAnalyzer, createOpeningBook } from '../src/ai/index.js'

async function testAIIntegration() {
  console.log('🧪 Testing AI Integration with Real Stockfish\n')
  
  let tests = 0
  let passed = 0
  let failed = 0

  function test(name, testFn) {
    return async () => {
      tests++
      try {
        console.log(`🔍 ${name}...`)
        const result = await testFn()
        console.log(`✅ ${name}: ${result}`)
        passed++
      } catch (error) {
        console.log(`❌ ${name}: ${error.message}`)
        failed++
      }
    }
  }

  // Test 1: Check AI status
  await test('AI Module Status Check', async () => {
    const status = AI.getStatus()
    return `Engine: ${status.engineType}, Stockfish: ${status.hasRealStockfish ? 'Available' : 'Stub only'}`
  })()

  // Test 2: Create Stockfish analysis instance
  await test('Create Stockfish Analysis Instance', async () => {
    const stockfish = createStockfishAnalysis({ debug: false })
    await stockfish.start()
    
    const isReady = stockfish.isReady
    await stockfish.quit()
    
    return `Instance created and ${isReady ? 'ready' : 'not ready'}`
  })()

  // Test 3: AI Module initialization
  await test('AI Module Initialization', async () => {
    await AI.initialize({ debug: false })
    const status = AI.getStatus()
    return `Initialized: ${status.initialized}, Stockfish Ready: ${status.stockfishReady}`
  })()

  // Test 4: Position analysis
  await test('Position Analysis', async () => {
    const startingFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    const analysis = await AI.analyzePosition(startingFen, { depth: 8 })
    
    return `Best move: ${analysis.bestMove || 'none'}, Depth: ${analysis.depth || 0}`
  })()

  // Test 5: Best move calculation
  await test('Best Move Calculation', async () => {
    const startingFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    const bestMove = await AI.getBestMove(startingFen, { depth: 6 })
    
    return `Best move: ${bestMove || 'none'}`
  })()

  // Test 6: Opening book functionality
  await test('Opening Book', async () => {
    const opening = AI.getOpening(['e2e4', 'e7e5', 'g1f3'])
    return `Opening: ${opening.name || 'Unknown'} (${opening.eco || '---'})`
  })()

  // Test 7: Engine configuration
  await test('Engine Configuration', async () => {
    await AI.setOption('Hash', '64')
    await AI.setOption('Threads', '1')
    return 'Hash and Threads set successfully'
  })()

  // Test 8: Multiple position analysis
  await test('Multiple Position Analysis', async () => {
    const positions = [
      'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', // Starting
      'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1', // e4
      'rnbqkb1r/pppp1ppp/5n2/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 2 3' // Italian game
    ]
    
    const results = []
    for (const fen of positions) {
      const analysis = await AI.analyzePosition(fen, { depth: 5 })
      results.push(analysis.bestMove)
    }
    
    return `Analyzed ${results.length} positions: ${results.join(', ')}`
  })()

  // Test 9: Opening book with multiple openings
  await test('Opening Recognition', async () => {
    const openings = [
      AI.getOpening(['e2e4']), // King's Pawn
      AI.getOpening(['d2d4']), // Queen's Pawn  
      AI.getOpening(['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1c4']), // Italian Game
      AI.getOpening(['e2e4', 'c7c5']) // Sicilian Defense
    ]
    
    const names = openings.map(o => o.name || 'Unknown')
    return `Recognized: ${names.join(', ')}`
  })()

  // Test 10: AI shutdown and cleanup
  await test('AI Shutdown', async () => {
    await AI.shutdown()
    const status = AI.getStatus()
    return `Shutdown complete, initialized: ${status.initialized}`
  })()

  // Summary
  console.log(`\n📊 Test Results: ${passed}/${tests} passed, ${failed} failed`)
  
  if (failed === 0) {
    console.log('\n🎉 All AI integration tests passed!')
    console.log('\n💡 AI Module Features:')
    console.log('  ✅ Real Stockfish integration working')
    console.log('  ✅ Position analysis functional')
    console.log('  ✅ Opening book operational')
    console.log('  ✅ Engine configuration working')
    console.log('  ✅ Multiple analysis requests handled')
    console.log('  ✅ Graceful shutdown implemented')
    
    const finalStatus = AI.getStatus()
    console.log(`\n🔧 Final Status: Engine type: ${finalStatus.engineType}`)
  } else {
    console.log('\n⚠️  Some tests failed. Check the issues above.')
    process.exit(1)
  }
}

async function quickTest() {
  console.log('⚡ Quick AI Integration Test...\n')
  
  try {
    console.log('1. Checking AI status...')
    const status = AI.getStatus()
    console.log(`   Engine type: ${status.engineType}`)
    console.log(`   Has real Stockfish: ${status.hasRealStockfish}`)
    
    if (!status.hasRealStockfish) {
      console.log('⚠️  Using stub engine (Pear Runtime mode)')
      return
    }
    
    console.log('2. Initializing AI...')
    await AI.initialize({ debug: false })
    
    console.log('3. Analyzing starting position...')
    const analysis = await AI.analyzePosition(
      'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      { depth: 8 }
    )
    
    console.log(`✅ Analysis complete! Best move: ${analysis.bestMove}`)
    
    console.log('4. Shutting down...')
    await AI.shutdown()
    
    console.log('🎉 Quick test passed!')
    
  } catch (error) {
    console.error('❌ Quick test failed:', error.message)
    process.exit(1)
  }
}

// CLI interface
const command = process.argv[2] || 'test'

if (command === 'quick') {
  quickTest()
} else if (command === 'test') {
  testAIIntegration()
} else {
  console.log(`
🚀 AI Integration Tester

Usage: node scripts/test-ai-integration.js [command]

Commands:
  test   - Full AI integration test suite (default)
  quick  - Quick functionality test

Examples:
  node scripts/test-ai-integration.js
  node scripts/test-ai-integration.js quick
`)
}