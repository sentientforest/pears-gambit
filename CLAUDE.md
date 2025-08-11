# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Pear's Gambit** is a fully functional peer-to-peer chess application built on the Pear Runtime. The project enables players to engage in chess matches directly with each other without centralized servers, featuring integrated AI assistance through Stockfish engine integration plans.

### Project History
- **Legacy implementations** (Angular, React/Gatsby with Node.js/Express backend) moved to `/legacy/` directory
- **Current active implementation** uses Pear Runtime P2P framework in `/pear-chess/`
- **Development status**: Phase 1-2 complete (core chess engine + P2P infrastructure), Phase 3+ planned (AI integration)

## Current Implementation: Pear's Gambit (/pear-chess)

### Technology Stack
- **Runtime**: Pear (Bare JavaScript P2P runtime)
- **P2P Infrastructure**: Hyperswarm (peer discovery) + Autobase (multi-writer coordination)
- **Chess Engine**: Chess.js for game logic
- **Encoding**: Compact-encoding for efficient P2P transmission
- **UI**: Vanilla JavaScript with drag-and-drop chess board
- **Storage**: Corestore for persistent game state

### Core Features (Completed)
1. **P2P Chess Gameplay**
   - Two-player games over encrypted P2P connections
   - Short invite code system (XXX-XXX format) 
   - Real-time move synchronization using Autobase
   - Automatic reconnection with exponential backoff
   - Game state persistence across connections

2. **Complete Chess Implementation**
   - Full chess rules (castling, en passant, promotion, etc.)
   - Interactive drag-and-drop board with touch support
   - Board flipping for proper player orientation
   - Move history display and PGN export
   - Game end detection (checkmate, stalemate, resignation)

3. **User Interface**
   - Professional chess board with coordinate labels
   - Dynamic controls (New Game/Resign based on context)
   - Connection status indicators
   - Game information panel
   - Lobby system for game creation/joining

4. **Testing & Quality**
   - Comprehensive test suite (39 passing assertions)
   - Multi-instance P2P testing verified
   - Cross-platform compatibility (Linux, macOS, Windows)

### Architecture Overview

```
pear-chess/
├── app.js                    # Pear application entry point
├── index.html               # Main UI entry point
├── package.json             # Dependencies and Pear configuration
├── src/
│   ├── chess/               # Chess game logic
│   │   ├── game.js          # Core game management + move encoding
│   │   ├── board.js         # Board utilities and coordinate conversion
│   │   ├── moves.js         # Move parsing and validation
│   │   ├── pgn.js           # PGN import/export
│   │   └── index.js         # Module exports
│   ├── p2p/                 # P2P networking layer
│   │   ├── core.js          # Autobase game synchronization
│   │   ├── swarm.js         # Hyperswarm connection management
│   │   ├── discovery.js     # Peer discovery and invitations
│   │   ├── sync.js          # Game state synchronization
│   │   ├── spectator.js     # Spectator mode (in development)
│   │   └── index.js         # P2P module exports
│   └── ui/                  # User interface components
│       ├── components/
│       │   ├── chess-board.js  # Interactive chess board
│       │   └── chess-clock.js  # Chess timer (planned)
│       ├── game-view.js     # Main game interface
│       ├── lobby.js         # Game creation/joining UI
│       └── sound-manager.js # Audio feedback system
├── test/                    # Test suites
│   ├── chess.test.js        # Chess logic tests
│   ├── p2p-integration.test.js # P2P functionality tests
│   └── index.test.js        # Basic framework tests
└── assets/                  # Game assets
    ├── pieces/              # Chess piece graphics
    └── sounds/              # Sound effects

Storage Structure:
├── chess-games/             # Corestore persistence
├── chess-games-state/       # Game state snapshots
└── test-p2p-storage/        # Test environment storage
```

## Development Commands

### Basic Operations
```bash
# Development server
npm run dev
# Equivalent to: pear run -d .

# Run tests
npm test
# Equivalent to: brittle test/*.test.js

# Production build (Pear handles packaging automatically)
pear stage .
```

### Multi-Instance Testing
```bash
# Terminal 1: First player instance
npm run dev

# Terminal 2: Second player instance  
npm run dev

# Each instance gets unique storage path automatically
```

### Debugging P2P Connections
- Games create invite codes in format: XXX-XXX (6-character hex codes)
- Connection status shown in game info panel
- Hyperswarm handles NAT traversal automatically
- Autobase provides conflict resolution for simultaneous moves

## Current Development Status

### ✅ Completed (Phases 1-2)
- [x] Complete chess engine with all rules implemented
- [x] Interactive drag-and-drop chess board
- [x] P2P game creation and joining via invite codes
- [x] Real-time move synchronization between players
- [x] Game state persistence and recovery
- [x] Professional UI with proper chess board orientation
- [x] Comprehensive testing suite
- [x] Multi-instance development and testing environment

### 🚧 In Progress (Phase 3)
- [ ] Stockfish AI integration for move analysis and hints
- [ ] Chess clock/timer implementation
- [ ] Enhanced move notation display
- [ ] Spectator mode for observing games
- [ ] Sound effects and audio feedback

### 📋 Planned (Phases 4-5)
- [ ] Game history browser and replay functionality
- [ ] Advanced analysis features (opening book, tablebase)
- [ ] Tournament/ladder system support
- [ ] Enhanced UI themes and customization
- [ ] Mobile companion app

## Dependencies (Current Versions)

### Production Dependencies
```json
{
  "hyperswarm": "^4.12.1",     # P2P peer discovery
  "hypercore": "^11.11.0",     # Append-only logs  
  "autobase": "^7.15.0",       # Multi-writer coordination
  "corestore": "^7.2.1",       # Hypercore management
  "compact-encoding": "^2.11.0", # Binary serialization
  "hypercore-crypto": "^3.6.1",  # Cryptographic functions
  "b4a": "^1.6.7",             # Buffer utilities
  "chess.js": "^1.0.0"         # Chess game logic
}
```

### Development Dependencies  
```json
{
  "brittle": "^3.0.0",         # Testing framework
  "pear-interface": "^1.0.0"   # Pear development tools
}
```

## Working with the Codebase

### Key Implementation Details
1. **Move Synchronization**: Uses Autobase with custom compact-encoding for ~60% reduction in network overhead
2. **P2P Architecture**: Hyperswarm handles peer discovery, Autobase coordinates game state
3. **Chess Integration**: Chess.js provides rule validation, custom encoding for P2P transmission
4. **UI Patterns**: Event-driven architecture with proper cleanup and state management
5. **Testing**: Brittle framework with multi-instance P2P testing support

### Common Development Tasks

#### Adding New Chess Features
1. Extend game logic in `src/chess/game.js`
2. Update move encoding if new data fields needed
3. Modify UI in `src/ui/components/chess-board.js`
4. Add tests in `test/chess.test.js`

#### P2P Functionality Changes
1. Core sync logic in `src/p2p/core.js`
2. Connection management in `src/p2p/swarm.js`
3. Discovery patterns in `src/p2p/discovery.js`
4. Integration tests in `test/p2p-integration.test.js`

#### UI Improvements
1. Main interface in `src/ui/game-view.js`
2. Chess board component in `src/ui/components/chess-board.js`
3. Lobby/menu system in `src/ui/lobby.js`

### Performance Considerations
- Move validation: <100ms for all operations
- P2P sync: Real-time with automatic retry logic
- Memory usage: Efficient Hypercore block management
- UI responsiveness: Drag operations <50ms response time

## Next Phase: Stockfish Integration

### Planned Implementation (Phase 3)
The next major development phase focuses on integrating Stockfish chess engine for AI analysis and assistance:

1. **Native Binding Development**
   - Following bare-ffmpeg pattern for C++ integration
   - CMake build system with cmake-bare and cmake-harden
   - UCI protocol wrapper for engine communication
   - Process-based approach initially, embedded library later

2. **Analysis Features**
   - Real-time position evaluation
   - Best move suggestions with variations
   - Multi-depth analysis capabilities
   - Opening book integration
   - Educational move explanations

3. **AI Assistant UI**
   - Analysis panel with evaluation bar
   - Principal variation display
   - Move hint system with arrows
   - Configurable analysis depth and modes

### Development Plan (Phase 3)
Based on project planning documents, Stockfish integration is the next major milestone. The foundation is ready with modular architecture supporting AI integration without major refactoring.

