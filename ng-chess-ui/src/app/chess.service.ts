import { Injectable } from '@angular/core';
import { BehaviorSubject, of } from 'rxjs';
import { catchError, map, tap} from 'rxjs/operators';
import { NgxChessBoardMove } from './NgxChessBoardMove';
import { StockfishMessageEvent } from './StockfishMessageEvent';

@Injectable({
  providedIn: 'root'
})
export class ChessService {
  private worker = false;
  private stockfish: any = {};
  public stockfishMessages: BehaviorSubject<String> = new BehaviorSubject(null);
  public gameMoves: String[] = [];

  constructor() {
    if (typeof Worker !== 'undefined') {
      this.worker = true;
      this.stockfish = new Worker('assets/stockfish.js');
      this.stockfish.onmessage = this.processStockfishMessage.bind(this);
      this.setMultiPv();
      this.setupNewGame();
    }
    else {
      // todo: add error messaging alerting user that Web Workers are not
      // supported, and their browser will not show suggested moves
    }
  }

  move(move: NgxChessBoardMove) {
    this.gameMoves.push(move.move);
    const uciCmd = `position startpos moves ${this.gameMoves.join(' ')}`;
    console.log(`uciCmd: ${uciCmd}`)
    this.stockfish.postMessage(uciCmd);
    this.stockfish.postMessage(`go depth 2`);
  }

  processStockfishMessage(event: StockfishMessageEvent) {
    // todo: implement message handling
    this.stockfishMessages.next(event.data);
  }

  setupNewGame() {
    this.gameMoves = [];
    this.stockfish.postMessage('ucinewgame');
    this.stockfish.postMessage('position startpos');
    console.log('set up new game.');
  }

  setMultiPv() {
    // todo: make a configurable way to dynamically change this value
    let multiPv = 4;
    this.stockfish.postMessage(`setoption name multipv value ${multiPv}`);
    console.log('multipv set.');
  }

  goWithDepth() {
    // todo: make depth configurable
    let depth = 5;
    this.stockfish.postMessage(`go depth ${depth}`);
  }
}
