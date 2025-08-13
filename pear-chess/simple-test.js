#!/usr/bin/env node

/**
 * Simple test to debug UCI communication
 */

import { ExternalStockfishEngine } from './src/ai/external-engine.js'

async function simpleTest() {
  console.log('🔧 Simple UCI Test...\n')
  
  const engine = new ExternalStockfishEngine({
    debug: true,
    binaryPath: '/usr/games/stockfish'
  })
  
  // Listen to events
  engine.on('ready', () => {
    console.log('✅ Engine ready event received')
  })
  
  engine.on('error', (error) => {
    console.log('❌ Engine error:', error.message)
  })
  
  try {
    console.log('Starting engine...')
    await engine.start()
    console.log('✅ Engine started successfully!')
    
    // Test simple position
    console.log('\nTesting position analysis...')
    await engine.position('startpos')
    console.log('✅ Position set')
    
    const result = await engine.go({ depth: 5 })
    console.log('✅ Analysis result:', result)
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
    console.error('Stack:', error.stack)
  } finally {
    console.log('\nShutting down...')
    await engine.quit()
    console.log('✅ Shutdown complete')
  }
}

simpleTest().catch(console.error)