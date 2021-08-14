import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ChessService {
  private worker = false;
  constructor() {
    if (typeof Worker !== 'undefined') {
      this.worker = true;
      const stockfishWorker = new Worker('assets/stockfish.js')
      this.stockfish = STOCKFISH();
    }
  }
}
