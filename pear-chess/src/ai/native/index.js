/**
 * Pear's Gambit - Native Stockfish Binding Entry Point
 * 
 * JavaScript interface for the native Stockfish addon
 */

const path = require('path')
const fs = require('fs')

// Platform-specific binary loading
function getPlatformBinary() {
  const platform = process.platform
  const arch = process.arch
  
  const platformMap = {
    win32: 'win32',
    darwin: 'darwin', 
    linux: 'linux'
  }
  
  const archMap = {
    x64: 'x64',
    arm64: 'arm64',
    arm: 'arm'
  }
  
  const platformName = platformMap[platform]
  const archName = archMap[arch]
  
  if (!platformName || !archName) {
    throw new Error(`Unsupported platform: ${platform}-${arch}`)
  }
  
  return `${platformName}-${archName}`
}

// Load the native module
function loadNativeModule() {
  const binaryName = getPlatformBinary()
  const prebuildsPath = path.join(__dirname, '..', '..', '..', 'prebuilds', binaryName)
  const binaryPath = path.join(prebuildsPath, 'stockfish.node')
  
  if (!fs.existsSync(binaryPath)) {
    throw new Error(
      `Native Stockfish module not found for ${binaryName}.\n` +
      `Expected: ${binaryPath}\n` +
      `Please run 'npm run build' to compile the native module.`
    )
  }
  
  try {
    return require(binaryPath)
  } catch (error) {
    throw new Error(`Failed to load native Stockfish module: ${error.message}`)
  }
}

// Export the native module
let nativeModule = null

try {
  nativeModule = loadNativeModule()
} catch (error) {
  // Fallback to external process implementation if native module fails
  console.warn('Native Stockfish module not available:', error.message)
  console.warn('Falling back to external process implementation')
  
  // Re-export the external engine as fallback
  const { SimpleStockfishEngine } = require('../external-engine-simple.js')
  
  module.exports = {
    StockfishEngine: SimpleStockfishEngine,
    isNative: false,
    fallback: true
  }
} 

if (nativeModule) {
  // Wrap the native engine with a more JavaScript-friendly interface
  class NativeStockfishEngine {
    constructor(options = {}) {
      this.engine = new nativeModule.StockfishEngine()
      this.options = {
        debug: options.debug || false,
        ...options
      }
    }
    
    async start() {
      return new Promise((resolve, reject) => {
        try {
          const result = this.engine.start()
          resolve(result)
        } catch (error) {
          reject(error)
        }
      })
    }
    
    async stop() {
      return new Promise((resolve, reject) => {
        try {
          const result = this.engine.stop()
          resolve(result)
        } catch (error) {
          reject(error)
        }
      })
    }
    
    async setOption(name, value) {
      return new Promise((resolve, reject) => {
        try {
          const result = this.engine.setOption(name, value)
          resolve(result)
        } catch (error) {
          reject(error)
        }
      })
    }
    
    async position(fen, moves = []) {
      return new Promise((resolve, reject) => {
        try {
          const result = this.engine.position(fen, moves)
          resolve(result)
        } catch (error) {
          reject(error)
        }
      })
    }
    
    async go(options = {}) {
      return new Promise((resolve, reject) => {
        try {
          const result = this.engine.go(options)
          resolve(result)
        } catch (error) {
          reject(error)
        }
      })
    }
    
    async analyze(fen, options = {}) {
      return new Promise((resolve, reject) => {
        const depth = options.depth || 20
        
        this.engine.analyzeAsync(fen, depth, (error, result) => {
          if (error) {
            reject(new Error(error))
          } else {
            // Convert native result to match external engine format
            const analysis = {
              fen: result.fen,
              depth: result.depth,
              bestMove: result.bestMove,
              lines: [{
                moves: result.pv || [],
                score: {
                  unit: 'cp',
                  value: result.evaluation
                },
                depth: result.depth
              }]
            }
            resolve(analysis)
          }
        })
      })
    }
    
    async isReady() {
      return new Promise((resolve, reject) => {
        try {
          const result = this.engine.isReady()
          resolve(result)
        } catch (error) {
          reject(error)
        }
      })
    }
    
    async quit() {
      return new Promise((resolve, reject) => {
        try {
          const result = this.engine.quit()
          resolve(result)
        } catch (error) {
          reject(error)
        }
      })
    }
  }
  
  module.exports = {
    StockfishEngine: NativeStockfishEngine,
    isNative: true,
    fallback: false,
    version: require('./package.json').version
  }
}

// Export utility functions
module.exports.createEngine = function(options = {}) {
  return new module.exports.StockfishEngine(options)
}

module.exports.isSupported = function() {
  try {
    const binaryName = getPlatformBinary()
    const prebuildsPath = path.join(__dirname, '..', '..', '..', 'prebuilds', binaryName)
    const binaryPath = path.join(prebuildsPath, 'stockfish.node')
    return fs.existsSync(binaryPath)
  } catch {
    return false
  }
}

module.exports.getBinaryPath = function() {
  const binaryName = getPlatformBinary()
  const prebuildsPath = path.join(__dirname, '..', '..', '..', 'prebuilds', binaryName)
  return path.join(prebuildsPath, 'stockfish.node')
}