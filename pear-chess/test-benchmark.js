#!/usr/bin/env node

/**
 * Test the engine benchmarking suite
 */

import { EngineBenchmark, quickBenchmark, compareEngines } from './src/ai/benchmark.js'

async function testQuickBenchmark() {
  console.log('⚡ Running Quick Benchmark...\n')
  
  const result = await quickBenchmark({
    name: 'Test Engine',
    depth: 8,
    skillLevel: 15
  }, {
    positions: 'standard',
    depths: [8],
    verbose: true
  })
  
  console.log('📊 Quick Benchmark Results:')
  console.log('   Engine:', result.name)
  console.log('   Average time:', result.summary.time?.avg + 'ms')
  console.log('   Average nodes:', result.summary.nodes?.avg?.toLocaleString())
  console.log('   Average NPS:', result.summary.nps?.avg?.toLocaleString())
  console.log('   Accuracy:', result.summary.accuracy + '%')
}

async function testEngineComparison() {
  console.log('\n🏁 Running Engine Comparison...\n')
  
  const comparison = await compareEngines(
    { name: 'Fast Engine', depth: 8, skillLevel: 15 },
    { name: 'Deep Engine', depth: 12, skillLevel: 20 },
    {
      positions: [
        {
          name: 'Test Position',
          fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
          expectedMove: 'e2e4'
        }
      ],
      repetitions: 2,
      verbose: true
    }
  )
  
  console.log('🏆 Comparison Results:')
  console.log('   Fastest:', comparison.fastest?.engine, '(' + comparison.fastest?.score + 'ms)')
  console.log('   Most Accurate:', comparison.mostAccurate?.engine, '(' + comparison.mostAccurate?.score + '%)')
  console.log('   Most Efficient:', comparison.mostEfficient?.engine, '(' + comparison.mostEfficient?.score?.toLocaleString() + ' nps)')
}

async function testFullBenchmark() {
  console.log('\n📈 Running Full Benchmark Suite...\n')
  
  const benchmark = new EngineBenchmark({
    engines: [
      { name: 'Stockfish Level 10', depth: 8, skillLevel: 10 },
      { name: 'Stockfish Level 15', depth: 10, skillLevel: 15 }
    ],
    positions: 'standard',
    depths: [8, 10],
    timeControls: [500, 1000],
    repetitions: 1,
    verbose: false,
    saveResults: true,
    outputPath: './test-benchmark-results.json'
  })
  
  // Set up event listeners
  benchmark.on('benchmark-start', (data) => {
    console.log('🚀 Benchmark started with', data.options.engines.length, 'engines')
  })
  
  benchmark.on('engine-start', (data) => {
    console.log('🤖 Testing engine:', data.engine)
  })
  
  benchmark.on('test-start', (data) => {
    console.log(`   📋 Testing ${data.type}: ${data.value}`)
  })
  
  benchmark.on('position-complete', (data) => {
    console.log(`      ✓ ${data.position} (${data.time}ms)`)
  })
  
  benchmark.on('test-complete', (data) => {
    const summary = data.summary
    console.log(`   📊 ${data.type} results: avg ${summary.time?.avg}ms, ${summary.nps?.avg?.toLocaleString()} nps`)
  })
  
  benchmark.on('engine-complete', (data) => {
    console.log(`✅ ${data.engine} complete - accuracy: ${data.results.summary.accuracy || 'N/A'}%`)
  })
  
  benchmark.on('benchmark-complete', (data) => {
    console.log('\n🏆 Benchmark Complete!')
    
    if (data.report.comparison) {
      const comp = data.report.comparison
      console.log('   Winners:')
      console.log('     Fastest:', comp.fastest?.engine)
      console.log('     Most Accurate:', comp.mostAccurate?.engine)
      console.log('     Most Efficient:', comp.mostEfficient?.engine)
    }
  })
  
  benchmark.on('benchmark-error', (error) => {
    console.error('❌ Benchmark error:', error.message)
  })
  
  try {
    const report = await benchmark.runBenchmark()
    console.log('\n📋 Final Report Summary:')
    console.log('   Total engines tested:', report.engines)
    console.log('   Total positions tested:', report.positions)
    console.log('   Results saved to:', benchmark.options.outputPath)
    
  } catch (error) {
    console.error('❌ Benchmark failed:', error.message)
    process.exit(1)
  }
}

// Main test runner
async function runTests() {
  try {
    await testQuickBenchmark()
    await testEngineComparison()
    await testFullBenchmark()
    
    console.log('\n✅ All benchmark tests completed successfully!')
    
  } catch (error) {
    console.error('\n❌ Benchmark test failed:', error.message)
    process.exit(1)
  }
}

runTests().catch(console.error)