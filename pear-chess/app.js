/** @typedef {import('pear-interface')} */ /* global Pear */

import { GameView } from './src/ui/game-view.js'
import { GameLobby } from './src/ui/lobby.js'

/**
 * Pear's Gambit - Main Application
 * 
 * P2P Chess with AI assistance
 */

class PearsGambitApp {
  constructor() {
    this.gameView = null
    this.gameLobby = null
    this.currentMode = 'lobby' // lobby, game
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

      // Initialize the game lobby
      this.gameLobby = new GameLobby('game-container', {
        debug: true,
        onGameStart: this.handleGameStart.bind(this),
        onError: this.handleLobbyError.bind(this)
      })
      
      this.currentMode = 'lobby'

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
        
        if (this.gameLobby) {
          await this.gameLobby.destroy()
        }
        
        console.log('Clean shutdown completed')
      })
    }

    // Handle page unload
    window.addEventListener('beforeunload', async () => {
      if (this.gameView) {
        this.gameView.destroy()
      }
      
      if (this.gameLobby) {
        await this.gameLobby.destroy()
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

  /**
   * Handle game start from lobby
   */
  async handleGameStart(gameData) {
    console.log('Starting game:', gameData)
    
    try {
      // Hide lobby
      if (this.gameLobby) {
        document.getElementById('game-container').innerHTML = ''
      }
      
      // Create game view based on mode
      const gameViewOptions = {
        showControls: true,
        showMoveHistory: true,
        showGameInfo: true,
        mode: gameData.mode
      }
      
      // Add P2P-specific options
      if (gameData.mode === 'p2p') {
        gameViewOptions.chessGame = gameData.chessGame
        gameViewOptions.p2pSession = gameData.p2pSession
        gameViewOptions.gameSession = gameData.gameSession
        gameViewOptions.timeControl = gameData.timeControl
      }
      
      this.gameView = new GameView('game-container', gameViewOptions)
      this.currentMode = 'game'
      
      // If this is a resumed game, restore the saved state
      if (gameData.resumed && gameData.savedGameState) {
        console.log('Restoring saved game state...')
        await this.gameView.restoreGame(gameData.savedGameState)
      }
      
      console.log('Game started successfully')
      
    } catch (error) {
      console.error('Failed to start game:', error)
      this.showError('Failed to start game: ' + error.message)
      this.returnToLobby()
    }
  }

  /**
   * Handle lobby errors
   */
  handleLobbyError(error) {
    console.error('Lobby error:', error)
    this.showError('Lobby error: ' + error.message)
  }

  /**
   * Return to lobby from game
   */
  async returnToLobby() {
    console.log('Returning to lobby...')
    
    try {
      // Clean up current game
      if (this.gameView) {
        this.gameView.destroy()
        this.gameView = null
      }
      
      // Clear container
      document.getElementById('game-container').innerHTML = ''
      
      // Recreate lobby
      this.gameLobby = new GameLobby('game-container', {
        debug: true,
        onGameStart: this.handleGameStart.bind(this),
        onError: this.handleLobbyError.bind(this)
      })
      
      this.currentMode = 'lobby'
      console.log('Returned to lobby successfully')
      
    } catch (error) {
      console.error('Failed to return to lobby:', error)
      this.showError('Failed to return to lobby: ' + error.message)
    }
  }
}

// Initialize the application
const app = new PearsGambitApp()
app.init()

// Make app available globally for debugging
if (typeof window !== 'undefined') {
  window.pearsGambit = app
}