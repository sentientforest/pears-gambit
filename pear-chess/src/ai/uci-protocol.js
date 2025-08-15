/**
 * Pear's Gambit - UCI Protocol Implementation
 * 
 * Handles Universal Chess Interface (UCI) communication with chess engines
 */

import { EventEmitter } from 'events'

/**
 * UCI Protocol handler for chess engine communication
 */
export class UCIProtocol extends EventEmitter {
  constructor() {
    super()
    
    // Command tracking
    this.pendingCommands = new Map()
    this.commandId = 0
    
    // Engine state
    this.engineInfo = {
      name: '',
      author: '',
      options: new Map()
    }
    
    // Analysis state
    this.currentAnalysis = {
      depth: 0,
      seldepth: 0,
      time: 0,
      nodes: 0,
      pv: [],
      score: null,
      multipv: []
    }
    
    // Response buffer for multi-line responses
    this.responseBuffer = ''
  }

  /**
   * Send a command to the engine
   * @param {string} command - UCI command to send
   * @returns {Promise} Resolves when command is acknowledged
   */
  async send(command) {
    return new Promise((resolve, reject) => {
      const id = ++this.commandId
      let responseKey = null
      
      // Special handling for commands with known responses
      if (command === 'uci') {
        responseKey = 'uciok'
      } else if (command === 'isready') {
        responseKey = 'readyok'
      } else if (command.startsWith('go')) {
        responseKey = 'bestmove'
      } else {
        // Commands without specific responses resolve immediately
        setImmediate(() => resolve())
        this.emit('send', command)
        return
      }
      
      // Check if already pending
      if (this.pendingCommands.has(responseKey)) {
        console.log(`DEBUG: Command ${responseKey} already pending, clearing old timeout`)
        const oldPending = this.pendingCommands.get(responseKey)
        if (oldPending.timeout) {
          clearTimeout(oldPending.timeout)
        }
      }
      
      // Set up timeout
      const timeout = setTimeout(() => {
        console.log(`DEBUG: Timeout fired for ${responseKey}, checking if still pending...`)
        if (this.pendingCommands.has(responseKey)) {
          console.log(`DEBUG: ${responseKey} still pending, rejecting with timeout`)
          this.pendingCommands.delete(responseKey)
          reject(new Error(`Timeout waiting for ${responseKey}`))
        } else {
          console.log(`DEBUG: ${responseKey} no longer pending, timeout ignored`)
        }
      }, 10000) // 10 second timeout
      
      console.log(`DEBUG: Setting up pending command for ${responseKey} with timeout ID:`, timeout)
      
      // Store pending command with timeout
      this.pendingCommands.set(responseKey, { 
        resolve, 
        reject, 
        command, 
        id, 
        timeout 
      })
      
      this.emit('send', command)
    })
  }

  /**
   * Process response data from the engine
   * @param {string} data - Raw response data
   */
  processResponse(data) {
    // Add to buffer and process complete lines
    this.responseBuffer += data
    const lines = this.responseBuffer.split('\n')
    
    // Keep incomplete line in buffer
    this.responseBuffer = lines.pop() || ''
    
    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed) {
        try {
          this.parseLine(trimmed)
        } catch (error) {
          console.error('Error parsing UCI line:', trimmed, error)
        }
      }
    }
  }

  /**
   * Parse a single UCI response line
   * @param {string} line - UCI response line
   */
  parseLine(line) {
    // Engine identification
    if (line.startsWith('id name ')) {
      this.engineInfo.name = line.substring(8)
      this.emit('id', { name: this.engineInfo.name })
    } else if (line.startsWith('id author ')) {
      this.engineInfo.author = line.substring(10)
      this.emit('id', { author: this.engineInfo.author })
    }
    
    // UCI initialization complete
    else if (line === 'uciok') {
      console.log('DEBUG: Received uciok, resolving command...')
      this.resolveCommand('uciok')
      this.emit('uciok')
    }
    
    // Engine ready
    else if (line === 'readyok') {
      this.resolveCommand('readyok')
      this.emit('ready')
    }
    
    // Option definition
    else if (line.startsWith('option name ')) {
      this.parseOption(line)
    }
    
    // Best move found
    else if (line.startsWith('bestmove ')) {
      const parts = line.split(' ')
      const bestMove = parts[1]
      const ponderMove = parts[3] // May be undefined
      
      this.resolveCommand('bestmove', { bestMove, ponderMove })
      this.emit('bestmove', bestMove, ponderMove)
    }
    
    // Analysis info
    else if (line.startsWith('info ')) {
      this.parseInfo(line)
    }
    
    // Generic response
    else {
      this.emit('line', line)
    }
  }

  /**
   * Parse engine option definition
   * @param {string} line - Option definition line
   */
  parseOption(line) {
    const match = line.match(/option name (.+?) type (\w+)(?: default (.+?))?(?:(?: min (.+?))? max (.+?))?/)
    if (match) {
      const [, name, type, defaultValue, min, max] = match
      const option = { name, type, default: defaultValue }
      
      if (min !== undefined) option.min = min
      if (max !== undefined) option.max = max
      
      this.engineInfo.options.set(name, option)
      this.emit('option', option)
    }
  }

  /**
   * Parse analysis info line
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
        case 'multipv':
          info.multipv = parseInt(parts[++i])
          break
        case 'score':
          i++
          if (parts[i] === 'cp') {
            info.score = { unit: 'cp', value: parseInt(parts[++i]) }
          } else if (parts[i] === 'mate') {
            info.score = { unit: 'mate', value: parseInt(parts[++i]) }
          }
          break
        case 'currmove':
          info.currmove = parts[++i]
          break
        case 'currmovenumber':
          info.currmovenumber = parseInt(parts[++i])
          break
        case 'hashfull':
          info.hashfull = parseInt(parts[++i])
          break
        case 'nps':
          info.nps = parseInt(parts[++i])
          break
        case 'tbhits':
          info.tbhits = parseInt(parts[++i])
          break
        case 'cpuload':
          info.cpuload = parseInt(parts[++i])
          break
        case 'pv':
          info.pv = parts.slice(i + 1)
          i = parts.length // Skip rest
          break
      }
    }
    
    // Update current analysis state
    Object.assign(this.currentAnalysis, info)
    
    // Handle multi-PV lines
    if (info.multipv) {
      this.currentAnalysis.multipv[info.multipv - 1] = info
    }
    
    this.emit('info', info)
  }

  /**
   * Resolve a pending command
   * @param {string} responseType - Type of response
   * @param {*} data - Response data
   */
  resolveCommand(responseType, data) {
    console.log(`DEBUG: Resolving command ${responseType}, pending commands:`, Array.from(this.pendingCommands.keys()))
    const pending = this.pendingCommands.get(responseType)
    if (pending) {
      console.log(`DEBUG: Found pending command for ${responseType}, resolving...`)
      // Clear timeout if it exists
      if (pending.timeout) {
        console.log(`DEBUG: Clearing timeout for ${responseType}, timeout ID:`, pending.timeout)
        clearTimeout(pending.timeout)
        console.log(`DEBUG: Cleared timeout for ${responseType}`)
      }
      
      this.pendingCommands.delete(responseType)
      
      try {
        pending.resolve(data)
        console.log(`DEBUG: Successfully resolved ${responseType}`)
      } catch (error) {
        console.error(`DEBUG: Error resolving ${responseType}:`, error)
      }
    } else {
      console.log(`DEBUG: No pending command found for ${responseType}`)
    }
  }

  /**
   * Wait for a specific response
   * @param {string} responseType - Response to wait for
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Promise} Resolves when response received
   */
  waitFor(responseType, timeout = 30000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingCommands.delete(responseType)
        reject(new Error(`Timeout waiting for ${responseType}`))
      }, timeout)
      
      this.pendingCommands.set(responseType, {
        resolve: (data) => {
          clearTimeout(timer)
          resolve(data)
        },
        reject
      })
    })
  }

  /**
   * Clear all pending commands
   */
  clearPending() {
    for (const [, pending] of this.pendingCommands) {
      pending.reject(new Error('UCI protocol reset'))
    }
    this.pendingCommands.clear()
  }

  /**
   * Reset the protocol state
   */
  reset() {
    this.clearPending()
    this.engineInfo = {
      name: '',
      author: '',
      options: new Map()
    }
    this.currentAnalysis = {
      depth: 0,
      seldepth: 0,
      time: 0,
      nodes: 0,
      pv: [],
      score: null,
      multipv: []
    }
    this.responseBuffer = ''
  }
}