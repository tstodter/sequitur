import * as d3 from 'd3';
const R = require('ramda');

import TimestepDriver, { onTimeStep } from './drivers/TimestepDriver';
import KeypressDriver, { onKeyDown, GenericKeypressMessage, SpecificKeypressMessage } from './drivers/KeypressDriver';
import {addDrivers} from './drivers/Driver';
import { MachineDescriptionAdd, MachineDescription } from './event-based-state-machine/MachineDescription';
import { LogMachine, onLog } from './machines/LogMachine';
import { Val, Send, Series, Add, Effect } from './event-based-state-machine/MachineResponse';
import { Machine } from './event-based-state-machine/Machine';
import { wait } from './util';
import { SequenceMachine } from './event-based-state-machine/Engineers';


////////////////////////
const width = 975;
const height = width / 2;

const viewBox: (opts: {minX: number; minY: number; width: number; height: number}) => string
  = ({minX, minY, width, height}) => `${minX} ${minY} ${width} ${height}`;

const svg = d3.select('body')
  .append('svg')
  .attr('width', width)
  .attr('height', height)
  .attr('viewBox', viewBox({
    minX: 0, minY: 0, width, height
  }));

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
    const newMousePos = [d3.event.pageX, d3.event.pageY];

    if (newMousePos[0] === mousePos[0] &&
        newMousePos[1] === mousePos[1]) {
      // simulation.alphaDecay(.1);
    } else {
      // simulation.alpha(1);
    }

    mousePos = [d3.event.pageX, d3.event.pageY];

    updateMouseForce(mousePos[0], mousePos[1]);
  });

const simulation = d3.forceSimulation(nodeData)
  .velocityDecay(.8)
  .alphaDecay(0)
  .force('cohesion', d3.forceManyBody().strength(1))
  .force('collide', d3.forceCollide().radius(10))
  // .force('links', d3.forceLink(linkData).distance(0))
  .force('mouse-gravity-x', mouseForceX)
  .force('mouse-gravity-y', mouseForceY)
  .on('tick', () => {
    nodes
      .attr('cx', d => d.x)
      .attr('cy', d => d.y);
  });


// const machine = Machine(
//   MachineDescriptionAdd(
//     {
//       [onTimeStep]: async (mach, msg) => Send(onLog, msg),
//       [onKeyDown()]: Send(onLog, `generic code`),
//       [onKeyDown('Space')]: Series(
//         wait(1000),
//         Effect(() => {
//           alert('hi there');
//         }),
//         Send(onLog, 'logging after 1000'),
//         Add({
//           [onKeyDown('KeyF')]: Send(onLog, 'logging after keyf')
//         }),
//         wait(1000),
//         Effect(() => {
//           console.log('hi there');
//         }),
//       )
//     },
//     LogMachine
//   )
// );

// const TransitionEffect = (trans: () => d3.Transition<d3.BaseType, unknown, d3.BaseType, any>) => Effect()

const dialogue = svg
  .append('text')
  .attr('class', '.dialogue')
  .attr('x', width / 2)
  .attr('y', height * .9)
  .attr('text-anchor', 'middle');

type DialogueSelection = d3.Selection<SVGTextElement, any, HTMLElement, any>;
const makeShowDialgoue = (sel: DialogueSelection) => (text: string) => Series(
  Effect(() => sel.style('opacity', 0)),
  Effect(() => sel.text(text)),
  // is brokeded
  Effect(() => new Promise(resolve => sel.transition().duration(1000).style('opacity', 1).on('end', resolve))),
  Effect(() => new Promise(resolve => sel.transition().duration(3000).delay(1000).style('opacity', 0).on('end', resolve))),
);

const ShowDialogue = makeShowDialgoue(dialogue);


const wasdMachine: MachineDescription = {
  [onKeyDown('KeyW')]: Send('move-swarm', 'up'),
  [onKeyDown('KeyA')]: Send('move-swarm', 'left'),
  [onKeyDown('KeyS')]: Send('move-swarm', 'down'),
  [onKeyDown('KeyD')]: Send('move-swarm', 'right'),
};

const swarmMachine: MachineDescription = {
  [onKeyDown('KeyP')]: Send('toggle-swarm'),
  'toggle-swarm': Effect(() => {
    simulation.alpha(simulation.alpha() > 0 ? 0 : 1);
    simulation.restart();
  }),
  'move-swarm': async (acc, msg) => {
    const direction = msg as 'up' | 'down' | 'left' | 'right';

    const MoveMouseForce = (byX: number, byY: number) => {
      mousePos[0] += byX;
      mousePos[1] += byY;

      return Effect(() => updateMouseForce(mousePos[0], mousePos[1]));
    };

    switch (direction) {
      case 'up':    return MoveMouseForce(0, -50);
      case 'down':  return MoveMouseForce(0, 50);
      case 'left':  return MoveMouseForce(-50, 0);
      case 'right': return MoveMouseForce(50, 0);
    }
  }
};

const IntroMachine: MachineDescription = {
  'intro-start': ShowDialogue('Welcome to the Thunderdome')
};

const machine = Machine(
  MachineDescriptionAdd(
    swarmMachine,
    wasdMachine,
    SequenceMachine([onKeyDown('Space'), onKeyDown('KeyF'), onKeyDown('KeyG')], ShowDialogue('What it is my dog')),
    IntroMachine,
    {
      [onKeyDown('KeyK')]: Send('intro-start')
    },
    LogMachine
  )
);

const driver = addDrivers(
  // TimestepDriver,
  KeypressDriver
)(machine);

driver.engage();
