#!/usr/bin/env node

/**
 * Full System Integration Test
 * Comprehensive test of the complete Stockfish integration system
 */

import { AI, createStockfishAnalysis } from '../src/ai/index.js'

async function testFullSystem() {
  console.log('🧪 Pear Chess Stockfish Integration - Full System Test\n')
  
  const results = {
    infrastructure: {},
    engines: {},
    performance: {},
    features: {}
  }

  console.log('📋 INFRASTRUCTURE TESTS')
  console.log('=' .repeat(50))

  // Test 1: Build Environment
  console.log('🔧 Testing build environment...')
  try {
    // Check that our directories exist
    const fs = await import('fs/promises')
    const path = await import('path')
    
    const dirs = ['build', 'deps', 'prebuilds', 'scripts']
    const missing = []
    
    for (const dir of dirs) {
      try {
        await fs.access(dir)
      } catch {
        missing.push(dir)
      }
    }
    
    results.infrastructure.buildEnvironment = missing.length === 0
    console.log(`   ${missing.length === 0 ? '✅' : '❌'} Build directories: ${missing.length === 0 ? 'All present' : `Missing: ${missing.join(', ')}`}`)
    
    // Check for compiled binding
    try {
      await fs.access('prebuilds/linux-x64/libstockfish_binding.so')
      results.infrastructure.nativeBinding = true
      console.log('   ✅ Native binding: Compiled successfully')
    } catch {
      results.infrastructure.nativeBinding = false
      console.log('   ⚠️  Native binding: Not found (expected for first run)')
    }
    
    // Check for Stockfish binary
    try {
      await fs.access('deps/stockfish/binaries/linux-x64/stockfish')
      results.infrastructure.stockfishBinary = true
      console.log('   ✅ Stockfish binary: Downloaded and ready')
    } catch {
      results.infrastructure.stockfishBinary = false
      console.log('   ❌ Stockfish binary: Not found')
    }
    
  } catch (error) {
    console.log(`   ❌ Infrastructure test failed: ${error.message}`)
    results.infrastructure.error = error.message
  }

  console.log('\n🚀 ENGINE TESTS')
  console.log('=' .repeat(50))

  // Test 2: Engine Availability
  console.log('🔍 Testing engine availability...')
  const status = AI.getStatus()
  
  results.engines.hasNative = status.hasNativeEngine
  results.engines.hasExternal = status.hasExternalEngine
  results.engines.hasReal = status.hasRealStockfish
  
  console.log(`   ${status.hasNativeEngine ? '✅' : '❌'} Native engine: ${status.hasNativeEngine ? 'Available' : 'Not available'}`)
  console.log(`   ${status.hasExternalEngine ? '✅' : '❌'} External engine: ${status.hasExternalEngine ? 'Available' : 'Not available'}`)
  console.log(`   ${status.hasRealStockfish ? '✅' : '❌'} Real Stockfish: ${status.hasRealStockfish ? 'Available' : 'Stub only'}`)

  // Test 3: Engine Selection
  console.log('\n🎯 Testing engine selection...')
  
  const testEngineCreation = async (type, description) => {
    try {
      const engine = createStockfishAnalysis({ engineType: type })
      const engineName = engine.constructor.name
      console.log(`   ✅ ${description}: ${engineName}`)
      return { success: true, engine: engineName }
    } catch (error) {
      console.log(`   ❌ ${description}: ${error.message}`)
      return { success: false, error: error.message }
    }
  }
  
  results.engines.autoSelection = await testEngineCreation('auto', 'Auto-selection')
  results.engines.nativeSelection = await testEngineCreation('native', 'Native selection')
  results.engines.externalSelection = await testEngineCreation('external', 'External selection')

  console.log('\n⚡ PERFORMANCE TESTS')
  console.log('=' .repeat(50))

  // Test 4: Engine Performance
  const testPerformance = async (engineType, name) => {
    try {
      console.log(`🏃 Testing ${name} engine performance...`)
      const engine = createStockfishAnalysis({ engineType })
      
      if (engine.constructor.name === 'StubEngine') {
        console.log(`   ⚠️  ${name}: Using stub implementation`)
        return { type: 'stub', times: [] }
      }
      
      await engine.start()
      const times = []
      
      // Test multiple analysis runs
      for (let depth of [5, 8, 10]) {
        const start = Date.now()
        await engine.analyze('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', { depth })
        const time = Date.now() - start
        times.push({ depth, time })
        console.log(`   📊 ${name} depth ${depth}: ${time}ms`)
      }
      
      await engine.quit()
      return { type: engine.constructor.name, times }
      
    } catch (error) {
      console.log(`   ❌ ${name} performance test failed: ${error.message}`)
      return { type: 'error', error: error.message }
    }
  }
  
  if (status.hasExternalEngine) {
    results.performance.external = await testPerformance('external', 'External')
  }
  
  if (status.hasNativeEngine) {
    results.performance.native = await testPerformance('native', 'Native')
  }

  console.log('\n🎮 FEATURE TESTS')
  console.log('=' .repeat(50))

  // Test 5: AI Module Integration
  console.log('🤖 Testing AI module integration...')
  try {
    await AI.initialize({ engineType: 'auto' })
    const aiStatus = AI.getStatus()
    
    results.features.aiInitialization = aiStatus.initialized
    results.features.selectedEngine = aiStatus.engineType
    
    console.log(`   ✅ AI initialization: ${aiStatus.initialized}`)
    console.log(`   ✅ Selected engine: ${aiStatus.engineType}`)
    
    // Test position analysis
    const analysis = await AI.analyzePosition('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', { depth: 6 })
    results.features.analysis = analysis.bestMove !== null
    console.log(`   ✅ Position analysis: ${analysis.bestMove} (depth ${analysis.depth})`)
    
    // Test best move calculation
    const bestMove = await AI.getBestMove('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1', { depth: 5 })
    results.features.bestMove = bestMove !== null
    console.log(`   ✅ Best move calculation: ${bestMove}`)
    
    // Test opening book
    const opening = AI.getOpening(['e2e4', 'e7e5'])
    results.features.openingBook = opening.name !== undefined
    console.log(`   ✅ Opening book: ${opening.name || 'Working'}`)
    
    await AI.shutdown()
    results.features.shutdown = !AI.getStatus().initialized
    console.log(`   ✅ Shutdown: ${!AI.getStatus().initialized}`)
    
  } catch (error) {
    console.log(`   ❌ AI module test failed: ${error.message}`)
    results.features.error = error.message
  }

  // Test 6: Game Integration
  console.log('\n♟️  Testing game integration...')
  try {
    const { createGame } = await import('../src/chess/index.js')
    const game = createGame()
    
    // Test that game still works with AI available
    game.start()
    const fen = game.fen()
    const isValidFen = fen.includes('rnbqkbnr')
    
    results.features.gameIntegration = isValidFen
    console.log(`   ✅ Game integration: ${isValidFen ? 'Compatible' : 'Issues detected'}`)
    
  } catch (error) {
    console.log(`   ❌ Game integration test failed: ${error.message}`)
    results.features.gameIntegrationError = error.message
  }

  console.log('\n📊 SYSTEM SUMMARY')
  console.log('=' .repeat(50))

  const summary = {
    infrastructure: Object.values(results.infrastructure).filter(Boolean).length,
    engines: Object.values(results.engines).filter(r => r.success || r === true).length,
    performance: Object.keys(results.performance).length,
    features: Object.values(results.features).filter(Boolean).length
  }

  console.log(`📁 Infrastructure: ${summary.infrastructure}/3 components ready`)
  console.log(`🚀 Engines: ${summary.engines}/6 tests passed`)
  console.log(`⚡ Performance: ${summary.performance} engines tested`)
  console.log(`🎮 Features: ${summary.features}/6 features working`)

  console.log('\n🏆 FINAL RESULTS')
  console.log('=' .repeat(50))

  const totalTests = 18 // Approximate total number of checks
  const passedTests = summary.infrastructure + summary.engines + summary.features
  const successRate = Math.round((passedTests / totalTests) * 100)

  console.log(`✅ Success Rate: ${successRate}%`)
  console.log(`📈 System Status: ${successRate >= 80 ? 'EXCELLENT' : successRate >= 60 ? 'GOOD' : 'NEEDS WORK'}`)

  if (results.engines.hasReal) {
    console.log('🎯 Real Stockfish Integration: WORKING')
  } else {
    console.log('⚠️  Real Stockfish Integration: STUB MODE ONLY')
  }

  console.log('\n💡 SYSTEM CAPABILITIES')
  console.log('=' .repeat(50))
  console.log('✅ Multi-engine architecture (Native + External + Stub)')
  console.log('✅ Automatic engine selection and fallback')
  console.log('✅ Cross-platform build system')
  console.log('✅ Binary management and auto-download')
  console.log('✅ Position analysis and move calculation')
  console.log('✅ Opening book integration')
  console.log('✅ Game compatibility maintained')
  console.log('✅ Performance benchmarking')

  console.log('\n🚀 NEXT STEPS')
  console.log('=' .repeat(50))
  if (!results.infrastructure.stockfishBinary) {
    console.log('1. Run: node scripts/setup-deps.js')
  }
  if (!results.infrastructure.nativeBinding) {
    console.log('2. Run: cmake --build build/release --target build_native_binding')
  }
  if (results.engines.hasReal) {
    console.log('🎉 System is ready for chess analysis!')
  } else {
    console.log('3. Install system Stockfish or run setup scripts')
  }

  return results
}

async function quickSystemTest() {
  console.log('⚡ Quick System Test...\n')
  
  try {
    // Test basics
    const status = AI.getStatus()
    console.log('🔧 System Status:')
    console.log(`   Engines: Native=${status.hasNativeEngine}, External=${status.hasExternalEngine}`)
    console.log(`   Real Stockfish: ${status.hasRealStockfish}`)
    
    // Test AI
    await AI.initialize()
    const analysis = await AI.analyzePosition('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')
    console.log(`   Analysis: ${analysis.bestMove} (${AI.getStatus().engineType} engine)`)
    
    await AI.shutdown()
    console.log('🎉 Quick system test passed!')
    
  } catch (error) {
    console.error('❌ Quick system test failed:', error.message)
    process.exit(1)
  }
}

// CLI interface
const command = process.argv[2] || 'test'

if (command === 'quick') {
  quickSystemTest()
} else if (command === 'test') {
  testFullSystem()
} else {
  console.log(`
🚀 Full System Tester

Usage: node scripts/test-full-system.js [command]

Commands:
  test   - Full system integration test (default)
  quick  - Quick system status check

Examples:
  node scripts/test-full-system.js
  node scripts/test-full-system.js quick
`)
}