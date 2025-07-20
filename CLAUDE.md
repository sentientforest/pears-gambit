# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Chess Application project designed for Human + AI team play. The project explores different UI implementations (Angular, React/Gatsby) with a Node.js/Express backend and Stockfish chess engine integration.

## Development Commands

### Angular UI (Primary UI - ng-chess-ui/)
```bash
cd ng-chess-ui
npm install
npm run cp-stockfish    # Copy Stockfish WASM files to assets
npm start              # Development server with watch mode
npm run build          # Production build
```

### Express Server (Root directory)
```bash
npm install
export NODEJS_KEY=your-jwt-secret  # Required for JWT (currently disabled)
node sentientmachinelabs-server.js  # Runs on port 9000
```

### React/Gatsby UI (chess-ui/)
```bash
cd chess-ui
npm install
npm run cp-stockfish   # Copy Stockfish to static directory
gatsby develop         # Development server
gatsby build          # Production build
```

## Architecture Overview

### Active Components
1. **ng-chess-ui/**: Angular 10 application using ngx-chess-board library
   - Main chess UI with Stockfish integration
   - Uses Angular Material for UI components
   - WebWorker implementation for Stockfish engine
   - Located at `src/app/` with standard Angular structure

2. **sentientmachinelabs-server.js**: Express server
   - Serves Angular static files from `ng-chess-ui/dist/`
   - CORS headers configured for SharedArrayBuffer (required by Stockfish)
   - JWT authentication implemented but currently disabled
   - HTTPS support for local development

### Key Technical Details
- **Stockfish Integration**: Uses Stockfish 12 WASM version via WebWorkers
- **Chess Board**: ngx-chess-board library for Angular UI
- **CORS Requirements**: Server must include specific headers for SharedArrayBuffer support
- **Authentication**: JWT implementation exists but is commented out

### Important Files
- `ng-chess-ui/src/app/app.component.ts`: Main chess game logic
- `ng-chess-ui/src/app/services/stockfish.service.ts`: Stockfish engine integration
- `sentientmachinelabs-server.js`: Express server configuration
- `ng-chess-ui/angular.json`: Angular build configuration

### Development Notes
- The ic_chess directory contains an abandoned Internet Computer implementation
- The chess-ui directory contains an alternative React/Gatsby implementation
- Focus development on the Angular UI (ng-chess-ui) as it's the active implementation
- Stockfish requires SharedArrayBuffer support, hence the specific CORS headers in the server