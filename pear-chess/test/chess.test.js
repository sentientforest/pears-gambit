/**
 * Pear's Gambit - Chess Logic Tests
 * 
 * Basic tests for chess game functionality
 */

import { test } from 'brittle'
import { ChessGame, chessBoard, moveHandler } from '../src/chess/index.js'

test('Chess game initialization', (t) => {
  const game = new ChessGame()
  
  t.is(game.getTurn(), 'white', 'White starts first')
  t.is(game.getFen(), 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 'Starting FEN correct')
  t.is(game.isGameOver(), false, 'Game is not over at start')
  t.is(game.moveHistory.length, 0, 'No moves in history')
})

test('Basic move validation', (t) => {
  const game = new ChessGame({
    players: { white: 'Test White', black: 'Test Black' }
  })
  
  game.start()
  
  // Valid opening move
  const result1 = game.makeMove('e4')
  t.is(result1.success, true, 'e4 is a valid opening move')
  t.is(result1.move.from, 'e2', 'Move from correct square')
  t.is(result1.move.to, 'e4', 'Move to correct square')
  t.is(result1.move.piece, 'p', 'Piece type is pawn')
  
  // Invalid move - wrong turn
  const result2 = game.makeMove('e3')
  t.is(result2.success, false, 'Cannot move white piece on black turn')
  t.ok(result2.error, 'Error message provided')
  
  // Valid black response
  const result3 = game.makeMove('e5')
  t.is(result3.success, true, 'e5 is a valid response')
  t.is(game.getTurn(), 'white', 'Turn switches back to white')
})

test('Chess board utilities', (t) => {
  // Square validation
  t.is(chessBoard.isValidSquare('e4'), true, 'e4 is valid square')
  t.is(chessBoard.isValidSquare('z9'), false, 'z9 is invalid square')
  
  // Coordinate conversion
  const indices = chessBoard.squareToIndices('e4')
  t.is(indices.file, 4, 'e file is index 4')
  t.is(indices.rank, 3, '4th rank is index 3')
  
  const square = chessBoard.indicesToSquare(4, 3)
  t.is(square, 'e4', 'Indices convert back to e4')
  
  // Square colors
  t.is(chessBoard.getSquareColor('a1'), 'dark', 'a1 is dark square')
  t.is(chessBoard.getSquareColor('h1'), 'light', 'h1 is light square')
})

test('Move history and undo', (t) => {
  const game = new ChessGame({
    players: { white: 'Test White', black: 'Test Black' }
  })
  
  game.start()
  
  // Make some moves
  game.makeMove('e4')
  game.makeMove('e5')
  game.makeMove('Nf3')
  
  t.is(game.moveHistory.length, 3, 'Three moves in history')
  t.is(game.getTurn(), 'black', 'Black to move after 3 moves')
  
  // Undo last move
  const undoResult = game.undoMove()
  t.is(undoResult.success, true, 'Undo successful')
  t.is(game.moveHistory.length, 2, 'Move history reduced')
  t.is(game.getTurn(), 'white', 'Turn reverted to white')
})

test('Game end detection', (t) => {
  // Create game with Scholar's Mate position
  const game = new ChessGame({
    players: { white: 'Test White', black: 'Test Black' }
  })
  
  game.start()
  
  // Scholar's Mate sequence
  game.makeMove('e4')
  game.makeMove('e5')
  game.makeMove('Bc4')
  game.makeMove('Nc6')
  game.makeMove('Qh5')
  game.makeMove('Nf6')
  const result = game.makeMove('Qxf7#')
  
  t.is(result.success, true, 'Checkmate move successful')
  t.is(result.move.checkmate, true, 'Move flagged as checkmate')
  t.is(game.isGameOver(), true, 'Game is over')
  
  const gameResult = game.getGameResult()
  t.is(gameResult.result, 'checkmate', 'Result is checkmate')
  t.is(gameResult.winner, 'white', 'White wins')
})

test('PGN export', (t) => {
  const game = new ChessGame({
    players: { white: 'Test White', black: 'Test Black' }
  })
  
  game.start()
  
  // Make a few moves
  game.makeMove('e4')
  game.makeMove('e5')
  game.makeMove('Nf3')
  game.makeMove('Nc6')
  
  const pgn = game.toPgn()
  t.ok(pgn.includes('1. e4 e5'), 'PGN contains moves')
  t.ok(pgn.includes('2. Nf3 Nc6'), 'PGN formatted correctly')
})

test('FEN loading', (t) => {
  // Test loading from custom position
  const customFen = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2'
  const game = new ChessGame({ fen: customFen })
  
  const actualFen = game.getFen()
  t.ok(actualFen.includes('rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq'), 'FEN position loaded correctly')
  t.is(game.getTurn(), 'white', 'Turn parsed correctly')
  
  // Should have legal moves available
  const legalMoves = game.getLegalMoves()
  t.ok(legalMoves.length > 0, 'Has legal moves from position')
})

test('Move encoding/decoding', (t) => {
  const move = {
    timestamp: Date.now(),
    player: 'white',
    from: 'e2',
    to: 'e4',
    piece: 'p',
    captured: null,
    promotion: null,
    check: false,
    checkmate: false,
    fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
    san: 'e4'
  }
  
  // This test would need the actual encoding implementation
  // For now, just verify the move object structure
  t.ok(move.timestamp, 'Move has timestamp')
  t.is(move.player, 'white', 'Move has player')
  t.is(move.from, 'e2', 'Move has from square')
  t.is(move.to, 'e4', 'Move has to square')
  t.is(move.san, 'e4', 'Move has SAN notation')
})