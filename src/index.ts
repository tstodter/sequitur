/*  TODO

// - Convert SequenceMachine to SingletonSequenceMachine
// - Write arbitrary, non-deleting SequenceMachine
- Write Assertion?Machine for arbitrarily ordered events
  - this will required tag-unioned messages to differentiate between
    events
  - Might be tough to do that for non-ts'ed code
  - ~~Union generator? Give it messages and it tags them?~~
  - just use [{kind: eventName, msg: msg}]
- The R.without's in MachineResponseSubtract are costly, performance-wise
  - is it possible to pregenerate a static machine that's equivalent
    to the dynamic machine, that does not require Subtract's
  - Will have to label this as special, since combinatorial explosion
    may be an issue

-
*/

import * as d3 from 'd3';
const R = require('ramda');

import TimestepDriver, { onTimeStep } from './drivers/TimestepDriver';
import KeypressDriver, { onKeyPressed, onKeyUp, LetterDriver, WhitespaceDriver, onKeyDown, GenericKeyDownMessage, SpecificKeyDownMessage } from './drivers/KeypressDriver';
import {AddDrivers} from './drivers/Driver';
import { BlueprintAdd, Blueprint, BlueprintSubtract2 } from './state-machine/Blueprint';
import { logMachine, onLog } from './machines/LogMachine';
import { Send, Series, Add, Effect, Try, MachineResponseF, Parallel } from './state-machine/MachineResponse';
import { Machine } from './state-machine/Machine';
import { wait } from './util';
import { SingletonSequenceMachine, NonSingletonSequenceMachine, FallbackMachine, PreGeneratedNonSingletonSequenceMachine, SetMachine } from './state-machine/engineers';
import { WindowMachine } from './state-machine/engineers/WindowMachine';
import { Once } from './state-machine/MachineResponse/Once';

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

const swarmControllerMachine: Blueprint = BlueprintAdd(
  {
    [onKeyPressed('KeyW')]: Send('move-swarm', 'up'),
    [onKeyPressed('KeyA')]: Send('move-swarm', 'left'),
    [onKeyPressed('KeyS')]: Send('move-swarm', 'down'),
    [onKeyPressed('KeyD')]: Send('move-swarm', 'right'),
    [onKeyDown('KeyP')]: t => Send('pause-swarm', t),
    [onKeyUp('KeyP')]: t => Send('unpause-swarm', t),
  },
  SingletonSequenceMachine([
    'pause-swarm',
    'unpause-swarm'
  ], ([t1, t2]: [number, number]) => ShowDialogue(`paused for ${t2 - t1}ms`))
);

const swarmMachine: Blueprint = BlueprintAdd(
  {
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
    },
    'swarm-moving-diagonally': async (direction: [string, string]) => {
      console.log('diagonally');

      nodes
        .style('fill', 'red');
    },
    'swarm-moving-cardinally': async (direction: [string, string]) => {
      console.log('cardinally');

      nodes
        .style('fill', 'black');
    }
  },
  WindowMachine(10,
    'move-swarm', (...directions: Array<string>) => {
      const sum = directions
        .map(dir => dir === 'up' || dir === 'down'
          ? 1
          : -1
        )
        .reduce((a, b) => a + b, 0);

      if (sum >= -8 && sum <= 8) {
        return Send('swarm-moving-diagonally', directions);
      }
    }
  ),
  WindowMachine(10,
    'move-swarm', (...directions: Array<string>) => {
      const sum = directions
        .map(dir => dir === 'up' || dir === 'down'
          ? 1
          : -1
        )
        .reduce((a, b) => a + b, 0);

      if (sum <= -9 || sum >= 9 ) {
        return Send('swarm-moving-cardinally', directions);
      }

    }
  )
);

const introMachine: Blueprint = {
  'intro-start': ShowDialogue('Welcome to the Thunderdome')
};

const introController: Blueprint = {
  [onKeyDown('KeyK')]: Send('intro-start')
};

const errorMachine: Blueprint = {
  [onKeyUp('KeyT')]: Try(
    Effect(() => {
      throw 'bad news bears hombre';
    }),
    async (err) => ShowDialogue(err)
  )
};

const errorMachine2: Blueprint = BlueprintAdd(
  {[onKeyUp('KeyY')]: Send('start-error')},
  FallbackMachine(
    {
      ['start-error']: Send('continue-error'),
      ['continue-error']: Send('throw-error'),
      ['throw-error']: Effect(() => { throw 'ehhhhhhh'; })
    },
    {
      ['start-error']: ShowDialogue('this will never show'),
      ['continue-error']: ShowDialogue
    }
  )
);

const machine = Machine(
  BlueprintAdd(
    swarmMachine,
    swarmControllerMachine,
    // SingletonSequenceMachine([
    //   onKeyDown('Space'),
    //   onKeyDown('KeyF'),
    //   onKeyDown('KeyG')
    // ], msg => {
    //   console.log(msg);
    //   return ShowDialogue('What it is my dog');
    // }),
    NonSingletonSequenceMachine([
      onKeyDown('Enter'),
      onKeyDown('Enter')
    ], ([t1, t2]: [number, number]) => (
      ShowDialogue(`Time between Enters: ${Math.floor(t2 - t1) / 1000}s`)
    )),
    WindowMachine(2,
      onKeyDown(), ([_, t1]: GenericKeyDownMessage, [__, t2]: GenericKeyDownMessage) => {
        console.log(`Time between keydown events: ${Math.floor((t2 - t1) / 100) / 10}`);
      }
    ),
    introMachine,
    introController,
    logMachine,
    errorMachine,
    errorMachine2,
    // SetMachine([
    //   onKeyDown('Space'),
    //   onKeyDown('Space'),
    //   onKeyDown('Space')
    // ], (fromSpace: SpecificKeyDownMessage, fromF: SpecificKeyDownMessage, fromG: SpecificKeyDownMessage) => {
    //   console.log('-----');
    //   console.log(`S: ${fromSpace}`);
    //   console.log(`F: ${fromF}`);
    //   console.log(`G: ${fromG}`);
    //   console.log('-----');
    // })
  )
);

const driver = AddDrivers(
  // TimestepDriver,
  LetterDriver,
  WhitespaceDriver
)(machine);

driver.engage();
