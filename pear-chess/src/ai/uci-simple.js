/**
 * Pear's Gambit - Simplified UCI Protocol
 * 
 * A simpler, more robust UCI implementation
 */

import { EventEmitter } from 'events'

/**
 * Simplified UCI Protocol handler
 */
export class SimpleUCI extends EventEmitter {
  constructor() {
    super()
    this.buffer = ''
    this.waiters = new Map() // Maps response types to callbacks
  }

  /**
   * Send a command and optionally wait for a response
   * @param {string} command - UCI command
   * @param {string} waitFor - Optional response to wait for
   * @param {number} timeout - Timeout in ms
   */
  send(command, waitFor = null, timeout = 10000) {
    // Emit the command to be sent
    this.emit('send', command)
    
    if (!waitFor) {
      return Promise.resolve()
    }
    
    return new Promise((resolve, reject) => {
      // Set up timeout
      const timer = setTimeout(() => {
        this.waiters.delete(waitFor)
        reject(new Error(`Timeout waiting for ${waitFor}`))
      }, timeout)
      
      // Store waiter
      this.waiters.set(waitFor, { resolve, reject, timer })
    })
  }

  /**
   * Process incoming data from engine
   * @param {string} data - Raw data from engine
   */
  processData(data) {
    this.buffer += data
    const lines = this.buffer.split('\n')
    this.buffer = lines.pop() || ''
    
    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed) {
        this.processLine(trimmed)
      }
    }
  }

  /**
   * Process a single line of output
   * @param {string} line - Line from engine
   */
  processLine(line) {
    // Emit raw line for debugging
    this.emit('line', line)
    
    // Check for expected responses
    if (line === 'uciok' && this.waiters.has('uciok')) {
      const waiter = this.waiters.get('uciok')
      this.waiters.delete('uciok')
      clearTimeout(waiter.timer)
      waiter.resolve()
      this.emit('uciok')
    }
    else if (line === 'readyok' && this.waiters.has('readyok')) {
      const waiter = this.waiters.get('readyok')
      this.waiters.delete('readyok')
      clearTimeout(waiter.timer)
      waiter.resolve()
      this.emit('ready')
    }
    else if (line.startsWith('bestmove')) {
      const parts = line.split(' ')
      const bestMove = parts[1]
      const ponderMove = parts[3]
      
      if (this.waiters.has('bestmove')) {
        const waiter = this.waiters.get('bestmove')
        this.waiters.delete('bestmove')
        clearTimeout(waiter.timer)
        waiter.resolve({ bestMove, ponderMove })
      }
      
      this.emit('bestmove', bestMove, ponderMove)
    }
    else if (line.startsWith('info')) {
      const info = this.parseInfo(line)
      this.emit('info', info)
    }
    else if (line.startsWith('id name')) {
      this.emit('id', { name: line.substring(8) })
    }
    else if (line.startsWith('id author')) {
      this.emit('id', { author: line.substring(10) })
    }
  }

  /**
   * Parse info line
   * @param {string} line - Info line from engine
   */
  parseInfo(line) {
    const info = {}
    const parts = line.substring(5).split(' ')
    
    for (let i = 0; i < parts.length; i++) {
      const key = parts[i]
      
      switch (key) {
        case 'depth':
          info.depth = parseInt(parts[++i])
          break
        case 'seldepth':
          info.seldepth = parseInt(parts[++i])
          break
        case 'time':
          info.time = parseInt(parts[++i])
          break
        case 'nodes':
          info.nodes = parseInt(parts[++i])
          break
        case 'score':
          i++
          if (parts[i] === 'cp') {
            info.score = { unit: 'cp', value: parseInt(parts[++i]) }
          } else if (parts[i] === 'mate') {
            info.score = { unit: 'mate', value: parseInt(parts[++i]) }
          }
          break
        case 'pv':
          info.pv = parts.slice(i + 1)
          i = parts.length
          break
      }
    }
    
    return info
  }

  /**
   * Clear all pending waiters
   */
  clear() {
    for (const [key, waiter] of this.waiters) {
      clearTimeout(waiter.timer)
      waiter.reject(new Error('UCI protocol cleared'))
    }
    this.waiters.clear()
    this.buffer = ''
  }
}