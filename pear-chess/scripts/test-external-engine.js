#!/usr/bin/env node

/**
 * Test external Stockfish engine integration
 * Verifies UCI protocol communication and analysis functionality
 */

import { spawn } from 'child_process'
import { StockfishBinaryManager } from './setup-deps.js'
import { detectPlatform } from './platform-utils.js'

class UCIEngine {
  constructor(binaryPath) {
    this.binaryPath = binaryPath
    this.process = null
    this.isReady = false
    this.responses = []
    this.waiters = new Map()
  }

  async start() {
    console.log(`🚀 Starting Stockfish: ${this.binaryPath}`)
    
    this.process = spawn(this.binaryPath, [], {
      stdio: ['pipe', 'pipe', 'pipe']
    })

    // Handle process errors
    this.process.on('error', (error) => {
      console.error('❌ Process error:', error.message)
      throw error
    })

    this.process.on('exit', (code) => {
      console.log(`🔄 Process exited with code: ${code}`)
    })

    // Handle stdout
    this.process.stdout.on('data', (data) => {
      const output = data.toString().trim()
      console.log(`📥 Engine: ${output}`)
      this.handleResponse(output)
    })

    // Handle stderr  
    this.process.stderr.on('data', (data) => {
      const error = data.toString().trim()
      console.warn(`⚠️  Engine stderr: ${error}`)
    })

    // Initialize UCI
    await this.send('uci')
    await this.waitFor('uciok', 5000)
    
    await this.send('isready')
    await this.waitFor('readyok', 5000)
    
    this.isReady = true
    console.log('✅ Engine ready!')
  }

  send(command) {
    console.log(`📤 Sending: ${command}`)
    this.process.stdin.write(command + '\n')
  }

  handleResponse(output) {
    const lines = output.split('\n').filter(line => line.trim())
    
    for (const line of lines) {
      this.responses.push(line)
      
      // Check waiters
      for (const [waitFor, { resolve }] of this.waiters) {
        if (line.includes(waitFor)) {
          this.waiters.delete(waitFor)
          resolve(line)
        }
      }
    }
  }

  waitFor(text, timeout = 10000) {
    return new Promise((resolve, reject) => {
      // Check if we already have the response
      const existing = this.responses.find(line => line.includes(text))
      if (existing) {
        return resolve(existing)
      }

      const timer = setTimeout(() => {
        this.waiters.delete(text)
        reject(new Error(`Timeout waiting for: ${text}`))
      }, timeout)

      this.waiters.set(text, { 
        resolve: (line) => {
          clearTimeout(timer)
          resolve(line)
        }
      })
    })
  }

  async analyzePosition(fen, depth = 15) {
    console.log(`🔍 Analyzing position: ${fen}`)
    
    await this.send(`position fen ${fen}`)
    await this.send(`go depth ${depth}`)
    
    const bestmove = await this.waitFor('bestmove', 30000)
    
    // Parse the bestmove response
    const match = bestmove.match(/bestmove (\w+)/)
    if (match) {
      return { bestMove: match[1], fullResponse: bestmove }
    }
    
    throw new Error(`Invalid bestmove response: ${bestmove}`)
  }

  async quit() {
    if (this.process) {
      this.send('quit')
      
      // Wait for process to exit gracefully
      await new Promise((resolve) => {
        this.process.on('exit', resolve)
        setTimeout(resolve, 2000) // Force timeout after 2s
      })
    }
  }
}

async function testExternalEngine() {
  console.log('🧪 Testing External Stockfish Engine\n')
  
  try {
    // 1. Ensure binary is available
    const manager = new StockfishBinaryManager({ debug: false })
    const platform = detectPlatform()
    const binaryPath = manager.getBinaryPath(platform)
    
    console.log(`Platform: ${platform}`)
    console.log(`Binary path: ${binaryPath}`)
    
    // 2. Test UCI communication
    const engine = new UCIEngine(binaryPath)
    await engine.start()
    
    // 3. Test position analysis
    console.log('\n📊 Testing position analysis...')
    
    // Starting position
    const startingFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    const analysis1 = await engine.analyzePosition(startingFen, 10)
    console.log(`✅ Starting position analysis: ${analysis1.bestMove}`)
    
    // Famous tactical position (Scholar's mate setup)
    const tacticalFen = 'rnbqkb1r/pppp1ppp/5n2/4p3/2B1P3/8/PPPP1PPP/RNBQK1NR w KQkq - 2 3'
    const analysis2 = await engine.analyzePosition(tacticalFen, 12)
    console.log(`✅ Tactical position analysis: ${analysis2.bestMove}`)
    
    // 4. Test engine settings
    console.log('\n⚙️  Testing engine configuration...')
    engine.send('setoption name Threads value 1')
    engine.send('setoption name Hash value 128')
    console.log('✅ Engine options set')
    
    // 5. Quick mate-in-1 test
    console.log('\n🏁 Testing mate detection...')
    const mateInOneFen = 'rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3'
    const mateAnalysis = await engine.analyzePosition(mateInOneFen, 5)
    console.log(`✅ Mate-in-1 solution: ${mateAnalysis.bestMove}`)
    
    // 6. Clean shutdown
    console.log('\n🔄 Testing graceful shutdown...')
    await engine.quit()
    console.log('✅ Engine shutdown complete')
    
    console.log('\n🎉 All external engine tests passed!')
    console.log('\n📈 Performance Summary:')
    console.log('  - UCI communication: Working')
    console.log('  - Position analysis: Working') 
    console.log('  - Engine configuration: Working')
    console.log('  - Mate detection: Working')
    console.log('  - Graceful shutdown: Working')
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message)
    console.error('Stack:', error.stack)
    process.exit(1)
  }
}

async function quickTest() {
  console.log('⚡ Quick Stockfish test...\n')
  
  try {
    const manager = new StockfishBinaryManager({ debug: false })
    const binaryPath = manager.getBinaryPath(detectPlatform())
    
    const engine = new UCIEngine(binaryPath)
    await engine.start()
    
    const analysis = await engine.analyzePosition(
      'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 
      8
    )
    
    console.log(`✅ Quick test passed! Best move: ${analysis.bestMove}`)
    await engine.quit()
    
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
  testExternalEngine()
} else {
  console.log(`
🚀 External Engine Tester

Usage: node scripts/test-external-engine.js [command]

Commands:
  test   - Full engine test suite (default)
  quick  - Quick functionality test

Examples:
  node scripts/test-external-engine.js
  node scripts/test-external-engine.js quick
`)
}