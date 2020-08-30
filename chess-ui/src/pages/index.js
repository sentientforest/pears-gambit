import React from "react"
import { Link } from "gatsby"
import { Arwes, ThemeProvider, createTheme, SoundsProvider, createSounds,
  Row, Col, Button, Project, Words } from 'arwes'

import Layout from "../components/layout"
import Image from "../components/image"
import SEO from "../components/seo"

import clickSound from "../sounds/click.mp3"
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

const IndexPage = () => (
  <ThemeProvider theme={createTheme()}>
      <SoundsProvider sounds={createSounds(mySounds)}>
        <Arwes animate show>
          <Layout>
            <SEO title="Home" />
            <Project animate header="Welcome, Human.">
             {anim => (
               <div>
                 <p><Words animate show={anim.entered}>Lorem ipsum dolor sit amet, consectetur adipisicing elit,
                             sed do eiusmod tempor incididunt ut labore et dolore magna
                             aliqua. Ut enim ad minim veniam, quis laboris nisi ut aliquip
                             ex. Duis aute irure. Consectetur adipisicing elit, sed do
                             eiusmod tempor incididunt ut labore et dolore magna aliqua.
                             Ut enim ad minim veniam, quis nostrud.</Words></p>
                </div>
             )}
             </Project>

            <Button animate>Click</Button>
          </Layout>
        </Arwes>
    </SoundsProvider>
  </ThemeProvider>
)

export default IndexPage
