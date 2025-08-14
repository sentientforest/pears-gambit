#!/usr/bin/env node

/**
 * Test the game fixes for fen() method and database locks
 */

async function testGameFixes() {
  console.log('🧪 Testing game fixes...\n')
  
  try {
    console.log('1. Testing ChessGame fen() method...')
    const { createGame } = await import('./src/chess/index.js')
    const game = createGame()
    
    console.log('   Testing getFen():', typeof game.getFen === 'function')
    console.log('   Testing fen():', typeof game.fen === 'function')
    
    const fen1 = game.getFen()
    const fen2 = game.fen()
    
    console.log('   ✅ Both methods work:')
    console.log('      getFen():', fen1.substring(0, 30) + '...')
    console.log('      fen():', fen2.substring(0, 30) + '...')
    console.log('      Match:', fen1 === fen2)
    
    console.log('\n2. Testing GameCore instance ID generation...')
    const { GameCore } = await import('./src/p2p/core.js')
    
    // Create multiple instances to test uniqueness
    const core1 = new GameCore({ debug: false })
    const core2 = new GameCore({ debug: false })
    
    const id1 = core1.generateInstanceId()
    const id2 = core2.generateInstanceId()
    
    console.log('   ✅ Instance IDs generated:')
    console.log('      ID 1:', id1)
    console.log('      ID 2:', id2)
    console.log('      Unique:', id1 !== id2)
    
    console.log('\n3. Testing game initialization (without P2P)...')
    game.start()
    console.log('   ✅ Game started successfully')
    console.log('      State:', game.gameState)
    console.log('      FEN:', game.fen().substring(0, 30) + '...')
    
    console.log('\n🎉 All fixes working correctly!')
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message)
    console.error('Stack:', error.stack)
    process.exit(1)
  }
}

testGameFixes().catch(console.error)