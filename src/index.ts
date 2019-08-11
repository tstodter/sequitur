// TODO
/*
// - Fix brokedness
// - let machine descriptions have non-promise returning functions
// - remove acc from responders
- Parallel-ize machine adds
// - include plain function in responder, along with machineResponses
- add subtraction response
- remove val response
*/

import * as d3 from 'd3';
const R = require('ramda');

import TimestepDriver, { onTimeStep } from './drivers/TimestepDriver';
import KeypressDriver, { onKeyPressed, onKeyUnpressed } from './drivers/KeypressDriver';
import {addDrivers} from './drivers/Driver';
import { MachineDescriptionAdd, MachineDescription } from './state-machine/MachineDescription';
import { LogMachine, onLog } from './machines/LogMachine';
import { Send, Series, Add, Effect } from './state-machine/MachineResponse';
import { Machine } from './state-machine/Machine';
import { wait } from './util';
import { SequenceMachine } from './state-machine/Engineers';


////////////////////////
const width = window.innerWidth;
const height = window.innerHeight;

const viewBox: (opts: {minX: number; minY: number; width: number; height: number}) => string
  = ({minX, minY, width, height}) => `${minX} ${minY} ${width} ${height}`;

const svg = d3.select('body')
  .append('svg')
  .attr('width', width)
  .attr('height', height)
  .attr('viewBox', viewBox({
    minX: 0, minY: 0, width, height
  }));

const dialogue = svg
  .append('text')
  .attr('class', '.dialogue')
  .attr('x', width / 2)
  .attr('y', height * .9)
  .attr('text-anchor', 'middle');

type DialogueSelection = d3.Selection<SVGTextElement, any, HTMLElement, any>;
const makeShowDialgoue = (sel: DialogueSelection) => (text: string) => (
  Series(
    Effect(() => sel.style('opacity', 0)),
    Effect(() => sel.text(text)),
    TransitionEffect(() => sel.transition().duration(1000).style('opacity', 1)),
    wait(2000),
    TransitionEffect(() => sel.transition().duration(1000).style('opacity', 0)),
  )
);

const ShowDialogue = makeShowDialgoue(dialogue);

const rand = d3.randomUniform(0, 100);
const sample = d3.range(0.15 * 100)
  .map(i => Math.floor(rand()));

type NodeDatum = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  isLeader: boolean;
};
const nodeData: Array<NodeDatum> = d3.range(100).map((x, i) => ({
  x: Math.random() * width,
  y: Math.random() * height,
  vx: (2 - Math.random()),
  vy: (2 - Math.random()),
  isLeader: R.contains(i, sample)
}));

type Link = d3.SimulationLinkDatum<d3.SimulationNodeDatum>;
const linkData: Array<Link> = R.pipe(
  R.filter((n: NodeDatum) => n.isLeader),
  R.chain((n: NodeDatum) => {
    const shuffledNodes = d3.shuffle(nodeData);

    return shuffledNodes.slice(0, 0.25 * nodeData.length).map(n2 => ({
      source: n,
      target: n2
    } as Link));
  })
)(nodeData);

const nodes = svg
  .append('g')
  .selectAll('.nodes')
  .data(nodeData)
  .join('circle')
    .attr('cx', d => d.x)
    .attr('cy', d => d.y)
    .attr('r', 3)
    .style('fill', 'black')
    .style('stroke', 'black');

const mouseForceX = d3.forceX().x(width / 2).strength(0.2);
const mouseForceY = d3.forceY().y(height / 2).strength(0.2);

const updateMouseForce = (x: number, y: number) => {
  mouseForceX.x(x);
  mouseForceY.y(y);
};

let mousePos = [width / 2, height / 2];
d3.select('svg')
  .on('mousemove', () => {
    mousePos = [d3.event.pageX, d3.event.pageY];

    updateMouseForce(mousePos[0], mousePos[1]);
  });

const simulation = d3.forceSimulation(nodeData)
  .velocityDecay(.8)
  .alphaDecay(0)
  // .force('cohesion', d3.forceManyBody().strength(1))
  .force('collide', d3.forceCollide().radius(15))
  .force('mouse-gravity-x', mouseForceX)
  .force('mouse-gravity-y', mouseForceY)
  .on('tick', () => {
    nodes
      .attr('cx', d => d.x)
      .attr('cy', d => d.y);
  });


type D3Transition = d3.Transition<any, any, any, any>;
const transitionP = (trans: D3Transition): Promise<void> => (
  new Promise(resolve => (
    trans.on('end', () => resolve())
  ))
);

const TransitionEffect = (transF: () => D3Transition) => (
  Effect(() => transitionP(
    transF()
  ))
);

const SwarmControllerMachine: MachineDescription = {
  [onKeyPressed('KeyW')]: Send('move-swarm', 'up'),
  [onKeyPressed('KeyA')]: Send('move-swarm', 'left'),
  [onKeyPressed('KeyS')]: Send('move-swarm', 'down'),
  [onKeyPressed('KeyD')]: Send('move-swarm', 'right'),
  [onKeyPressed('KeyP')]: Send('pause-swarm'),
  [onKeyUnpressed('KeyP')]: Send('unpause-swarm'),
};

const SwarmMachine: MachineDescription = {
  'pause-swarm': Effect(() => simulation.alpha(0)),
  'unpause-swarm': Effect(() => {
    simulation.alpha(1);
    simulation.restart();
  }),
  'toggle-swarm': Effect(() => simulation.alpha() > 0
    ? Send('pause-swarm')
    : Send('unpause-swarm')
  ),
  'move-swarm': async (direction: 'up' | 'down' | 'left' | 'right') => {
    const MoveMouseForce = (byX: number, byY: number) => {
      mousePos[0] += byX;
      mousePos[1] += byY;

      return Effect(() => updateMouseForce(mousePos[0], mousePos[1]));
    };

    const speed = 10;

    switch (direction) {
      case 'up':    return MoveMouseForce(0, -speed);
      case 'down':  return MoveMouseForce(0, speed);
      case 'left':  return MoveMouseForce(-speed, 0);
      case 'right': return MoveMouseForce(speed, 0);
    }
  }
};

const IntroMachine: MachineDescription = {
  'intro-start': ShowDialogue('Welcome to the Thunderdome')
};

const IntroController: MachineDescription = {
  [onKeyPressed('KeyK')]: Send('intro-start')
};

const machine = Machine(
  MachineDescriptionAdd(
    SwarmMachine,
    SwarmControllerMachine,
    SequenceMachine([onKeyPressed('Space'), onKeyPressed('KeyF'), onKeyPressed('KeyG')], ShowDialogue('What it is my dog')),
    IntroMachine,
    IntroController,
    LogMachine
  )
);

const driver = addDrivers(
  // TimestepDriver,
  KeypressDriver
)(machine);

driver.engage();
