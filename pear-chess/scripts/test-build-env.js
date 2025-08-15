#!/usr/bin/env node

/**
 * Test script to verify build environment setup
 */

import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { spawn } from 'child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.dirname(__dirname)

async function testBuildEnvironment() {
  console.log('🧪 Testing Pear Chess build environment...\n')
  
  const tests = []
  let passed = 0
  let failed = 0

  // Helper function to run a test
  function test(name, testFn) {
    tests.push({ name, fn: testFn })
  }

  // Helper function to check if directory exists
  async function dirExists(dir) {
    try {
      const stat = await fs.stat(dir)
      return stat.isDirectory()
    } catch {
      return false
    }
  }

  // Helper function to check if file exists
  async function fileExists(file) {
    try {
      const stat = await fs.stat(file)
      return stat.isFile()
    } catch {
      return false
    }
  }

  // Helper function to run command and check if it exists
  function commandExists(command) {
    return new Promise((resolve) => {
      const child = spawn(command, ['--version'], { stdio: 'ignore' })
      child.on('close', (code) => {
        resolve(code === 0)
      })
      child.on('error', () => {
        resolve(false)
      })
    })
  }

  // Test 1: Check working directories
  test('Working directories created', async () => {
    const dirs = [
      'build/debug',
      'build/release', 
      'build/temp',
      'deps/stockfish/source',
      'deps/stockfish/binaries',
      'deps/stockfish/builds',
      'deps/cmake-tools',
      'prebuilds/linux-x64',
      'prebuilds/darwin-x64',
      'prebuilds/win32-x64',
      'scripts'
    ]

    for (const dir of dirs) {
      const fullPath = path.join(projectRoot, dir)
      if (!(await dirExists(fullPath))) {
        throw new Error(`Directory missing: ${dir}`)
      }
    }
    return `All ${dirs.length} directories exist`
  })

  // Test 2: Check .gitignore entries
  test('.gitignore updated', async () => {
    const gitignorePath = path.join(projectRoot, '.gitignore')
    const content = await fs.readFile(gitignorePath, 'utf8')
    
    const requiredEntries = [
      'build/',
      'deps/',
      'prebuilds/',
      '*.node',
      'CMakeFiles/',
      'stockfish'
    ]

    for (const entry of requiredEntries) {
      if (!content.includes(entry)) {
        throw new Error(`Missing .gitignore entry: ${entry}`)
      }
    }
    return `All ${requiredEntries.length} required entries found`
  })

  // Test 3: Check script files
  test('Build scripts created', async () => {
    const scripts = [
      'scripts/setup-deps.js',
      'scripts/platform-utils.js',
      'scripts/download-utils.js',
      'scripts/setup-env.sh',
      'scripts/setup-env.ps1'
    ]

    for (const script of scripts) {
      const fullPath = path.join(projectRoot, script)
      if (!(await fileExists(fullPath))) {
        throw new Error(`Script missing: ${script}`)
      }
    }
    return `All ${scripts.length} scripts exist`
  })

  // Test 4: Check CMake configuration files
  test('CMake configuration files', async () => {
    const cmakeFiles = [
      'cmake/variables.cmake',
      'cmake/toolchain.cmake'
    ]

    for (const file of cmakeFiles) {
      const fullPath = path.join(projectRoot, file)
      if (!(await fileExists(fullPath))) {
        throw new Error(`CMake file missing: ${file}`)
      }
    }
    return `All ${cmakeFiles.length} CMake files exist`
  })

  // Test 5: Check system requirements
  test('System requirements', async () => {
    const requirements = []
    
    // Check Node.js
    if (await commandExists('node')) {
      requirements.push('Node.js ✅')
    } else {
      requirements.push('Node.js ❌')
    }
    
    // Check npm
    if (await commandExists('npm')) {
      requirements.push('npm ✅')
    } else {
      requirements.push('npm ❌')
    }
    
    // Check CMake
    if (await commandExists('cmake')) {
      requirements.push('CMake ✅')
    } else {
      requirements.push('CMake ❌ (optional for external process mode)')
    }
    
    // Check tar (for binary extraction)
    if (await commandExists('tar')) {
      requirements.push('tar ✅')
    } else {
      requirements.push('tar ❌ (needed for Stockfish binary extraction)')
    }
    
    // Check compiler (optional)
    let hasCompiler = false
    if (await commandExists('gcc')) {
      requirements.push('GCC ✅')
      hasCompiler = true
    } else if (await commandExists('clang')) {
      requirements.push('Clang ✅')
      hasCompiler = true
    } else {
      requirements.push('C++ Compiler ❌ (needed for native bindings)')
    }
    
    return requirements.join(', ')
  })

  // Test 6: Binary manager functionality
  test('Binary manager functionality', async () => {
    try {
      const { StockfishBinaryManager } = await import('./setup-deps.js')
      const manager = new StockfishBinaryManager({ debug: false })
      
      // Test platform detection
      const { detectPlatform } = await import('./platform-utils.js')
      const platform = detectPlatform()
      
      // Test binary path generation
      const binaryPath = manager.getBinaryPath(platform)
      
      return `Platform: ${platform}, Binary path: ${path.basename(binaryPath)}`
    } catch (error) {
      throw new Error(`Binary manager error: ${error.message}`)
    }
  })

  // Run all tests
  console.log(`Running ${tests.length} tests...\n`)

  for (const { name, fn } of tests) {
    try {
      const result = await fn()
      console.log(`✅ ${name}: ${result}`)
      passed++
    } catch (error) {
      console.log(`❌ ${name}: ${error.message}`)
      failed++
    }
  }

  // Summary
  console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`)
  
  if (failed === 0) {
    console.log('\n🎉 Build environment is ready!')
    console.log('\n💡 Next steps:')
    console.log('  1. Run: node scripts/setup-deps.js')
    console.log('  2. Test external engine functionality')
    console.log('  3. Set up CMake build system')
  } else {
    console.log('\n⚠️  Some tests failed. Please fix the issues above.')
    process.exit(1)
  }
}

testBuildEnvironment().catch(console.error)