/** @typedef {import('pear-interface')} */ /* global Pear */

import { GameView } from './src/ui/game-view.js'

/**
 * Pear's Gambit - Main Application
 * 
 * P2P Chess with AI assistance
 */

class PearsGambitApp {
  constructor() {
    this.gameView = null
    this.isInitialized = false
  }

  /**
   * Initialize the application
   */
  async init() {
    if (this.isInitialized) return

    console.log('Initializing Pear\'s Gambit...')

    try {
      // Wait for DOM to be ready
      if (document.readyState === 'loading') {
        await new Promise(resolve => {
          document.addEventListener('DOMContentLoaded', resolve)
        })
      }

      // Hide loading screen
      const loadingScreen = document.getElementById('loading-screen')
      if (loadingScreen) {
        loadingScreen.style.display = 'none'
      }

      // Initialize the game view
      this.gameView = new GameView('game-container', {
        showControls: true,
        showMoveHistory: true,
        showGameInfo: true
      })

      // Set up application teardown
      this.setupTeardown()

      this.isInitialized = true
      console.log('Pear\'s Gambit initialized successfully!')

    } catch (error) {
      console.error('Failed to initialize Pear\'s Gambit:', error)
      this.showError('Failed to initialize application: ' + error.message)
    }
  }

  /**
   * Set up application teardown handling
   */
  setupTeardown() {
    if (typeof Pear !== 'undefined' && Pear.teardown) {
      Pear.teardown(async () => {
        console.log('Shutting down Pear\'s Gambit...')
        
        if (this.gameView) {
          this.gameView.destroy()
        }
        
        console.log('Clean shutdown completed')
      })
    }

    // Handle page unload
    window.addEventListener('beforeunload', () => {
      if (this.gameView) {
        this.gameView.destroy()
      }
    })
  }

  /**
   * Show error message to user
   */
  showError(message) {
    const errorDiv = document.createElement('div')
    errorDiv.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background-color: #ff6b6b;
      color: white;
      padding: 10px 20px;
      border-radius: 4px;
      z-index: 10000;
      font-family: Arial, sans-serif;
    `
    errorDiv.textContent = message
    document.body.appendChild(errorDiv)

    setTimeout(() => {
      if (errorDiv.parentNode) {
        errorDiv.parentNode.removeChild(errorDiv)
      }
    }, 5000)
  }
}

// Initialize the application
const app = new PearsGambitApp()
app.init()