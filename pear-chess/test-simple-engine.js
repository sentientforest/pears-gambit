#!/usr/bin/env node

/**
 * Test the simplified Stockfish engine
 */

import { SimpleStockfishEngine } from './src/ai/external-engine-simple.js'

async function testEngine() {
  console.log('🧪 Testing Simplified Stockfish Engine...\n')
  
  const engine = new SimpleStockfishEngine({
    debug: false
  })
  
  try {
    console.log('1. Starting engine...')
    await engine.start()
    console.log('   ✅ Engine started and initialized')
    
    console.log('\n2. Analyzing starting position...')
    const startAnalysis = await engine.analyze('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', {
      depth: 10
    })
    
    console.log('   ✅ Analysis complete:')
    console.log('      Best move:', startAnalysis.bestMove)
    console.log('      Depth reached:', startAnalysis.depth)
    if (startAnalysis.lines[0]) {
      console.log('      Evaluation:', startAnalysis.lines[0].score)
      console.log('      Best line:', startAnalysis.lines[0].moves.slice(0, 5).join(' '))
    }
    
    console.log('\n3. Analyzing tactical position...')
    // Position with a clear tactical win (fork)
    const tacticalFen = 'r1bqkb1r/pppp1ppp/2n2n2/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 1'
    const tacticalAnalysis = await engine.analyze(tacticalFen, {
      depth: 15
    })
    
    console.log('   ✅ Tactical analysis complete:')
    console.log('      Best move:', tacticalAnalysis.bestMove)
    console.log('      Depth reached:', tacticalAnalysis.depth)
    if (tacticalAnalysis.lines[0]) {
      console.log('      Evaluation:', tacticalAnalysis.lines[0].score)
      console.log('      Best line:', tacticalAnalysis.lines[0].moves.slice(0, 5).join(' '))
    }
    
    console.log('\n4. Testing position command with moves...')
    await engine.position('startpos', ['e2e4', 'e7e5', 'g1f3'])
    const result = await engine.go({ depth: 8 })
    console.log('   ✅ Best move after 1.e4 e5 2.Nf3:', result.bestMove)
    
    console.log('\n5. Shutting down...')
    await engine.quit()
    console.log('   ✅ Engine shut down successfully')
    
    console.log('\n🎉 All tests passed!')
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message)
    await engine.quit()
    process.exit(1)
  }
}

testEngine().catch(console.error)