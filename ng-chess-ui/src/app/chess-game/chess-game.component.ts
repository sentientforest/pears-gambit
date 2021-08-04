import { Component, OnInit, ViewChild } from '@angular/core';

import { NgxChessBoardService, NgxChessBoardView } from 'ngx-chess-board';

@Component({
  selector: 'app-chess-game',
  templateUrl: './chess-game.component.html',
  styleUrls: ['./chess-game.component.scss']
})

export class ChessGameComponent implements OnInit {

  constructor(private ngxChessBoardService: NgxChessBoardService) { }
  @ViewChild('player', {static: false}) player: NgxChessBoardView;
  @ViewChild('plans', {static: true}) plans: NgxChessBoardView
  ngOnInit(): void {
    this.player.moveChange.suscribe((move) => {
      console.log(move)
    })
  }

  reset(): void {
    this.player.reset();
  }
}
