/**
 * Pear's Gambit - Chess Clock Component
 * 
 * Implements chess time controls and clock display
 */

/**
 * Chess Clock Component
 * Manages time controls for both players
 */
export class ChessClockComponent {
  constructor(containerId, options = {}) {
    this.containerId = containerId
    this.container = document.getElementById(containerId)
    if (!this.container) {
      throw new Error(`Container element with id "${containerId}" not found`)
    }

    this.options = {
      initialTime: options.initialTime || 300000, // 5 minutes in milliseconds
      increment: options.increment || 0, // increment per move in milliseconds
      enabled: options.enabled !== false,
      ...options
    }

    // State
    this.whiteTime = this.options.initialTime
    this.blackTime = this.options.initialTime
    this.currentTurn = 'white'
    this.isRunning = false
    this.isPaused = false
    this.gameStarted = false
    
    // Timer tracking
    this.lastTickTime = null
    this.timerInterval = null
    
    // Event handlers
    this.onTimeUpdate = options.onTimeUpdate || (() => {})
    this.onTimeExpired = options.onTimeExpired || (() => {})
    this.onClockClick = options.onClockClick || (() => {})

    this.init()
  }

  /**
   * Initialize the chess clock
   */
  init() {
    this.createClock()
    this.updateDisplay()
    
    if (!this.options.enabled) {
      this.container.style.display = 'none'
    }
  }

  /**
   * Create the clock HTML structure
   */
  createClock() {
    this.container.innerHTML = ''
    this.container.className = 'chess-clock'

    // White player clock
    const whiteClockDiv = document.createElement('div')
    whiteClockDiv.className = 'player-clock white-clock'
    whiteClockDiv.id = 'white-clock'
    whiteClockDiv.addEventListener('click', () => this.onClockClick('white'))

    const whiteLabel = document.createElement('div')
    whiteLabel.className = 'player-label'
    whiteLabel.textContent = 'White'

    const whiteTime = document.createElement('div')
    whiteTime.className = 'time-display'
    whiteTime.id = 'white-time'

    whiteClockDiv.appendChild(whiteLabel)
    whiteClockDiv.appendChild(whiteTime)

    // Black player clock
    const blackClockDiv = document.createElement('div')
    blackClockDiv.className = 'player-clock black-clock'
    blackClockDiv.id = 'black-clock'
    blackClockDiv.addEventListener('click', () => this.onClockClick('black'))

    const blackLabel = document.createElement('div')
    blackLabel.className = 'player-label'
    blackLabel.textContent = 'Black'

    const blackTime = document.createElement('div')
    blackTime.className = 'time-display'
    blackTime.id = 'black-time'

    blackClockDiv.appendChild(blackLabel)
    blackClockDiv.appendChild(blackTime)

    // Clock controls
    const controls = document.createElement('div')
    controls.className = 'clock-controls'

    const pauseBtn = document.createElement('button')
    pauseBtn.id = 'pause-clock'
    pauseBtn.className = 'clock-button'
    pauseBtn.textContent = '⏸️'
    pauseBtn.title = 'Pause/Resume Clock'
    pauseBtn.addEventListener('click', () => this.togglePause())

    const resetBtn = document.createElement('button')
    resetBtn.id = 'reset-clock'
    resetBtn.className = 'clock-button'
    resetBtn.textContent = '🔄'
    resetBtn.title = 'Reset Clock'
    resetBtn.addEventListener('click', () => this.reset())

    controls.appendChild(pauseBtn)
    controls.appendChild(resetBtn)

    this.container.appendChild(whiteClockDiv)
    this.container.appendChild(controls)
    this.container.appendChild(blackClockDiv)

    this.addStyles()
  }

  /**
   * Start the clock for the current player
   */
  start() {
    if (!this.options.enabled) return

    this.gameStarted = true
    this.isRunning = true
    this.isPaused = false
    this.lastTickTime = Date.now()
    
    this.startTicking()
    this.updateDisplay()
    console.log(`[ChessClock] Clock started for ${this.currentTurn}`)
  }

  /**
   * Stop the clock
   */
  stop() {
    this.isRunning = false
    this.stopTicking()
    this.updateDisplay()
    console.log('[ChessClock] Clock stopped')
  }

  /**
   * Pause/resume the clock
   */
  togglePause() {
    if (!this.gameStarted) return

    this.isPaused = !this.isPaused
    
    if (this.isPaused) {
      this.stopTicking()
    } else {
      this.lastTickTime = Date.now()
      this.startTicking()
    }
    
    this.updateDisplay()
    console.log(`[ChessClock] Clock ${this.isPaused ? 'paused' : 'resumed'}`)
  }

  /**
   * Switch turn to the other player
   */
  switchTurn() {
    if (!this.options.enabled || !this.gameStarted) return

    // Add increment to the player who just moved
    if (this.options.increment > 0) {
      if (this.currentTurn === 'white') {
        this.whiteTime += this.options.increment
      } else {
        this.blackTime += this.options.increment
      }
    }

    // Switch to the other player
    this.currentTurn = this.currentTurn === 'white' ? 'black' : 'white'
    
    // Reset timer tracking
    this.lastTickTime = Date.now()
    
    this.updateDisplay()
    console.log(`[ChessClock] Turn switched to ${this.currentTurn}`)
  }

  /**
   * Reset the clock to initial state
   */
  reset() {
    this.stop()
    this.whiteTime = this.options.initialTime
    this.blackTime = this.options.initialTime
    this.currentTurn = 'white'
    this.gameStarted = false
    this.isPaused = false
    this.updateDisplay()
    console.log('[ChessClock] Clock reset')
  }

  /**
   * Set time control configuration
   */
  setTimeControl(config) {
    this.options.initialTime = config.initialTime || this.options.initialTime
    this.options.increment = config.increment || this.options.increment
    this.options.enabled = config.enabled !== false
    
    if (!this.gameStarted) {
      this.reset()
    }
    
    if (!this.options.enabled) {
      this.container.style.display = 'none'
    } else {
      this.container.style.display = 'block'
    }
    
    console.log('[ChessClock] Time control updated:', config)
  }

  /**
   * Start the timer ticking
   */
  startTicking() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval)
    }
    
    this.timerInterval = setInterval(() => {
      this.tick()
    }, 100) // Update every 100ms for smooth display
  }

  /**
   * Stop the timer ticking
   */
  stopTicking() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval)
      this.timerInterval = null
    }
  }

  /**
   * Clock tick - update time for current player
   */
  tick() {
    if (!this.isRunning || this.isPaused) return

    const now = Date.now()
    const elapsed = now - this.lastTickTime
    this.lastTickTime = now

    // Subtract elapsed time from current player
    if (this.currentTurn === 'white') {
      this.whiteTime = Math.max(0, this.whiteTime - elapsed)
      if (this.whiteTime === 0) {
        this.handleTimeExpired('white')
        return
      }
    } else {
      this.blackTime = Math.max(0, this.blackTime - elapsed)
      if (this.blackTime === 0) {
        this.handleTimeExpired('black')
        return
      }
    }

    this.updateDisplay()
    this.onTimeUpdate({
      whiteTime: this.whiteTime,
      blackTime: this.blackTime,
      currentTurn: this.currentTurn
    })
  }

  /**
   * Handle time expiration
   */
  handleTimeExpired(player) {
    this.stop()
    console.log(`[ChessClock] Time expired for ${player}`)
    
    // Update display to show 0:00
    this.updateDisplay()
    
    // Notify game of time expiration
    this.onTimeExpired(player)
  }

  /**
   * Update the visual display
   */
  updateDisplay() {
    const whiteDisplay = document.getElementById('white-time')
    const blackDisplay = document.getElementById('black-time')
    const whiteClock = document.getElementById('white-clock')
    const blackClock = document.getElementById('black-clock')

    if (whiteDisplay) {
      whiteDisplay.textContent = this.formatTime(this.whiteTime)
    }
    
    if (blackDisplay) {
      blackDisplay.textContent = this.formatTime(this.blackTime)
    }

    // Update active clock styling
    if (whiteClock && blackClock) {
      whiteClock.classList.toggle('active', this.currentTurn === 'white' && this.isRunning && !this.isPaused)
      blackClock.classList.toggle('active', this.currentTurn === 'black' && this.isRunning && !this.isPaused)
      
      // Add low time warning
      whiteClock.classList.toggle('low-time', this.whiteTime < 60000) // Less than 1 minute
      blackClock.classList.toggle('low-time', this.blackTime < 60000)
      
      // Add critical time warning
      whiteClock.classList.toggle('critical-time', this.whiteTime < 10000) // Less than 10 seconds
      blackClock.classList.toggle('critical-time', this.blackTime < 10000)
    }

    // Update pause button
    const pauseBtn = document.getElementById('pause-clock')
    if (pauseBtn) {
      pauseBtn.textContent = this.isPaused ? '▶️' : '⏸️'
      pauseBtn.disabled = !this.gameStarted
    }
  }

  /**
   * Format time in MM:SS format
   */
  formatTime(milliseconds) {
    const totalSeconds = Math.ceil(milliseconds / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    
    // Show hours if time is > 1 hour
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60)
      const remainingMinutes = minutes % 60
      return `${hours}:${remainingMinutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    }
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  /**
   * Get current time state
   */
  getTimeState() {
    return {
      whiteTime: this.whiteTime,
      blackTime: this.blackTime,
      currentTurn: this.currentTurn,
      isRunning: this.isRunning,
      isPaused: this.isPaused,
      gameStarted: this.gameStarted
    }
  }

  /**
   * Set time state (for game restoration)
   */
  setTimeState(state) {
    this.whiteTime = state.whiteTime || this.options.initialTime
    this.blackTime = state.blackTime || this.options.initialTime
    this.currentTurn = state.currentTurn || 'white'
    this.isRunning = state.isRunning || false
    this.isPaused = state.isPaused || false
    this.gameStarted = state.gameStarted || false
    
    this.updateDisplay()
  }

  /**
   * Add component styles
   */
  addStyles() {
    const style = document.createElement('style')
    style.textContent = `
      .chess-clock {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 15px;
        background: #f8f9fa;
        border-radius: 8px;
        border: 2px solid #dee2e6;
        font-family: 'Courier New', monospace;
      }
      
      .player-clock {
        flex: 1;
        padding: 15px;
        background: #ffffff;
        border: 2px solid #dee2e6;
        border-radius: 8px;
        text-align: center;
        cursor: pointer;
        transition: all 0.3s;
        user-select: none;
      }
      
      .player-clock:hover {
        border-color: #007bff;
      }
      
      .player-clock.active {
        border-color: #28a745;
        background: #d4edda;
        box-shadow: 0 0 10px rgba(40, 167, 69, 0.3);
      }
      
      .player-clock.low-time {
        border-color: #ffc107;
        background: #fff3cd;
      }
      
      .player-clock.critical-time {
        border-color: #dc3545;
        background: #f8d7da;
        animation: pulse-red 1s infinite;
      }
      
      .player-label {
        font-size: 14px;
        font-weight: bold;
        color: #666;
        margin-bottom: 8px;
      }
      
      .time-display {
        font-size: 24px;
        font-weight: bold;
        color: #333;
        font-family: 'Courier New', monospace;
      }
      
      .clock-controls {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      
      .clock-button {
        padding: 8px;
        border: none;
        border-radius: 4px;
        background: #6c757d;
        color: white;
        cursor: pointer;
        font-size: 16px;
        transition: background-color 0.2s;
      }
      
      .clock-button:hover:not(:disabled) {
        background: #545b62;
      }
      
      .clock-button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      
      @keyframes pulse-red {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.7; }
      }
      
      @media (max-width: 768px) {
        .chess-clock {
          flex-direction: column;
          padding: 10px;
        }
        
        .clock-controls {
          flex-direction: row;
          justify-content: center;
        }
        
        .time-display {
          font-size: 20px;
        }
      }
    `
    document.head.appendChild(style)
  }

  /**
   * Destroy the component
   */
  destroy() {
    this.stop()
    this.container.innerHTML = ''
  }
}