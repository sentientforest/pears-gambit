#!/usr/bin/env node

/**
 * Test AI vs AI game mode
 */

import { AIGame, AITournament } from './src/ai/ai-game.js'

async function testAIGame() {
  console.log('🤖 Testing AI vs AI Game Mode...\n')
  
  const game = new AIGame({
    whiteEngine: { depth: 8, skillLevel: 15 },
    blackEngine: { depth: 8, skillLevel: 20 },
    moveTime: 500, // Faster for testing
    debug: false,
    useOpeningBook: true
  })
  
  // Set up event listeners
  game.on('status', (status) => {
    console.log('📋', status)
  })
  
  game.on('game-start', (data) => {
    console.log('🎮 Game started!')
    console.log('   Starting position:', data.fen)
  })
  
  game.on('thinking', (data) => {
    process.stdout.write(`💭 ${data.player} thinking (move ${data.moveNumber})...`)
  })
  
  game.on('move', (data) => {
    process.stdout.write('\r')
    console.log(`   ${data.player === 'white' ? '♔' : '♚'} ${data.move.san} (${data.timeUsed}ms)`)
  })
  
  game.on('game-end', (data) => {
    console.log('\n🏁 Game finished!')
    console.log('   Result:', data.result)
    console.log('   Reason:', data.reason)
    console.log('   Total moves:', data.moves.length)
    console.log('   Time used - White:', data.timeUsed.white + 'ms, Black:', data.timeUsed.black + 'ms')
    console.log('   PGN:')
    console.log('  ', data.pgn)
  })
  
  game.on('error', (error) => {
    console.error('❌ Game error:', error)
  })
  
  try {
    console.log('Starting AI vs AI game...')
    await game.startGame()
    
    // Wait for game to complete
    await new Promise(resolve => {
      game.on('game-end', resolve)
      game.on('error', resolve)
    })
    
    console.log('\n📊 Analyzing completed game...')
    const analysis = await game.analyzeGame()
    console.log('   Opening:', analysis.opening.name)
    console.log('   White accuracy:', analysis.accuracy.white + '%')
    console.log('   Black accuracy:', analysis.accuracy.black + '%')
    console.log('   Blunders - White:', analysis.blunders.white, 'Black:', analysis.blunders.black)
    
    console.log('\n🔧 Shutting down...')
    await game.shutdown()
    
    console.log('\n✅ AI Game test completed successfully!')
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message)
    await game.shutdown()
    process.exit(1)
  }
}

async function testTournament() {
  console.log('\n🏆 Testing AI Tournament...\n')
  
  const tournament = new AITournament({
    rounds: 3,
    timeControl: 300,
    engines: [
      { name: 'Stockfish Beginner', depth: 5, skillLevel: 10 },
      { name: 'Stockfish Intermediate', depth: 8, skillLevel: 15 }
    ]
  })
  
  tournament.on('tournament-start', (data) => {
    console.log('🏆 Tournament started!')
    console.log('   Rounds:', data.rounds)
    console.log('   Engines:', data.engines.map(e => e.name).join(' vs '))
  })
  
  tournament.on('round-start', (data) => {
    console.log(`\n🎯 Round ${data.round + 1}: ${data.whiteEngine.name} (White) vs ${data.blackEngine.name} (Black)`)
  })
  
  tournament.on('round-end', (data) => {
    console.log(`   Result: ${data.result.result} (${data.result.reason})`)
    console.log('   Current standings:')
    for (const [name, stats] of Object.entries(data.standings)) {
      console.log(`     ${name}: ${stats.points} points (${stats.wins}W-${stats.draws}D-${stats.losses}L)`)
    }
  })
  
  tournament.on('tournament-end', (data) => {
    console.log('\n🏆 Tournament finished!')
    console.log('   Final standings:')
    const sorted = Object.entries(data.standings).sort((a, b) => b[1].points - a[1].points)
    for (const [name, stats] of sorted) {
      console.log(`     ${name}: ${stats.points} points (${stats.wins}W-${stats.draws}D-${stats.losses}L)`)
    }
  })
  
  try {
    await tournament.startTournament()
    console.log('\n✅ Tournament test completed successfully!')
    
  } catch (error) {
    console.error('\n❌ Tournament test failed:', error.message)
    tournament.stopTournament()
    process.exit(1)
  }
}

// Check command line arguments
const args = process.argv.slice(2)
if (args.includes('--tournament')) {
  testTournament().catch(console.error)
} else {
  testAIGame().catch(console.error)
}