/**
 * Download utilities for Stockfish binary management
 */

import fs from 'fs/promises'
import { createWriteStream } from 'fs'
import { pipeline } from 'stream/promises'
import { createReadStream } from 'fs'
import path from 'path'
import { spawn } from 'child_process'

export async function downloadFile(url, outputPath) {
  console.log(`Downloading ${url} to ${outputPath}`)
  
  try {
    // Ensure output directory exists
    await fs.mkdir(path.dirname(outputPath), { recursive: true })
    
    // Use fetch for downloading (Node.js 18+ has built-in fetch)
    const response = await fetch(url)
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    // Stream the response to file
    const writeStream = createWriteStream(outputPath)
    await pipeline(response.body, writeStream)
    
    console.log(`Download completed: ${outputPath}`)
    return outputPath
  } catch (error) {
    console.error(`Download failed: ${error.message}`)
    throw error
  }
}

export async function extractTarFile(tarPath, outputDir) {
  console.log(`Extracting ${tarPath} to ${outputDir}`)
  
  try {
    // Ensure output directory exists
    await fs.mkdir(outputDir, { recursive: true })
    
    // Use tar command to extract
    await new Promise((resolve, reject) => {
      const tar = spawn('tar', ['-xf', tarPath, '-C', outputDir], {
        stdio: 'inherit'
      })
      
      tar.on('close', (code) => {
        if (code === 0) {
          resolve()
        } else {
          reject(new Error(`tar extraction failed with code ${code}`))
        }
      })
      
      tar.on('error', reject)
    })
    
    console.log(`Extraction completed: ${outputDir}`)
  } catch (error) {
    console.error(`Extraction failed: ${error.message}`)
    throw error
  }
}

export async function makeExecutable(filePath) {
  try {
    // Make file executable (Unix systems)
    await fs.chmod(filePath, 0o755)
    console.log(`Made executable: ${filePath}`)
  } catch (error) {
    console.warn(`Could not make executable: ${error.message}`)
  }
}

export async function fileExists(filePath) {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}