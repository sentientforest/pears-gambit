# Pear's Gambit

A peer-to-peer chess application with AI assistance, built on the Pear runtime.

## Overview

Pear's Gambit is a fully decentralized chess platform that enables players to engage in chess matches directly with each other without centralized servers. The application integrates Stockfish as an embedded AI assistant to provide move suggestions, game analysis, and educational insights while maintaining the core peer-to-peer architecture.

## Architecture

Pear's Gambit is built using the following technologies:

- **Pear Runtime**: Bare JavaScript runtime optimized for P2P applications
- **Hyperswarm**: Peer discovery and encrypted connections
- **Autobase**: Multi-writer coordination for game state
- **Stockfish**: Native chess engine binding for analysis
- **Modern Web Standards**: Progressive enhancement for cross-platform compatibility

## Legacy Chess UIs

This repository contains several previous chess UI implementations that informed the current P2P design:

1. **chess-ui/** - React-based UI with Arwes sound/visual library
2. **ic_chess/** - Dfinity Internet Computer implementation (discontinued due to Web Worker limitations)
3. **ng-chess-ui/** - Angular-based UI prototype
4. **pear-chess/** - Current Pear runtime implementation

## Project Structure

- `ctx/` - Design documents and project plans
- `ext/` - External dependencies (Hypercore, Autobase, etc.)
- `pear-chess/` - Main Pear application
- Legacy UIs preserved for reference

## Development

The current focus is on the Pear-based implementation located in `/pear-chess/`. See the design documents in `/ctx/` for detailed architecture and implementation plans.

## Documentation

- [Design Document](ctx/20250720_pear-chess_design.md)
- [Project Plan](ctx/20250721_pear-chess_project_plan.md)
