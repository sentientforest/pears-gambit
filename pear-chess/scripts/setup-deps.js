#!/usr/bin/env node

/**
 * Stockfish Binary Management System
 * Downloads and manages Stockfish binaries for all platforms
 */

import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { detectPlatform, getBinaryName, getDownloadUrl } from './platform-utils.js'
import { downloadFile, extractTarFile, makeExecutable, fileExists } from './download-utils.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.dirname(__dirname)

export class StockfishBinaryManager {
  constructor(options = {}) {
    this.version = options.version || 'sf_17.1'
    this.basePath = path.join(projectRoot, 'deps', 'stockfish', 'binaries')
    this.tempPath = path.join(projectRoot, 'build', 'temp')
    this.debug = options.debug || false
  }

  log(...args) {
    if (this.debug) {
      console.log('[StockfishBinaryManager]', ...args)
    }
  }

  async ensureBinaries(targetPlatform = null) {
    const platform = targetPlatform || detectPlatform()
    this.log(`Ensuring Stockfish binaries for platform: ${platform}`)
    
    const binaryPath = this.getBinaryPath(platform)
    
    if (await fileExists(binaryPath)) {
      this.log(`Binary already exists: ${binaryPath}`)
      return binaryPath
    }
    
    this.log(`Binary not found, downloading...`)
    await this.downloadBinary(platform)
    return binaryPath
  }

  getBinaryPath(platform) {
    const binaryName = getBinaryName(platform)
    return path.join(this.basePath, platform, binaryName)
  }

  async downloadBinary(platform) {
    const url = getDownloadUrl(platform, this.version)
    const binaryName = getBinaryName(platform)
    const platformDir = path.join(this.basePath, platform)
    const finalBinaryPath = path.join(platformDir, binaryName)
    
    this.log(`Downloading Stockfish for ${platform}`)
    this.log(`URL: ${url}`)
    
    try {
      // Ensure directories exist
      await fs.mkdir(platformDir, { recursive: true })
      await fs.mkdir(this.tempPath, { recursive: true })
      
      if (url.endsWith('.exe')) {
        // Windows binary - direct download
        await downloadFile(url, finalBinaryPath)
        await makeExecutable(finalBinaryPath)
      } else {
        // Unix systems - tar archive
        const tempArchive = path.join(this.tempPath, `stockfish-${platform}.tar`)
        const tempExtractDir = path.join(this.tempPath, `extract-${platform}`)
        
        // Download tar file
        await downloadFile(url, tempArchive)
        
        // Extract
        await extractTarFile(tempArchive, tempExtractDir)
        
        // Find and move the binary
        await this.findAndMoveBinary(tempExtractDir, finalBinaryPath, binaryName)
        
        // Cleanup
        await fs.rm(tempArchive, { force: true })
        await fs.rm(tempExtractDir, { recursive: true, force: true })
      }
      
      this.log(`Successfully installed Stockfish binary: ${finalBinaryPath}`)
      return finalBinaryPath
      
    } catch (error) {
      this.log(`Failed to download binary for ${platform}:`, error.message)
      throw error
    }
  }

  async findAndMoveBinary(extractDir, targetPath, expectedName) {
    this.log(`Looking for binary in: ${extractDir}`)
    
    try {
      // Look for files that might be the Stockfish binary
      const files = await this.findStockfishFiles(extractDir)
      
      if (files.length === 0) {
        throw new Error(`No Stockfish binary found in extracted archive`)
      }
      
      // Use the first found binary (usually there's only one)
      const sourcePath = files[0]
      this.log(`Found binary: ${sourcePath}`)
      
      // Copy to final location
      await fs.copyFile(sourcePath, targetPath)
      await makeExecutable(targetPath)
      
      this.log(`Moved binary to: ${targetPath}`)
      
    } catch (error) {
      this.log(`Error finding/moving binary:`, error.message)
      throw error
    }
  }

  async findStockfishFiles(dir) {
    const files = []
    
    async function search(currentDir) {
      const entries = await fs.readdir(currentDir, { withFileTypes: true })
      
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name)
        
        if (entry.isDirectory()) {
          await search(fullPath)
        } else if (entry.isFile()) {
          // Look for files that might be Stockfish
          const name = entry.name.toLowerCase()
          if (name.includes('stockfish') && !name.includes('.')) {
            // Likely the binary (no extension)
            files.push(fullPath)
          }
        }
      }
    }
    
    await search(dir)
    return files
  }

  async verifyBinary(platform = null) {
    const targetPlatform = platform || detectPlatform()
    const binaryPath = this.getBinaryPath(targetPlatform)
    
    if (!(await fileExists(binaryPath))) {
      throw new Error(`Binary not found: ${binaryPath}`)
    }
    
    this.log(`Verifying binary: ${binaryPath}`)
    
    // TODO: Add actual verification by running `stockfish --help` or similar
    // For now, just check that it exists and is executable
    
    try {
      const stats = await fs.stat(binaryPath)
      const isExecutable = (stats.mode & parseInt('111', 8)) !== 0 // Check if any execute bit is set
      
      if (!isExecutable) {
        await makeExecutable(binaryPath)
      }
      
      this.log(`Binary verification passed: ${binaryPath}`)
      return true
      
    } catch (error) {
      this.log(`Binary verification failed:`, error.message)
      throw error
    }
  }

  async listAvailableBinaries() {
    const binaries = {}
    
    try {
      const platformDirs = await fs.readdir(this.basePath, { withFileTypes: true })
      
      for (const dir of platformDirs) {
        if (dir.isDirectory()) {
          const platform = dir.name
          const binaryPath = this.getBinaryPath(platform)
          const exists = await fileExists(binaryPath)
          
          binaries[platform] = {
            path: binaryPath,
            exists,
            verified: exists ? await this.verifyBinary(platform).catch(() => false) : false
          }
        }
      }
    } catch (error) {
      this.log(`Error listing binaries:`, error.message)
    }
    
    return binaries
  }

  async downloadAllPlatforms() {
    const platforms = ['linux-x64', 'linux-arm64', 'darwin-x64', 'darwin-arm64', 'win32-x64']
    const results = {}
    
    for (const platform of platforms) {
      try {
        this.log(`\n--- Downloading for ${platform} ---`)
        const binaryPath = await this.ensureBinaries(platform)
        results[platform] = { success: true, path: binaryPath }
      } catch (error) {
        this.log(`Failed to download for ${platform}:`, error.message)
        results[platform] = { success: false, error: error.message }
      }
    }
    
    return results
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2)
  const command = args[0] || 'current'
  
  const manager = new StockfishBinaryManager({ debug: true })
  
  try {
    switch (command) {
      case 'current':
        console.log('🔧 Setting up Stockfish for current platform...')
        const binaryPath = await manager.ensureBinaries()
        console.log(`✅ Stockfish ready: ${binaryPath}`)
        break
        
      case 'all':
        console.log('🔧 Setting up Stockfish for all platforms...')
        const results = await manager.downloadAllPlatforms()
        console.log('\n📊 Results:')
        for (const [platform, result] of Object.entries(results)) {
          if (result.success) {
            console.log(`  ✅ ${platform}: ${result.path}`)
          } else {
            console.log(`  ❌ ${platform}: ${result.error}`)
          }
        }
        break
        
      case 'list':
        console.log('📋 Available binaries:')
        const binaries = await manager.listAvailableBinaries()
        for (const [platform, info] of Object.entries(binaries)) {
          const status = info.verified ? '✅' : info.exists ? '⚠️' : '❌'
          console.log(`  ${status} ${platform}: ${info.path}`)
        }
        break
        
      case 'verify':
        const platform = args[1]
        if (platform) {
          await manager.verifyBinary(platform)
          console.log(`✅ Binary verified for ${platform}`)
        } else {
          await manager.verifyBinary()
          console.log(`✅ Binary verified for current platform`)
        }
        break
        
      default:
        console.log(`
🚀 Stockfish Binary Manager

Usage: node scripts/setup-deps.js [command]

Commands:
  current  - Download Stockfish for current platform (default)
  all      - Download Stockfish for all platforms
  list     - List available binaries
  verify   - Verify binary for current platform
  verify <platform> - Verify binary for specific platform

Examples:
  node scripts/setup-deps.js
  node scripts/setup-deps.js all
  node scripts/setup-deps.js verify linux-x64
        `)
    }
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}