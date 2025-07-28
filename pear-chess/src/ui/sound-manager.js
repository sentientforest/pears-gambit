/**
 * Pear's Gambit - Sound Manager
 * 
 * Manages audio playback for chess moves and game events
 */

/**
 * Sound Manager for chess game audio
 */
export class SoundManager {
  constructor(options = {}) {
    this.options = {
      enabled: options.enabled !== false,
      volume: options.volume || 0.5,
      ...options
    }

    // Audio context for Web Audio API
    this.audioContext = null
    this.sounds = new Map()
    
    // Sound definitions with frequencies for synthesis
    this.soundDefs = {
      move: { frequency: 440, duration: 0.1, type: 'sine' },
      capture: { frequency: 330, duration: 0.15, type: 'sawtooth' },
      check: { frequency: 660, duration: 0.2, type: 'square' },
      castle: { frequency: 550, duration: 0.2, type: 'triangle' },
      gameStart: { frequency: 523.25, duration: 0.3, type: 'sine' }, // C5
      gameEnd: { frequency: 261.63, duration: 0.5, type: 'sine' }, // C4
      invalid: { frequency: 220, duration: 0.1, type: 'square' },
      tick: { frequency: 800, duration: 0.05, type: 'sine' },
      timeout: { frequency: 440, duration: 0.8, type: 'sawtooth' }
    }

    this.init()
  }

  /**
   * Initialize the sound manager
   */
  init() {
    if (!this.options.enabled) return

    try {
      // Create audio context on first user interaction
      const initAudio = () => {
        if (!this.audioContext) {
          this.audioContext = new (window.AudioContext || window.webkitAudioContext)()
          this.log('Audio context initialized')
        }
      }

      // Initialize on first click/touch
      ['click', 'touchstart'].forEach(event => {
        document.addEventListener(event, initAudio, { once: true })
      })

    } catch (error) {
      this.log('Failed to initialize audio:', error)
      this.options.enabled = false
    }
  }

  /**
   * Play a synthesized sound
   */
  play(soundName, options = {}) {
    if (!this.options.enabled || !this.audioContext) return

    const soundDef = this.soundDefs[soundName]
    if (!soundDef) {
      this.log(`Unknown sound: ${soundName}`)
      return
    }

    try {
      // Create oscillator
      const oscillator = this.audioContext.createOscillator()
      const gainNode = this.audioContext.createGain()

      // Configure oscillator
      oscillator.type = soundDef.type
      oscillator.frequency.setValueAtTime(
        soundDef.frequency * (options.pitch || 1),
        this.audioContext.currentTime
      )

      // Configure gain (volume)
      const volume = (options.volume || this.options.volume) * 0.3 // Keep it subtle
      gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        this.audioContext.currentTime + soundDef.duration
      )

      // Connect nodes
      oscillator.connect(gainNode)
      gainNode.connect(this.audioContext.destination)

      // Play sound
      oscillator.start(this.audioContext.currentTime)
      oscillator.stop(this.audioContext.currentTime + soundDef.duration)

      // Special effects for certain sounds
      if (soundName === 'check') {
        // Add a second tone for check
        setTimeout(() => {
          this.play('check', { pitch: 1.5, volume: volume * 0.5 })
        }, 100)
      } else if (soundName === 'gameEnd') {
        // Play descending tones for game end
        setTimeout(() => this.play('gameEnd', { pitch: 0.75 }), 200)
        setTimeout(() => this.play('gameEnd', { pitch: 0.5 }), 400)
      }

    } catch (error) {
      this.log('Failed to play sound:', error)
    }
  }

  /**
   * Play move sound based on move type
   */
  playMove(move) {
    if (!this.options.enabled) return

    if (move.captured) {
      this.play('capture')
    } else if (move.san && (move.san.includes('O-O') || move.san.includes('0-0'))) {
      this.play('castle')
    } else {
      this.play('move')
    }

    // Add check sound if applicable
    if (move.check && !move.checkmate) {
      setTimeout(() => this.play('check'), 100)
    }
  }

  /**
   * Play clock tick sound for low time
   */
  playClockTick() {
    if (!this.options.enabled) return
    this.play('tick', { volume: 0.2 }) // Quieter tick
  }

  /**
   * Set enabled state
   */
  setEnabled(enabled) {
    this.options.enabled = enabled
    if (enabled && !this.audioContext) {
      this.init()
    }
  }

  /**
   * Set volume
   */
  setVolume(volume) {
    this.options.volume = Math.max(0, Math.min(1, volume))
  }

  /**
   * Get current settings
   */
  getSettings() {
    return {
      enabled: this.options.enabled,
      volume: this.options.volume
    }
  }

  /**
   * Log debug messages
   */
  log(...args) {
    if (this.options.debug) {
      console.log('[SoundManager]', ...args)
    }
  }
}

// Export singleton instance
export const soundManager = new SoundManager()