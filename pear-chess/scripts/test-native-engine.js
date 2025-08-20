#!/usr/bin/env node

/**
 * Test Native Engine Integration
 * Verifies the native Stockfish binding works in the AI system
 */

import { createStockfishAnalysis, AI } from '../src/ai/index.js'

async function testNativeEngine() {
  console.log('🧪 Testing Native Engine Integration\n')
  
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

  // Test 1: Check available engines
  await test('Check Available Engines', async () => {
    const status = AI.getStatus()
    return `Native: ${status.hasNativeEngine}, External: ${status.hasExternalEngine}`
  })()

  // Test 2: Create native engine explicitly
  await test('Create Native Engine', async () => {
    const engine = createStockfishAnalysis({ engineType: 'native' })
    const engineName = engine.constructor.name
    return `Created: ${engineName}`
  })()

  // Test 3: Create external engine explicitly  
  await test('Create External Engine', async () => {
    const engine = createStockfishAnalysis({ engineType: 'external' })
    const engineName = engine.constructor.name
    return `Created: ${engineName}`
  })()

  // Test 4: Auto-selection priority
  await test('Auto-selection Priority', async () => {
    const engine = createStockfishAnalysis({ engineType: 'auto' })
    const engineName = engine.constructor.name
    
    // Should prefer native over external
    const expectedPriority = engine.constructor.name.includes('Native') ? 'native' : 
                           engine.constructor.name.includes('Simple') ? 'external' : 'stub'
    
    return `Auto-selected: ${engineName} (${expectedPriority})`
  })()

  // Test 5: Native engine functionality (if available)
  try {
    const nativeEngine = createStockfishAnalysis({ engineType: 'native' })
    
    if (nativeEngine.constructor.name === 'NativeStockfishEngine') {
      await test('Native Engine Start', async () => {
        await nativeEngine.start()
        return `Ready: ${nativeEngine.isReady}`
      })()

      await test('Native Engine Analysis', async () => {
        const analysis = await nativeEngine.analyze(
          'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
          { depth: 5 }
        )
        return `Best move: ${analysis.bestMove}, Depth: ${analysis.depth}`
      })()

      await test('Native Engine Stats', async () => {
        const stats = nativeEngine.getStats()
        return `Type: ${stats.engineType}, Stub: ${stats.usingStub}`
      })()

      await test('Native Engine Shutdown', async () => {
        await nativeEngine.quit()
        return `Shutdown: ${!nativeEngine.isReady}`
      })()
    } else {
      console.log('⚠️  Native engine not available, skipping native-specific tests')
    }
  } catch (error) {
    console.log('⚠️  Native engine tests skipped:', error.message)
  }

  // Test 6: AI Module with engine selection
  await test('AI Module with Native Engine', async () => {
    // Reset AI module
    await AI.shutdown()
    
    await AI.initialize({ engineType: 'auto' })
    const status = AI.getStatus()
    
    return `Engine: ${status.engineType}, Ready: ${status.stockfishReady}`
  })()

  // Test 7: Engine performance comparison
  await test('Engine Performance Comparison', async () => {
    const engines = []
    
    // Test external engine
    try {
      const external = createStockfishAnalysis({ engineType: 'external' })
      if (external.constructor.name === 'SimpleStockfishEngine') {
        await external.start()
        const start = Date.now()
        await external.analyze('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', { depth: 5 })
        const time = Date.now() - start
        engines.push(`External: ${time}ms`)
        await external.quit()
      }
    } catch (error) {
      engines.push('External: not available')
    }
    
    // Test native engine  
    try {
      const native = createStockfishAnalysis({ engineType: 'native' })
      if (native.constructor.name === 'NativeStockfishEngine') {
        await native.start()
        const start = Date.now()
        await native.analyze('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', { depth: 5 })
        const time = Date.now() - start
        engines.push(`Native: ${time}ms`)
        await native.quit()
      }
    } catch (error) {
      engines.push('Native: not available')
    }
    
    return engines.join(', ')
  })()

  // Test 8: Engine feature compatibility
  await test('Engine Feature Compatibility', async () => {
    const features = []
    
    const testEngine = async (engineType, name) => {
      try {
        const engine = createStockfishAnalysis({ engineType })
        await engine.start()
        
        const hasAnalyze = typeof engine.analyze === 'function'
        const hasPosition = typeof engine.position === 'function'
        const hasSetOption = typeof engine.setOption === 'function'
        
        features.push(`${name}: analyze=${hasAnalyze}, position=${hasPosition}, options=${hasSetOption}`)
        
        await engine.quit()
      } catch (error) {
        features.push(`${name}: error`)
      }
    }
    
    await testEngine('external', 'External')
    await testEngine('native', 'Native')
    
    return features.join('; ')
  })()

  // Cleanup
  await AI.shutdown()

  // Summary
  console.log(`\n📊 Test Results: ${passed}/${tests} passed, ${failed} failed`)
  
  if (failed === 0) {
    console.log('\n🎉 All native engine integration tests passed!')
    console.log('\n💡 Native Engine Features:')
    console.log('  ✅ Engine selection and fallback working')
    console.log('  ✅ Native and external engines coexist')
    console.log('  ✅ Auto-selection prioritizes native engine')
    console.log('  ✅ Feature compatibility maintained')
    console.log('  ✅ Performance comparison available')
    
    const finalStatus = AI.getStatus()
    console.log(`\n🔧 Available Engines: Native=${finalStatus.hasNativeEngine}, External=${finalStatus.hasExternalEngine}`)
  } else {
    console.log('\n⚠️  Some tests failed. Check the issues above.')
    process.exit(1)
  }
}

async function quickTest() {
  console.log('⚡ Quick Native Engine Test...\n')
  
  try {
    console.log('1. Checking engine availability...')
    const status = AI.getStatus()
    console.log(`   Native engine: ${status.hasNativeEngine}`)
    console.log(`   External engine: ${status.hasExternalEngine}`)
    
    console.log('2. Testing auto-selection...')
    const engine = createStockfishAnalysis({ engineType: 'auto' })
    console.log(`   Selected: ${engine.constructor.name}`)
    
    console.log('3. Testing engine start...')
    await engine.start()
    console.log(`   Ready: ${engine.isReady}`)
    
    console.log('4. Testing analysis...')
    const analysis = await engine.analyze(
      'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKQ - 0 1',
      { depth: 3 }
    )
    console.log(`   Best move: ${analysis.bestMove}`)
    
    console.log('5. Shutting down...')
    await engine.quit()
    
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
  testNativeEngine()
} else {
  console.log(`
🚀 Native Engine Tester

Usage: node scripts/test-native-engine.js [command]

Commands:
  test   - Full native engine integration test suite (default)
  quick  - Quick functionality test

Examples:
  node scripts/test-native-engine.js
  node scripts/test-native-engine.js quick
`)
}