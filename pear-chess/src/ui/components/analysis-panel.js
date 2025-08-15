/**
 * Pear's Gambit - Analysis Panel Component
 * 
 * UI component for displaying chess position analysis
 */

import { AI } from '../../ai/index.js'

/**
 * Analysis Panel Component
 * Displays chess engine analysis results
 */
export class AnalysisPanelComponent {
  constructor(container, options = {}) {
    this.container = typeof container === 'string' 
      ? document.getElementById(container) 
      : container
    
    if (!this.container) {
      throw new Error('Analysis panel container not found')
    }
    
    this.options = {
      showDepthSelector: options.showDepthSelector !== false,
      showMultiPV: options.showMultiPV !== false,
      enableContinuousAnalysis: options.enableContinuousAnalysis !== false,
      maxLines: options.maxLines || 3,
      autoAnalyze: options.autoAnalyze !== false,
      ...options
    }
    
    // State
    this.currentAnalysis = null
    this.currentPosition = null
    this.isAnalyzing = false
    this.analysisDepth = 20
    this.enabledFeatures = {
      hints: true,
      evaluation: true,
      principalVariation: true,
      alternatives: false
    }
    
    // Initialize UI
    this.render()
    this.bindEvents()
    
    // Initialize AI if auto-analyze enabled
    if (this.options.autoAnalyze) {
      this.initializeAI()
    }
  }

  /**
   * Initialize AI module
   */
  async initializeAI() {
    try {
      await AI.initialize({
        debug: false,
        autoStart: true,
        multiPV: this.options.maxLines
      })
      
      this.updateStatus('AI Ready')
    } catch (error) {
      console.error('Failed to initialize AI:', error)
      this.updateStatus('AI Unavailable')
      this.showError('Chess analysis unavailable. Please check Stockfish installation.')
    }
  }

  /**
   * Render the analysis panel UI
   */
  render() {
    this.container.innerHTML = `
      <div class="analysis-panel">
        <div class="analysis-header">
          <h3>Analysis</h3>
          <div class="analysis-controls">
            <button id="toggle-analysis" class="btn-toggle" disabled>
              <span class="toggle-text">Start Analysis</span>
            </button>
            <select id="analysis-depth" ${this.options.showDepthSelector ? '' : 'style="display:none"'}>
              <option value="10">Depth 10</option>
              <option value="15">Depth 15</option>
              <option value="20" selected>Depth 20</option>
              <option value="25">Depth 25</option>
            </select>
          </div>
        </div>
        
        <div class="analysis-content">
          <!-- Evaluation Display -->
          <div class="evaluation-section">
            <div class="evaluation-bar-container">
              <div class="evaluation-bar">
                <div class="eval-fill" id="eval-fill"></div>
                <div class="eval-center-line"></div>
              </div>
              <div class="eval-score" id="eval-score">0.00</div>
            </div>
            <div class="eval-description" id="eval-description">Position is equal</div>
          </div>
          
          <!-- Principal Variation -->
          <div class="pv-section" id="pv-section">
            <h4>Best Line:</h4>
            <div class="pv-line" id="pv-line">
              <span class="no-analysis">Start analysis to see best moves</span>
            </div>
          </div>
          
          <!-- Alternative Lines -->
          <div class="alternatives-section" id="alternatives-section" style="display:none">
            <h4>Alternatives:</h4>
            <div id="alternative-lines"></div>
          </div>
          
          <!-- Engine Info -->
          <div class="engine-info" id="engine-info">
            <div class="info-item">
              <span class="label">Depth:</span>
              <span class="value" id="info-depth">-</span>
            </div>
            <div class="info-item">
              <span class="label">Nodes:</span>
              <span class="value" id="info-nodes">-</span>
            </div>
            <div class="info-item">
              <span class="label">Time:</span>
              <span class="value" id="info-time">-</span>
            </div>
          </div>
          
          <!-- Status -->
          <div class="analysis-status" id="analysis-status">Ready</div>
          
          <!-- Error Display -->
          <div class="analysis-error" id="analysis-error" style="display:none"></div>
        </div>
      </div>
    `
    
    this.addCSS()
  }

  /**
   * Add CSS styles for the analysis panel
   */
  addCSS() {
    if (document.getElementById('analysis-panel-styles')) return
    
    const style = document.createElement('style')
    style.id = 'analysis-panel-styles'
    style.textContent = `
      .analysis-panel {
        background: #2a2a2a;
        border: 1px solid #444;
        border-radius: 8px;
        padding: 16px;
        color: #e0e0e0;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        max-width: 350px;
      }
      
      .analysis-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
        border-bottom: 1px solid #444;
        padding-bottom: 8px;
      }
      
      .analysis-header h3 {
        margin: 0;
        color: #fff;
        font-size: 18px;
      }
      
      .analysis-controls {
        display: flex;
        gap: 8px;
        align-items: center;
      }
      
      .btn-toggle {
        background: #4a90e2;
        color: white;
        border: none;
        padding: 6px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        transition: background 0.2s;
      }
      
      .btn-toggle:hover {
        background: #357abd;
      }
      
      .btn-toggle:disabled {
        background: #555;
        cursor: not-allowed;
      }
      
      .btn-toggle.analyzing {
        background: #e74c3c;
      }
      
      #analysis-depth {
        background: #333;
        color: #e0e0e0;
        border: 1px solid #555;
        border-radius: 4px;
        padding: 4px 8px;
        font-size: 12px;
      }
      
      .evaluation-section {
        margin-bottom: 16px;
      }
      
      .evaluation-bar-container {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 8px;
      }
      
      .evaluation-bar {
        flex: 1;
        height: 24px;
        background: #333;
        border-radius: 12px;
        position: relative;
        overflow: hidden;
      }
      
      .eval-fill {
        height: 100%;
        background: #4a90e2;
        transition: width 0.3s ease, background 0.3s ease;
        border-radius: 12px;
      }
      
      .eval-center-line {
        position: absolute;
        left: 50%;
        top: 0;
        bottom: 0;
        width: 2px;
        background: #666;
        transform: translateX(-50%);
      }
      
      .eval-score {
        font-weight: bold;
        font-size: 16px;
        min-width: 60px;
        text-align: center;
        color: #fff;
      }
      
      .eval-description {
        font-size: 14px;
        color: #bbb;
        text-align: center;
      }
      
      .pv-section, .alternatives-section {
        margin-bottom: 16px;
      }
      
      .pv-section h4, .alternatives-section h4 {
        margin: 0 0 8px 0;
        font-size: 14px;
        color: #ccc;
      }
      
      .pv-line, .alt-line {
        background: #333;
        padding: 8px;
        border-radius: 4px;
        font-family: 'Courier New', monospace;
        font-size: 13px;
        word-break: break-all;
        margin-bottom: 4px;
      }
      
      .no-analysis {
        color: #888;
        font-style: italic;
      }
      
      .move-notation {
        margin-right: 6px;
        color: #4a90e2;
      }
      
      .engine-info {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        gap: 8px;
        margin-bottom: 12px;
        padding: 8px;
        background: #333;
        border-radius: 4px;
      }
      
      .info-item {
        text-align: center;
      }
      
      .info-item .label {
        display: block;
        font-size: 11px;
        color: #999;
        margin-bottom: 2px;
      }
      
      .info-item .value {
        display: block;
        font-size: 13px;
        font-weight: bold;
        color: #fff;
      }
      
      .analysis-status {
        font-size: 12px;
        color: #888;
        text-align: center;
        padding: 4px;
      }
      
      .analysis-error {
        background: #e74c3c;
        color: white;
        padding: 8px;
        border-radius: 4px;
        font-size: 12px;
        margin-top: 8px;
      }
      
      .mate-score {
        color: #e74c3c !important;
      }
      
      .winning-eval {
        background: #27ae60 !important;
      }
      
      .losing-eval {
        background: #e74c3c !important;
      }
    `
    
    document.head.appendChild(style)
  }

  /**
   * Bind event handlers
   */
  bindEvents() {
    // Toggle analysis button
    const toggleBtn = this.container.querySelector('#toggle-analysis')
    toggleBtn.addEventListener('click', () => {
      if (this.isAnalyzing) {
        this.stopAnalysis()
      } else {
        this.startAnalysis()
      }
    })
    
    // Depth selector
    const depthSelector = this.container.querySelector('#analysis-depth')
    depthSelector.addEventListener('change', (e) => {
      this.analysisDepth = parseInt(e.target.value)
      if (this.isAnalyzing) {
        this.restartAnalysis()
      }
    })
  }

  /**
   * Set position for analysis
   * @param {string} fen - Position in FEN format
   */
  async setPosition(fen) {
    this.currentPosition = fen
    
    if (this.options.autoAnalyze && AI.getStatus().initialized) {
      await this.analyzePosition(fen)
    }
  }

  /**
   * Analyze the current position
   * @param {string} fen - Position to analyze (optional, uses current position)
   */
  async analyzePosition(fen = this.currentPosition) {
    if (!fen) {
      this.showError('No position to analyze')
      return
    }
    
    try {
      this.updateStatus('Analyzing...')
      this.currentAnalysis = await AI.analyzePosition(fen, {
        depth: this.analysisDepth
      })
      
      this.displayAnalysis(this.currentAnalysis)
      this.updateStatus('Analysis complete')
      
    } catch (error) {
      console.error('Analysis failed:', error)
      this.showError('Analysis failed: ' + error.message)
      this.updateStatus('Analysis failed')
    }
  }

  /**
   * Display analysis results
   * @param {Object} analysis - Analysis results
   */
  displayAnalysis(analysis) {
    if (!analysis) return
    
    // Update evaluation
    this.updateEvaluation(analysis.evaluation)
    
    // Update principal variation
    this.updatePrincipalVariation(analysis.bestLine || [])
    
    // Update alternatives
    if (analysis.alternatives && analysis.alternatives.length > 0) {
      this.updateAlternatives(analysis.alternatives)
    }
    
    // Update engine info
    this.updateEngineInfo({
      depth: analysis.depth || 0,
      nodes: analysis.nodes || 0,
      time: analysis.time || 0
    })
  }

  /**
   * Update evaluation display
   * @param {Object} evaluation - Evaluation object
   */
  updateEvaluation(evaluation) {
    const scoreEl = this.container.querySelector('#eval-score')
    const fillEl = this.container.querySelector('#eval-fill')
    const descEl = this.container.querySelector('#eval-description')
    
    if (!evaluation) {
      scoreEl.textContent = '0.00'
      fillEl.style.width = '50%'
      descEl.textContent = 'Position is equal'
      return
    }
    
    // Update score display
    if (evaluation.isMate) {
      scoreEl.textContent = evaluation.display
      scoreEl.classList.add('mate-score')
    } else {
      scoreEl.textContent = evaluation.display
      scoreEl.classList.remove('mate-score')
    }
    
    // Update evaluation bar
    const evalNum = evaluation.numeric
    let percentage = 50 // Default center
    
    if (evaluation.isMate) {
      percentage = evaluation.mateIn > 0 ? 95 : 5
    } else {
      // Convert evaluation to percentage (clamped between 5% and 95%)
      percentage = Math.max(5, Math.min(95, 50 + (evalNum * 10)))
    }
    
    fillEl.style.width = `${percentage}%`
    
    // Color based on evaluation
    if (evalNum > 2 || (evaluation.isMate && evaluation.mateIn > 0)) {
      fillEl.classList.add('winning-eval')
      fillEl.classList.remove('losing-eval')
    } else if (evalNum < -2 || (evaluation.isMate && evaluation.mateIn < 0)) {
      fillEl.classList.add('losing-eval')
      fillEl.classList.remove('winning-eval')
    } else {
      fillEl.classList.remove('winning-eval', 'losing-eval')
    }
    
    // Update description
    if (evaluation.isMate) {
      const side = evaluation.mateIn > 0 ? 'White' : 'Black'
      const moves = Math.abs(evaluation.mateIn)
      descEl.textContent = `${side} has mate in ${moves}`
    } else {
      descEl.textContent = this.getEvaluationDescription(evalNum)
    }
  }

  /**
   * Get human-readable evaluation description
   * @param {number} eval_num - Numerical evaluation
   * @returns {string} Description
   */
  getEvaluationDescription(eval_num) {
    const abs_eval = Math.abs(eval_num)
    const side = eval_num > 0 ? 'White' : 'Black'
    
    if (abs_eval < 0.3) {
      return 'Position is equal'
    } else if (abs_eval < 1.0) {
      return `${side} has a slight advantage`
    } else if (abs_eval < 2.0) {
      return `${side} has a clear advantage`
    } else if (abs_eval < 4.0) {
      return `${side} has a significant advantage`
    } else {
      return `${side} is winning`
    }
  }

  /**
   * Update principal variation display
   * @param {Array} moves - Array of moves in the best line
   */
  updatePrincipalVariation(moves) {
    const pvEl = this.container.querySelector('#pv-line')
    
    if (!moves || moves.length === 0) {
      pvEl.innerHTML = '<span class="no-analysis">No analysis available</span>'
      return
    }
    
    // Format moves with numbers
    const formattedMoves = []
    for (let i = 0; i < Math.min(moves.length, 10); i++) { // Show first 10 moves
      if (i % 2 === 0) {
        formattedMoves.push(`${Math.floor(i / 2) + 1}.`)
      }
      formattedMoves.push(moves[i])
    }
    
    pvEl.innerHTML = formattedMoves
      .map(move => `<span class="move-notation">${move}</span>`)
      .join('')
  }

  /**
   * Update alternative lines
   * @param {Array} alternatives - Alternative moves
   */
  updateAlternatives(alternatives) {
    const altSection = this.container.querySelector('#alternatives-section')
    const altLines = this.container.querySelector('#alternative-lines')
    
    if (!alternatives || alternatives.length === 0) {
      altSection.style.display = 'none'
      return
    }
    
    altSection.style.display = 'block'
    
    const maxAlts = Math.min(alternatives.length, this.options.maxLines - 1)
    altLines.innerHTML = alternatives
      .slice(0, maxAlts)
      .map(alt => {
        const evalDisplay = alt.evaluation?.display || '?'
        const firstMove = alt.line?.[0] || alt.move
        return `
          <div class="alt-line">
            <span class="move-notation">${firstMove}</span>
            <span style="color: #888;">(${evalDisplay})</span>
          </div>
        `
      })
      .join('')
  }

  /**
   * Update engine information
   * @param {Object} info - Engine info (depth, nodes, time)
   */
  updateEngineInfo(info) {
    const depthEl = this.container.querySelector('#info-depth')
    const nodesEl = this.container.querySelector('#info-nodes')
    const timeEl = this.container.querySelector('#info-time')
    
    depthEl.textContent = info.depth || '-'
    nodesEl.textContent = this.formatNumber(info.nodes) || '-'
    timeEl.textContent = this.formatTime(info.time) || '-'
  }

  /**
   * Format large numbers for display
   * @param {number} num - Number to format
   * @returns {string} Formatted number
   */
  formatNumber(num) {
    if (!num) return '-'
    
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M'
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K'
    }
    
    return num.toString()
  }

  /**
   * Format time for display
   * @param {number} ms - Time in milliseconds
   * @returns {string} Formatted time
   */
  formatTime(ms) {
    if (!ms) return '-'
    
    if (ms >= 1000) {
      return (ms / 1000).toFixed(1) + 's'
    }
    
    return ms + 'ms'
  }

  /**
   * Start continuous analysis
   */
  async startAnalysis() {
    if (!this.currentPosition) {
      this.showError('No position set for analysis')
      return
    }
    
    try {
      this.isAnalyzing = true
      this.updateToggleButton()
      await this.analyzePosition()
    } catch (error) {
      this.isAnalyzing = false
      this.updateToggleButton()
      this.showError('Failed to start analysis')
    }
  }

  /**
   * Stop continuous analysis
   */
  async stopAnalysis() {
    try {
      await AI.stopContinuousAnalysis()
      this.isAnalyzing = false
      this.updateToggleButton()
      this.updateStatus('Analysis stopped')
    } catch (error) {
      console.error('Failed to stop analysis:', error)
    }
  }

  /**
   * Restart analysis with new settings
   */
  async restartAnalysis() {
    if (this.isAnalyzing) {
      await this.stopAnalysis()
      await this.startAnalysis()
    }
  }

  /**
   * Update toggle button state
   */
  updateToggleButton() {
    const toggleBtn = this.container.querySelector('#toggle-analysis')
    const toggleText = toggleBtn.querySelector('.toggle-text')
    
    if (this.isAnalyzing) {
      toggleBtn.classList.add('analyzing')
      toggleText.textContent = 'Stop Analysis'
    } else {
      toggleBtn.classList.remove('analyzing')
      toggleText.textContent = 'Start Analysis'
    }
    
    // Enable button once AI is ready
    if (AI.getStatus().initialized) {
      toggleBtn.disabled = false
    }
  }

  /**
   * Update status message
   * @param {string} message - Status message
   */
  updateStatus(message) {
    const statusEl = this.container.querySelector('#analysis-status')
    statusEl.textContent = message
  }

  /**
   * Show error message
   * @param {string} message - Error message
   */
  showError(message) {
    const errorEl = this.container.querySelector('#analysis-error')
    errorEl.textContent = message
    errorEl.style.display = 'block'
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      errorEl.style.display = 'none'
    }, 5000)
  }

  /**
   * Clear analysis display
   */
  clearAnalysis() {
    this.currentAnalysis = null
    this.updateEvaluation(null)
    this.updatePrincipalVariation([])
    
    const altSection = this.container.querySelector('#alternatives-section')
    altSection.style.display = 'none'
    
    this.updateEngineInfo({})
    this.updateStatus('Ready')
  }

  /**
   * Enable/disable features
   * @param {Object} features - Features to enable/disable
   */
  setFeatures(features) {
    Object.assign(this.enabledFeatures, features)
    
    // Update UI based on enabled features
    const pvSection = this.container.querySelector('#pv-section')
    pvSection.style.display = this.enabledFeatures.principalVariation ? 'block' : 'none'
    
    const altSection = this.container.querySelector('#alternatives-section')
    if (!this.enabledFeatures.alternatives) {
      altSection.style.display = 'none'
    }
  }

  /**
   * Get current analysis
   * @returns {Object} Current analysis results
   */
  getCurrentAnalysis() {
    return this.currentAnalysis
  }

  /**
   * Destroy the component
   */
  destroy() {
    if (this.isAnalyzing) {
      this.stopAnalysis()
    }
    
    this.container.innerHTML = ''
  }
}