import React from "react"
import { Link } from "gatsby"
import { Arwes, ThemeProvider, createTheme, SoundsProvider, createSounds,
  Row, Col, Button, Project, Words } from 'arwes'
import Chessboard from "chessboardjsx"

import Layout from "../components/layout"
import Image from "../components/image"
import SEO from "../components/seo"
import Engine from "../components/stockfish"

import clickSound from "../sounds/click.mp3"
import informationSound from "../sounds/information.mp3"
import typingSound from "../sounds/typing.mp3"
import deploySound from "../sounds/deploy.mp3"

const mySounds = {
  shared: { volume: 1 },
  players: {
    click: {
      sound: { src: [clickSound] }
    },
    typing: {
      sound: {src: [typingSound] },
      settings: { oneAtATime: true },
    },
    deploy: {
      sound: { src: [deploySound] },
      settings: { oneAtATime: true }
    }
  }
}

const boardsContainer = {
  display: "flex",
  justifyContent: "space-around",
  alignItems: "center"
};
const boardStyle = {
  borderRadius: "5px",
  boxShadow: `0 5px 15px rgba(0, 0, 0, 0.5)`
};

const IndexPage = () => (
  <ThemeProvider theme={createTheme()}>
      <SoundsProvider sounds={createSounds(mySounds)}>
        <Arwes animate show>
          <Layout>
            <SEO title="Home" />
            <Project animate header="Welcome">
             {anim => (
               <div>
                 <p><Words animate show={anim.entered}>Currently a work in progress. Much left to do. See readme.</Words></p>
                </div>
             )}
             </Project>
            <Button animate>Click</Button>
            <Project animate header="Current Game">
              {anim => (
                <div>
                  <p>
                    <Words animate show={anim.entered}>
                      The current game
                    </Words>
                  </p>
                  <div style={boardsContainer}>
                  <Engine>
                    {({ position, onDrop }) => (
                      <Chessboard
                        id="stockfish"
                        position={position}
                        width={320}
                        onDrop={onDrop}
                        boardStyle={boardStyle}
                        orientation="black"
                      />
                    )}
                  </Engine>
                  </div>
                </div>
              )}
            </Project>
          </Layout>
        </Arwes>
    </SoundsProvider>
  </ThemeProvider>
)

export default IndexPage
