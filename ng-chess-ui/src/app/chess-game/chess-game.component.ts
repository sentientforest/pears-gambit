import { Component, OnInit } from '@angular/core';

import {NgxChessBoardService} from 'ngx-chess-board';

@Component({
  selector: 'app-chess-game',
  templateUrl: './chess-game.component.html',
  styleUrls: ['./chess-game.component.scss']
})
export class ChessGameComponent implements OnInit {

  constructor(private ngxChessBoardService: NgxChessBoardService) { }

  ngOnInit(): void {
  }

}
