import ic_chess from 'ic:canisters/ic_chess';
import * as React from "react";
import { render } from 'react-dom';

import Chessboard from "chessboardjsx";
import { Engine } from "./engine";

const boardsContainer = {
  display: "flex",
  justifyContent: "space-around",
  alignItems: "center"
};
const boardStyle = {
  borderRadius: "5px",
  boxShadow: `0 5px 15px rgba(0, 0, 0, 0.5)`
};


function ChessIc(props) {
  return (
    <div style={boardsContainer}>
      <Engine>
          {({ position, onDrop }) => (
          <Chessboard
            id="stockfish"
            position={100}
            width={320}
            onDrop={onDrop}
            boardStyle={boardStyle}
            orientation="black"
          />
        )}
      </Engine>
    </div>
  );
}

render(<ChessIc />, document.getElementById('app'));
