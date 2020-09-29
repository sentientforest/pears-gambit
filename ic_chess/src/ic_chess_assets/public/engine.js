// adapted from:
// https://github.com/willb335/chessboardjsx/blob/a536200e0d7e3379fcedaceb2bfe5be47921966d/src/integrations/Stockfish.js
// Retrieved 2020-08-30
// licensed under MIT:
// https://github.com/willb335/chessboardjsx/blob/a536200e0d7e3379fcedaceb2bfe5be47921966d/LICENSE
// with bug fixes and modifications
import * as React from 'react'; // eslint-disable-line no-unused-vars
import { Component } from 'react';
import PropTypes from 'prop-types';
// const { Chess } = require('chess.js');
import { Chess } from 'chess.js';
// notes on chess.js issues with typescript, and webpack:
// https://github.com/jhlywa/chess.js/issues/208
// https://github.com/jhlywa/chess.js/issues/196
// determined that some of the solutions indicated, such as patching webpack.config.js,
// don't work beyond chess.js version 0.10.x.
import * as STOCKFISH from 'stockfish/src/stockfish.asm.js';
import raw from 'raw.macro';

// workaround to package a web worker script within our bundle
//   while keeping it isolated and accessible
// const sfwasm = raw('./stockfish.wasm')
// const sfscript = raw("./stockfish.js")

// const STOCKFISH = window.STOCKFISH;

console.log('engine loading.')
console.log(STOCKFISH);
const game = new Chess();


export class Engine extends Component {
  static propTypes = { children: PropTypes.func };

  state = { fen: 'start' };

  constructor(props) {
    super(props)
  }

  componentDidMount() {
    this.setState({ fen: game.fen() });

    this.engineGame().prepareMove();
  }

  onDrop = (drop) => {
    // see if the move is legal
    const { sourceSquare, targetSquare } = drop
    const move = game.move({
      from: sourceSquare,
      to: targetSquare,
      promotion: 'q'
    });

    // illegal move
    if (move === null) return;

    return new Promise(resolve => {
      this.setState({ fen: game.fen() });
      resolve();
    }).then(() => this.engineGame().prepareMove());
  };

  engineGame = options => {
    options = options || {};
    let engine = {};
    let evaler = {};
    /*
    if (URL && Blob && Worker && URL.createObjectURL) {
      const sfscriptBlob = new Blob([sfscript]);
      engine = new Worker(URL.createObjectURL(sfscriptBlob));
      evaler = new Worker(URL.createObjectURL(sfscriptBlob));
    }*/
    engine = STOCKFISH();
    evaler = STOCKFISH();

    console.log('engine instatiated:');
    console.log(engine);
    console.log(evaler);
    console.log(engine === evaler);
    /*
    if (!engine) {
      engine = {};
    }
    let evaler =
      typeof STOCKFISH === 'function'
        ? STOCKFISH()
        : new Worker(options.stockfishjs || '/stockfish.js');
    */
    let engineStatus = {};
    let time = { wtime: 3000, btime: 3000, winc: 1500, binc: 1500 };
    let playerColor = 'black';
    let clockTimeoutID = null;
    // let isEngineRunning = false;
    let announced_game_over;
    // do not pick up pieces if the game is over
    // only pick up pieces for White

    setInterval(function() {
      if (announced_game_over) {
        return;
      }

      if (game.game_over()) {
        announced_game_over = true;
      }
    }, 500);

    function uciCmd(cmd, which) {
      // console.log('UCI: ' + cmd);
      if (!which && !engine) {
        console.log('no engine');
        return;
      }
      (which || engine).postMessage(cmd);
    }
    uciCmd('uci');

    function clockTick() {
      let t =
        (time.clockColor === 'white' ? time.wtime : time.btime) +
        time.startTime -
        Date.now();
      let timeToNextSecond = t % 1000 + 1;
      clockTimeoutID = setTimeout(clockTick, timeToNextSecond);
    }

    function stopClock() {
      if (clockTimeoutID !== null) {
        clearTimeout(clockTimeoutID);
        clockTimeoutID = null;
      }
      if (time.startTime > 0) {
        let elapsed = Date.now() - time.startTime;
        time.startTime = null;
        if (time.clockColor === 'white') {
          time.wtime = Math.max(0, time.wtime - elapsed);
        } else {
          time.btime = Math.max(0, time.btime - elapsed);
        }
      }
    }

    function startClock() {
      if (game.turn() === 'w') {
        time.wtime += time.winc;
        time.clockColor = 'white';
      } else {
        time.btime += time.binc;
        time.clockColor = 'black';
      }
      time.startTime = Date.now();
      clockTick();
    }

    function get_moves() {
      let moves = '';
      let history = game.history({ verbose: true });

      for (let i = 0; i < history.length; ++i) {
        let move = history[i];
        moves +=
          ' ' + move.from + move.to + (move.promotion ? move.promotion : '');
      }

      return moves;
    }

    const prepareMove = () => {
      stopClock();
      this.setState({ fen: game.fen() });
      let turn = game.turn() === 'w' ? 'white' : 'black';
      if (!game.game_over()) {
        // if (turn === playerColor) {
        if (turn !== playerColor) {
          // playerColor = playerColor === 'white' ? 'black' : 'white';
          uciCmd('position startpos moves' + get_moves());
          uciCmd('position startpos moves' + get_moves(), evaler);
          uciCmd('eval', evaler);

          if (time && time.wtime) {
            uciCmd(
              'go ' +
                (time.depth ? 'depth ' + time.depth : '') +
                ' wtime ' +
                time.wtime +
                ' winc ' +
                time.winc +
                ' btime ' +
                time.btime +
                ' binc ' +
                time.binc
            );
          } else {
            uciCmd('go ' + (time.depth ? 'depth ' + time.depth : ''));
          }
          // isEngineRunning = true;
        }
        if (game.history().length >= 2 && !time.depth && !time.nodes) {
          startClock();
        }
      }
    };

    evaler.onmessage = function(event) {
      let line;

      if (event && typeof event === 'object') {
        line = event.data;
      } else {
        line = event;
      }

      // console.log('evaler: ' + line);
      if (!line || typeof line.substr === 'undefined') {
        console.log('Unexpected format for line.');
        console.log(line);
        console.log(typeof line);
      }
      /// Ignore some output.
      if (
        line === 'uciok' ||
        line === 'readyok' ||
        line.substr(0, 11) === 'option name'
      ) {
        return;
      }
    };

    engine.onmessage = event => {
      let line;
      if (event && typeof event === 'object') {
        line = event.data;
      } else {
        line = event;
      }

      // console.log('Reply: ' + line);
      if (line === 'uciok') {
        engineStatus.engineLoaded = true;
      } else if (line === 'readyok') {
        engineStatus.engineReady = true;
      } else if (!line || typeof line.match === 'undefined') {
        console.log('failed to get line, or line is unexpected type.');
        console.log(typeof line, ' - ', line)
      } else {
        let match = line.match(/^bestmove ([a-h][1-8])([a-h][1-8])([qrbn])?/);
        /// Did the AI move?
        if (match) {
          // isEngineRunning = false;
          game.move({ from: match[1], to: match[2], promotion: match[3] });
          this.setState({ fen: game.fen() });
          prepareMove();
          uciCmd('eval', evaler);
          //uciCmd("eval");
          /// Is it sending feedback?
        } else if (
          (match = line.match(/^info .*\bdepth (\d+) .*\bnps (\d+)/))
        ) {
          engineStatus.search = 'Depth: ' + match[1] + ' Nps: ' + match[2];
        }

        /// Is it sending feed back with a score?
        if ((match = line.match(/^info .*\bscore (\w+) (-?\d+)/))) {
          let score = parseInt(match[2], 10) * (game.turn() === 'w' ? 1 : -1);
          /// Is it measuring in centipawns?
          if (match[1] === 'cp') {
            engineStatus.score = (score / 100.0).toFixed(2);
            /// Did it find a mate?
          } else if (match[1] === 'mate') {
            engineStatus.score = 'Mate in ' + Math.abs(score);
          }

          /// Is the score bounded?
          if ((match = line.match(/\b(upper|lower)bound\b/))) {
            engineStatus.score =
              ((match[1] === 'upper') === (game.turn() === 'w')
                ? '<= '
                : '>= ') + engineStatus.score;
          }
        }
      }
      // displayStatus();
    };

    return {
      start: function() {
        uciCmd('ucinewgame');
        uciCmd('isready');
        engineStatus.engineReady = false;
        engineStatus.search = null;
        prepareMove();
        announced_game_over = false;
      },
      prepareMove: function() {
        prepareMove();
      }
    };
  };

  render() {
    const { fen } = this.state;
    return this.props.children({ position: fen, onDrop: this.onDrop });
  }
}
