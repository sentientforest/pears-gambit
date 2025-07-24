import { Component, OnInit, ViewChild } from '@angular/core';
import { ChessService } from '../chess.service';

import {
  MoveChange,
  NgxChessBoardComponent,
  NgxChessBoardService,
  NgxChessBoardView
} from 'ngx-chess-board';

@Component({
  selector: 'app-chess-game',
  templateUrl: './chess-game.component.html',
  styleUrls: ['./chess-game.component.scss']
})

export class ChessGameComponent implements OnInit {

  constructor(private ngxChessBoardService: NgxChessBoardService,
  private chessSvc: ChessService) { }
  public suggestedMoves: any[] = [];
  public activeSuggestion: Boolean = false;

  @ViewChild('player', {static: false}) playerBoard: NgxChessBoardComponent;
  @ViewChild('plans', {static: true}) planningBoard: NgxChessBoardView
  ngOnInit(): void {
    let cgame = this;
    cgame.chessSvc.stockfishMessages.subscribe((message) => {
      if (!message) {
        // todo: filter out messages that are not move suggestions as well
        return;
      }
      cgame.suggestedMoves.unshift(message);
      if (cgame.suggestedMoves.length > 5) {
        cgame.suggestedMoves.pop();
      }
    })
  }

  ngAfterInit(): void {

  }

  moveCallback(move): void {
    console.log(move)
    this.activeSuggestion = false;
    this.planningBoard.setFEN(move.fen);
    this.chessSvc.move(move);
  }

  reset(): void {
    this.playerBoard.reset();
  }

  showSuggestedMove(move: any): void {
    if (this.activeSuggestion) {
      this.planningBoard.undo();
    }
    this.activeSuggestion = true;
    // this.planningBoard.move(move.move);
  }
}
