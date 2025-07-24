/**
 * P2P Integration Tests
 * Tests the integration between chess engine and P2P networking
 */

import test from 'brittle'
import { createGame } from '../src/chess/index.js'
import { createP2PGameSession } from '../src/p2p/index.js'

test('P2P module exports', async (t) => {
  const { createP2PGameSession, P2PUtils } = await import('../src/p2p/index.js')
  
  t.ok(typeof createP2PGameSession === 'function', 'P2P session factory available')
  t.ok(P2PUtils, 'P2P utils available')
  t.ok(typeof P2PUtils.isValidInviteCode === 'function', 'Invite code validator available')
})

test('Game discovery functionality', async (t) => {
  const { createGameDiscovery } = await import('../src/p2p/discovery.js')
  
  const discovery = createGameDiscovery({
    debug: false
  })
  
  // Test invitation creation
  const result = discovery.createGameInvitation({
    playerName: 'Test Player',
    timeControl: null
  })
  
  t.ok(result.success, 'Invitation creation successful')
  t.ok(result.invitation, 'Invitation object created')
  t.ok(result.invitation.inviteCode, 'Invite code generated')
  t.ok(result.invitation.gameKey, 'Game key generated')
  t.is(result.invitation.hostInfo.playerName, 'Test Player', 'Player name set correctly')
  
  // Validate invite code format (XXX-XXX)
  const inviteCodePattern = /^[A-F0-9]{3}-[A-F0-9]{3}$/
  t.ok(inviteCodePattern.test(result.invitation.inviteCode), 'Invite code has correct format')
  
  discovery.cleanup()
})

test('Move encoding integration', async (t) => {
  const chessGame = createGame({
    players: { white: 'Player 1', black: 'Player 2' }
  })
  chessGame.start()
  
  // Make a move
  const moveResult = chessGame.makeMove({ from: 'e2', to: 'e4' })
  t.ok(moveResult.success, 'Move executed successfully')
  
  const move = moveResult.move
  
  // Verify move has required P2P fields
  t.ok(move.timestamp, 'Move has timestamp')
  t.ok(move.player, 'Move has player')
  t.is(move.from, 'e2', 'From square correct')
  t.is(move.to, 'e4', 'To square correct')
  t.ok(move.san, 'Move has SAN notation')
  t.ok(move.piece, 'Move has piece type')
})

test('Game discovery utilities', async (t) => {
  const { P2PUtils } = await import('../src/p2p/index.js')
  
  // Test invite code validation
  t.ok(P2PUtils.isValidInviteCode('ABC-123'), 'Valid invite code accepted')
  t.ok(P2PUtils.isValidInviteCode('F00-ABC'), 'Valid hex invite code accepted')
  t.absent(P2PUtils.isValidInviteCode('ABC123'), 'Missing dash rejected')
  t.absent(P2PUtils.isValidInviteCode('ABC-'), 'Incomplete code rejected')
  t.absent(P2PUtils.isValidInviteCode('ABCD-123'), 'Too long first part rejected')
  t.absent(P2PUtils.isValidInviteCode('ABC-1234'), 'Too long second part rejected')
  
  // Test game link generation
  const gameLink = P2PUtils.generateGameLink('ABC-123')
  t.is(gameLink, 'pears-gambit://join/ABC-123', 'Game link generated correctly')
  
  // Test game link parsing
  const parseResult = P2PUtils.parseGameLink('pears-gambit://join/ABC-123')
  t.ok(parseResult.valid, 'Valid game link parsed successfully')
  t.is(parseResult.inviteCode, 'ABC-123', 'Invite code extracted correctly')
})