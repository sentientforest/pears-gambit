# sentientmachinelabs

work in progress

## AI Assisted Chess UI

Goal - build an Human + AI Assist chess board for Human/AI vs Human/AI teams.
Also, just serve as a test ground / hobby project for trying out new tech.

Currently, have three UIs started / trialed:

1) /chess-ui - react ui, a bit overly done with a third party sound / ui library.
2) /ic_chess - an attempt to build this on the Dfinity Internet Computer.
However, at time of implementation at least (Fall 2020), they seemed to have no way to
support loading web workers from scripts. Learned the hard way that stockfish
would not really be compatible with their platform.
3) /ng-chess-ui - angular ui, work in progress.

## To-be-implemented / Planned

* Get initial 2-board UI displayed
  - To start, left board is human v AI, right board tracks moves
  - Then setup right board to offer stockfish suggestions
  - At this point, could be deployed as single player static site
  - Either here, or after implementating the API below, rework the stockfish implementation to use the wasm version.
* model data in sqlite and/or postgres for storing player/game/move data.
* and/or look at implementing a peer-to-peer data model using hypercores.
* Implement node-graphql API to track games, players, etc.
* Tie UI into API, add interface elements for signup, login, game selection, etc.
