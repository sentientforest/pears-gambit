#!/usr/bin/env node

/**
 * Super simple UCI test without the complex protocol
 */

import { spawn } from 'child_process'

async function simpleUCITest() {
  console.log('🔧 Super Simple UCI Test...\n')
  
  return new Promise((resolve, reject) => {
    const process = spawn('/usr/games/stockfish', [], {
      stdio: ['pipe', 'pipe', 'pipe']
    })
    
    let uciOkReceived = false
    let readyOkReceived = false
    
    // Set up timeout
    const timeout = setTimeout(() => {
      if (!uciOkReceived) {
        reject(new Error('UCI timeout'))
      } else if (!readyOkReceived) {
        reject(new Error('Ready timeout'))
      }
    }, 5000)
    
    process.stdout.on('data', (data) => {
      const output = data.toString()
      console.log('← UCI:', output.trim())
      
      if (output.includes('uciok')) {
        console.log('✅ UCI OK received!')
        uciOkReceived = true
        
        // Send isready
        console.log('→ UCI: isready')
        process.stdin.write('isready\n')
      }
      
      if (output.includes('readyok')) {
        console.log('✅ Ready OK received!')
        readyOkReceived = true
        clearTimeout(timeout)
        
        // Test position
        console.log('→ UCI: position startpos')
        process.stdin.write('position startpos\n')
        
        console.log('→ UCI: go depth 5')
        process.stdin.write('go depth 5\n')
      }
      
      if (output.includes('bestmove')) {
        console.log('✅ Best move received!')
        
        console.log('→ UCI: quit')
        process.stdin.write('quit\n')
        
        setTimeout(() => {
          resolve('SUCCESS')
        }, 100)
      }
    })
    
    process.on('error', reject)
    
    // Start UCI
    console.log('→ UCI: uci')
    process.stdin.write('uci\n')
  })
}

simpleUCITest()
  .then(result => {
    console.log('\n🎉 Test completed:', result)
  })
  .catch(error => {
    console.error('\n❌ Test failed:', error.message)
  })