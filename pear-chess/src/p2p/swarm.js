/**
 * Pear's Gambit - Hyperswarm Management
 * 
 * Handles peer discovery and connection management using Hyperswarm
 */

import Hyperswarm from 'hyperswarm'
import b4a from 'b4a'
import hypercoreCrypto from 'hypercore-crypto'

/**
 * Swarm Manager for P2P connections
 */
export class SwarmManager {
  constructor(options = {}) {
    this.options = {
      debug: options.debug || false,
      maxConnections: options.maxConnections || 10,
      ...options
    }

    // State
    this.swarm = null
    this.connections = new Map()
    this.joinedTopics = new Set()
    this.isDestroyed = false

    // Event handlers
    this.onConnection = options.onConnection || (() => {})
    this.onDisconnection = options.onDisconnection || (() => {})
    this.onError = options.onError || (() => {})
    this.onPeerData = options.onPeerData || (() => {})

    this.init()
  }

  /**
   * Initialize the swarm
   */
  init() {
    if (this.swarm) return

    this.swarm = new Hyperswarm({
      maxConnections: this.options.maxConnections
    })

    this.bindEvents()
    this.log('Swarm initialized')
  }

  /**
   * Bind swarm event handlers
   */
  bindEvents() {
    this.swarm.on('connection', (socket, info) => {
      this.handleConnection(socket, info)
    })

    this.swarm.on('error', (error) => {
      this.log('Swarm error:', error)
      this.onError(error)
    })

    // Handle process cleanup
    if (typeof process !== 'undefined') {
      process.on('SIGINT', () => this.destroy())
      process.on('SIGTERM', () => this.destroy())
    }
  }

  /**
   * Handle new peer connection
   */
  handleConnection(socket, info) {
    const peerId = this.generatePeerId(info)
    
    this.log(`New connection from peer: ${peerId}`)
    this.log(`Connection info:`, {
      publicKey: info.publicKey?.toString('hex'),
      topics: Array.from(info.topics || []).map(t => t.toString('hex')),
      client: info.client,
      server: info.server
    })

    // Store connection
    this.connections.set(peerId, {
      socket,
      info,
      peerId,
      connected: true,
      connectedAt: Date.now()
    })

    // Set up socket handlers
    this.setupSocketHandlers(socket, peerId)

    // Notify application
    this.onConnection(socket, info, peerId)
  }

  /**
   * Set up handlers for individual socket
   */
  setupSocketHandlers(socket, peerId) {
    socket.on('data', (data) => {
      try {
        const message = JSON.parse(data.toString())
        this.log(`Data from ${peerId}:`, message)
        this.onPeerData(message, peerId, socket)
      } catch (error) {
        this.log(`Invalid JSON from ${peerId}:`, data.toString())
      }
    })

    socket.on('error', (error) => {
      this.log(`Socket error from ${peerId}:`, error)
      this.handleDisconnection(peerId, error)
    })

    socket.on('close', () => {
      this.log(`Socket closed from ${peerId}`)
      this.handleDisconnection(peerId)
    })

    socket.on('end', () => {
      this.log(`Socket ended from ${peerId}`)
      this.handleDisconnection(peerId)
    })
  }

  /**
   * Handle peer disconnection
   */
  handleDisconnection(peerId, error = null) {
    const connection = this.connections.get(peerId)
    if (!connection) return

    connection.connected = false
    connection.disconnectedAt = Date.now()

    this.log(`Peer disconnected: ${peerId}`)
    
    // Notify application
    this.onDisconnection(peerId, connection, error)

    // Remove from active connections after delay (for potential reconnection)
    setTimeout(() => {
      this.connections.delete(peerId)
    }, 30000) // 30 second cleanup delay
  }

  /**
   * Generate consistent peer ID from connection info
   */
  generatePeerId(info) {
    if (info.publicKey) {
      return info.publicKey.toString('hex').substring(0, 16)
    }
    return 'peer-' + Math.random().toString(36).substring(2, 10)
  }

  /**
   * Join a topic for peer discovery
   */
  async joinTopic(topic, options = {}) {
    if (this.isDestroyed) {
      throw new Error('Swarm is destroyed')
    }

    // Convert topic to buffer if needed
    const topicBuffer = typeof topic === 'string' ? b4a.from(topic, 'hex') : topic
    
    this.log(`Joining topic: ${topicBuffer.toString('hex')}`)

    // Join the topic
    const discovery = this.swarm.join(topicBuffer, {
      client: options.client !== false,
      server: options.server !== false
    })

    this.joinedTopics.add(topicBuffer.toString('hex'))

    // Wait for topic to be announced
    await discovery.flushed()
    
    this.log(`Successfully joined topic: ${topicBuffer.toString('hex')}`)
    return topicBuffer
  }

  /**
   * Leave a topic
   */
  async leaveTopic(topic) {
    const topicBuffer = typeof topic === 'string' ? b4a.from(topic, 'hex') : topic
    const topicHex = topicBuffer.toString('hex')
    
    if (!this.joinedTopics.has(topicHex)) {
      this.log(`Not joined to topic: ${topicHex}`)
      return
    }

    this.log(`Leaving topic: ${topicHex}`)
    await this.swarm.leave(topicBuffer)
    this.joinedTopics.delete(topicHex)
  }


  /**
   * Send message to specific peer
   */
  sendToPeer(peerId, message) {
    const connection = this.connections.get(peerId)
    if (!connection || !connection.connected) {
      this.log(`Cannot send to disconnected peer: ${peerId}`)
      return false
    }

    try {
      const data = JSON.stringify(message)
      connection.socket.write(data)
      this.log(`Sent to ${peerId}:`, message)
      return true
    } catch (error) {
      this.log(`Failed to send to ${peerId}:`, error)
      return false
    }
  }

  /**
   * Broadcast message to all connected peers
   */
  broadcast(message) {
    let sentCount = 0
    
    for (const [peerId, connection] of this.connections) {
      if (connection.connected && this.sendToPeer(peerId, message)) {
        sentCount++
      }
    }

    this.log(`Broadcasted to ${sentCount} peers:`, message)
    return sentCount
  }

  /**
   * Get connection statistics
   */
  getStats() {
    const activeConnections = Array.from(this.connections.values())
      .filter(conn => conn.connected)

    return {
      totalConnections: this.connections.size,
      activeConnections: activeConnections.length,
      joinedTopics: this.joinedTopics.size,
      peers: activeConnections.map(conn => ({
        peerId: conn.peerId,
        connectedAt: conn.connectedAt,
        duration: Date.now() - conn.connectedAt
      }))
    }
  }

  /**
   * Get list of connected peer IDs
   */
  getConnectedPeers() {
    return Array.from(this.connections.entries())
      .filter(([_, connection]) => connection.connected)
      .map(([peerId, _]) => peerId)
  }

  /**
   * Check if connected to any peers
   */
  hasConnections() {
    return this.getConnectedPeers().length > 0
  }

  /**
   * Wait for connections
   */
  async waitForConnections(minConnections = 1, timeout = 30000) {
    return new Promise((resolve, reject) => {
      if (this.getConnectedPeers().length >= minConnections) {
        resolve(this.getConnectedPeers())
        return
      }

      const timeoutId = setTimeout(() => {
        reject(new Error(`Timeout waiting for ${minConnections} connections`))
      }, timeout)

      const checkConnections = () => {
        if (this.getConnectedPeers().length >= minConnections) {
          clearTimeout(timeoutId)
          resolve(this.getConnectedPeers())
        }
      }

      // Store original handler
      const originalOnConnection = this.onConnection

      // Override connection handler temporarily
      this.onConnection = (socket, info, peerId) => {
        originalOnConnection(socket, info, peerId)
        checkConnections()
      }

      // Restore original handler after timeout
      setTimeout(() => {
        this.onConnection = originalOnConnection
      }, timeout + 100)
    })
  }

  /**
   * Log debug messages
   */
  log(...args) {
    if (this.options.debug) {
      console.log('[SwarmManager]', ...args)
    }
  }

  /**
   * Destroy the swarm and cleanup
   */
  async destroy() {
    if (this.isDestroyed) return

    this.log('Destroying swarm...')
    this.isDestroyed = true

    // Close all connections
    for (const [peerId, connection] of this.connections) {
      if (connection.connected) {
        try {
          connection.socket.end()
        } catch (error) {
          this.log(`Error closing connection to ${peerId}:`, error)
        }
      }
    }

    // Leave all topics
    for (const topicHex of this.joinedTopics) {
      try {
        await this.leaveTopic(topicHex)
      } catch (error) {
        this.log(`Error leaving topic ${topicHex}:`, error)
      }
    }

    // Destroy swarm
    if (this.swarm) {
      try {
        await this.swarm.destroy()
      } catch (error) {
        this.log('Error destroying swarm:', error)
      }
    }

    // Clear state
    this.connections.clear()
    this.joinedTopics.clear()

    this.log('Swarm destroyed')
  }
}

// Export singleton factory
export function createSwarmManager(options = {}) {
  return new SwarmManager(options)
}