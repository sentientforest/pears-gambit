#!/usr/bin/env node

/**
 * Simple command-line test for Stockfish integration
 */

import { createStockfishAnalysis } from './src/ai/index.js'

async function testStockfish() {
  console.log('🧠 Testing Stockfish Integration...\n')
  
  let stockfish = null
  
  try {
    // Create Stockfish instance
    console.log('1. Creating Stockfish manager...')
    stockfish = createStockfishAnalysis({
      debug: true,
      autoStart: false
    })
    
    console.log('   ✓ Stockfish manager created')
    
    // Initialize engine
    console.log('2. Initializing Stockfish engine...')
    await stockfish.initialize()
    console.log('   ✓ Engine initialized successfully')
    
    // Test basic analysis
    console.log('3. Testing position analysis...')
    const startingFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    
    const analysis = await stockfish.analyzePosition(startingFen, { depth: 10 })
    
    console.log('   ✓ Analysis completed:')
    console.log('     Best move:', analysis.bestMove)
    console.log('     Evaluation:', analysis.evaluation?.display)
    console.log('     Assessment:', analysis.assessment?.description)
    
    // Test different position
    console.log('4. Testing tactical position...')
    const tacticalFen = 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 0 1'
    
    const tacticalAnalysis = await stockfish.analyzePosition(tacticalFen, { depth: 15 })
    
    console.log('   ✓ Tactical analysis completed:')
    console.log('     Best move:', tacticalAnalysis.bestMove)
    console.log('     Evaluation:', tacticalAnalysis.evaluation?.display)
    console.log('     Assessment:', tacticalAnalysis.assessment?.description)
    
    // Test engine status
    console.log('5. Testing engine status...')
    const status = stockfish.getStatus()
    console.log('   ✓ Engine status:', {
      initialized: status.initialized,
      running: status.running,
      cacheSize: status.cacheSize
    })
    
    console.log('\n🎉 All tests passed! Stockfish integration is working correctly.')
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message)
    
    if (error.message.includes('Stockfish not found')) {
      console.log('\n💡 To fix this issue:')
      console.log('   • Ubuntu/Debian: sudo apt install stockfish')
      console.log('   • macOS: brew install stockfish')
      console.log('   • Windows: Download from https://stockfishchess.org/download/')
    }
    
    process.exit(1)
    
  } finally {
    // Clean shutdown
    if (stockfish) {
      console.log('\n6. Shutting down engine...')
      await stockfish.shutdown()
      console.log('   ✓ Engine shutdown completed')
    }
  }
}

// Run test
testStockfish().catch(error => {
  console.error('Unexpected error:', error)
  process.exit(1)
})