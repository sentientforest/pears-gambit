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

### 🚧 In Progress (Phase 3: AI Integration)
- [x] **Stockfish Engine Architecture** - Framework implemented but **NOT FULLY FUNCTIONAL**
  - [x] External process UCI protocol implementation (`src/ai/external-engine-simple.js`) - **REQUIRES Node.js/system Stockfish**
  - [x] Native binding architecture with CMake build system (`src/ai/native/`) - **NOT BUILT OR TESTED**
  - [x] Opening book database with ECO classification (`src/ai/opening-book.js`) - **WORKS**
  - [x] Game analysis framework (`src/ai/game-analyzer.js`) - **REQUIRES working engine**
  - [x] AI vs AI game framework (`src/ai/ai-game.js`) - **REQUIRES working engine**
  - [x] Performance benchmarking framework (`src/ai/benchmark.js`) - **REQUIRES working engine**
  - [x] **Stub system for Pear Runtime compatibility** - **CURRENTLY ACTIVE**

**⚠️ IMPORTANT**: AI features use stub implementations in Pear Runtime. Real Stockfish integration requires:
1. System Stockfish installation for external process mode, OR
2. Building native bindings (CMake system provided but not built/tested)
3. Full integration testing with real engine

### 📋 Planned (Phase 3 Completion)
- [ ] **Complete Stockfish integration** - Make AI features actually work
- [ ] **Native binding build system** - Test and verify CMake build
- [ ] **Full AI testing suite** - Test with real Stockfish engines
- [ ] **Analysis UI integration** - Connect AI analysis to game interface

### 📋 Planned (Phase 4)
- [ ] Chess clock/timer implementation
- [ ] Enhanced move notation display
- [ ] Spectator mode for observing games (basic implementation exists)
- [ ] Sound effects and audio feedback

### 📋 Planned (Phase 5)
- [ ] Game history browser and replay functionality
- [ ] Advanced analysis features (tablebase endgame support)
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

## Stockfish AI Integration (Phase 3 - IN PROGRESS)

### ⚠️ Current Status: FRAMEWORK ONLY
The Stockfish chess engine **framework** has been implemented but is **NOT FULLY FUNCTIONAL**. The current implementation uses stub responses in Pear Runtime.

#### 1. **What Works Currently** ✅
- **Opening Book**: Pure JavaScript chess opening database with ECO codes (`opening-book.js`)
- **Stub System**: Compatible API that doesn't crash the application (`engine-stub.js`)  
- **Framework Code**: Complete UCI protocol and engine management architecture
- **Pear Compatibility**: Application starts without AI-related crashes

#### 2. **What Does NOT Work** ❌
- **Real Stockfish Engine**: Requires Node.js environment + system Stockfish installation
- **Position Analysis**: Returns empty results (stubs only)
- **AI vs AI Games**: Framework exists but engines don't actually play
- **Performance Benchmarking**: Tests framework only, no real engine performance
- **Native Bindings**: CMake system provided but not built or tested

#### 3. **Technical Implementation Status**
```
src/ai/
├── external-engine-simple.js    # Framework (requires Node.js + Stockfish binary)
├── uci-simple.js               # UCI protocol (untested with real engine)
├── opening-book.js             # ✅ WORKING - Pure JavaScript
├── game-analyzer.js            # Framework only (requires working engine)
├── ai-game.js                  # Framework only (requires working engine)
├── benchmark.js                # Framework only (requires working engine)
├── engine-stub.js              # ✅ WORKING - Stub implementations
└── native/                     # Native binding framework (NOT BUILT)
    ├── CMakeLists.txt          # Build system (untested)
    ├── binding.cpp             # C++ wrapper (uncompiled)
    ├── stockfish_wrapper.cpp   # Engine wrapper (uncompiled)
    └── ...                     # Other native files (uncompiled)
```

#### 4. **What's Required for Completion**
1. **Deprecate External Process Mode**: Remove the System Stockfish installation + Node.js environment testing, reduce complexity
2. **For Native Bindings**: CMake build, compilation, and integration testing
3. **Full Integration Testing**: Verify all AI features work with real engines
4. **UI Integration**: Connect working AI analysis to the game interface

### Next Development Priority
Complete the Stockfish integration by building and testing the native binding system

