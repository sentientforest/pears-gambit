#!/usr/bin/env node

/**
 * Test Pear Runtime compatibility without graphics
 */

async function testImports() {
  console.log('🧪 Testing Pear Runtime compatibility...\n')
  
  try {
    console.log('1. Testing AI index import...')
    const { AI, createOpeningBook } = await import('./src/ai/index.js')
    console.log('   ✅ AI index imported successfully')
    
    console.log('2. Testing opening book...')
    const openingBook = createOpeningBook()
    const startingOpening = openingBook.getOpening([])
    console.log('   ✅ Opening book works:', startingOpening.name)
    
    console.log('3. Testing AI singleton status...')
    const status = AI.getStatus()
    console.log('   ✅ AI status:', JSON.stringify(status, null, 2))
    
    console.log('4. Testing AI initialization (stub)...')
    await AI.initialize({ debug: true })
    const statusAfter = AI.getStatus()
    console.log('   ✅ AI initialized:', JSON.stringify(statusAfter, null, 2))
    
    console.log('5. Testing position analysis (stub)...')
    const analysis = await AI.analyzePosition('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')
    console.log('   ✅ Analysis result:', JSON.stringify(analysis, null, 2))
    
    console.log('\n🎉 All imports and basic functionality working!')
    console.log('📋 Note: Using AI stubs - full Stockfish not available in this environment')
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message)
    console.error('Stack:', error.stack)
    process.exit(1)
  }
}

testImports().catch(console.error)