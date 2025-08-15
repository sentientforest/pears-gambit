/**
 * Platform detection utilities for Stockfish binary management
 */

export function detectPlatform() {
  const platform = process.platform
  const arch = process.arch
  
  // Map Node.js platform/arch to our naming convention
  const platformMap = {
    'linux': {
      'x64': 'linux-x64',
      'arm64': 'linux-arm64'
    },
    'darwin': {
      'x64': 'darwin-x64',
      'arm64': 'darwin-arm64'
    },
    'win32': {
      'x64': 'win32-x64'
    }
  }
  
  if (!platformMap[platform]) {
    throw new Error(`Unsupported platform: ${platform}`)
  }
  
  if (!platformMap[platform][arch]) {
    throw new Error(`Unsupported architecture: ${arch} on ${platform}`)
  }
  
  return platformMap[platform][arch]
}

export function getBinaryName(platform) {
  const binaryNames = {
    'linux-x64': 'stockfish',
    'linux-arm64': 'stockfish', // Fallback to x64
    'darwin-x64': 'stockfish',
    'darwin-arm64': 'stockfish',
    'win32-x64': 'stockfish.exe'
  }
  
  return binaryNames[platform]
}

export function getDownloadUrl(platform, version = 'sf_17.1') {
  const baseUrl = 'https://github.com/official-stockfish/Stockfish/releases/download'
  
  // Use SSE41-POPCNT as the most compatible version for older CPUs
  const urlMap = {
    'linux-x64': `${baseUrl}/${version}/stockfish-ubuntu-x86-64-sse41-popcnt.tar`,
    'linux-arm64': `${baseUrl}/${version}/stockfish-ubuntu-x86-64-sse41-popcnt.tar`, // Conservative fallback
    'darwin-x64': `${baseUrl}/${version}/stockfish-macos-x86-64-sse41-popcnt.tar`,
    'darwin-arm64': `${baseUrl}/${version}/stockfish-macos-m1-apple-silicon.tar`,
    'win32-x64': `${baseUrl}/${version}/stockfish-windows-x86-64-sse41-popcnt.exe`
  }
  
  return urlMap[platform]
}