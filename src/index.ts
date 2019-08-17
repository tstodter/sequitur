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
import { Send, Series, Add, Effect, Try, MachineResponseF, Parallel, MachineResponse, Subtract } from './state-machine/MachineResponse';
import { Machine } from './state-machine/Machine';
import { wait } from './util';
import { SingletonSequenceMachine, NonSingletonSequenceMachine, FallbackMachine, PreGeneratedNonSingletonSequenceMachine, SetMachine } from './state-machine/engineers';
import { WindowMachine } from './state-machine/engineers/WindowMachine';
import { Once } from './state-machine/MachineResponse/Once';
import {fabrik, Point, fabrikGenerator} from './fabrik';

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

export type NodeDatum = {
  x: number;
  y: number;
  vx: number;
  vy: number;
};

export type SwarmNodeDatum = NodeDatum & {
  isLeader?: boolean;
};

const nodeData: Array<NodeDatum> = d3.range(0).map((x, i) => ({
  x: Math.random() * width,
  y: Math.random() * height,
  vx: (2 - Math.random()),
  vy: (2 - Math.random()),
  isLeader: R.contains(i, sample)
}));

type Link = d3.SimulationLinkDatum<d3.SimulationNodeDatum>;
const linkData: Array<Link> = R.pipe(
  R.filter((n: SwarmNodeDatum) => n.isLeader),
  R.chain((n: SwarmNodeDatum) => {
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

const collisionForce = d3.forceCollide().radius(15);
const simulation = d3.forceSimulation(nodeData)
  .velocityDecay(.8)
  .alphaDecay(0)
  // .force('cohesion', d3.forceManyBody().strength(1))
  .force('collide', collisionForce)
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

      collisionForce.radius(30);
      nodes
        .style('fill', 'red');
    },
    'swarm-moving-cardinally': async (direction: [string, string]) => {
      console.log('cardinally');

      collisionForce.radius(15);
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
    {
      [onKeyPressed('KeyW')]: Send('move-limb', 'up'),
      [onKeyPressed('KeyA')]: Send('move-limb', 'left'),
      [onKeyPressed('KeyS')]: Send('move-limb', 'down'),
      [onKeyPressed('KeyD')]: Send('move-limb', 'right'),
      'move-limb': async (direction: 'up' | 'down' | 'left' | 'right') => {
        switch (direction) {
          case 'up':    return Effect(() => ikTarget[1] -= 30);
          case 'down':  return Effect(() => ikTarget[1] += 30);
          case 'left':  return Effect(() => ikTarget[0] -= 30);
          case 'right': return Effect(() => ikTarget[0] += 30);
        }
      }
    }
  )
);

const driver = AddDrivers(
  // TimestepDriver,
  LetterDriver,
  WhitespaceDriver
)(machine);

driver.engage();





const ikRoot = [width / 2, height] as Point;
const ikTarget = [mousePos[0], mousePos[1]] as Point;

const numPoints = 9;


const limbScale = d3.scaleSqrt()
  .domain([1, numPoints - 1])
  .range([500, 500])
  // .range([2 * 1000 / numPoints, 50]);

const areaScale = d3.scaleSqrt()
  .domain([0, numPoints])
  .range([3, 40]);

const edgeScale = d3.scaleSqrt()
  .domain([0, numPoints])
  .range([2, 50]);

// const ikLimb = d3.range(10 - 1).map(_ => distBxPoints);
const ikLimb: number[] = d3.range(numPoints - 1)
  .map((_, i) => limbScale(i + 1));

let jointPoints: Point[] = ikLimb.reduce((points, boneLength) => ([
  ...points,
  R.over(
    R.lensIndex(1),
    R.subtract(R.__, boneLength),
    R.last(points)
  )
]), [ikRoot]);

let jointNodes = jointPoints.map(p => ({
  x: p[0],
  y: p[1]
} as NodeDatum));

const ikEdges: Array<[NodeDatum, NodeDatum]> = R.aperture(2, jointNodes);

function assertNever(x: never): never {
  throw new Error("Unexpected object: " + x);
}

let now = performance.now();
const points = [...jointPoints];
let fabrikProgress = fabrikGenerator(1, Infinity, true)(
  points,
  ikLimb,
  ikTarget
);
const boneSimulation = d3.forceSimulation(jointNodes)
  .velocityDecay(.8)
  .alphaDecay(0)
  // .force('collide', d3.forceCollide()
  //   .radius((_, i) => ikLimb[i] / 2)
  //   .strength(1)
  // )
  .force('fabrik', (alpha) => {
    if (performance.now() - now > 1000) {
      now = performance.now();

      const next = fabrikProgress.next();
      if (next.done) {
        fabrikProgress = fabrikGenerator(1, 1, true)(
          points,
          ikLimb,
          ikTarget
        );
      }

      jointPoints = points;

    }

    points.forEach((p, i) => {
      jointNodes[i].vx += (p[0] - jointNodes[i].x) * alpha * 0.5;
      jointNodes[i].vy += (p[1] - jointNodes[i].y) * alpha * 0.5;
    });
  })
  .on('tick', () => {
    const target = ikTarget;

    svg.selectAll('.limb-path')
    .data([jointNodes.map(({x, y}) => ([x, y] as [number, number]))])
    .join('path')
      .attr('class', 'limb-path')
      .attr('fill', 'none')
      .attr('stroke', 'black')
      .attr('stroke-width', (d, i) => edgeScale(i))
      .attr('d', d3.line().curve(d3.curveLinear));

    // svg.selectAll('.fabrik-edges')
    //   .data(ikEdges)
    //   .join('line')
    //     .attr('class', 'fabrik-edges')
    //     .attr('stroke-width', (_, i) => edgeScale(i))
    //     .style('stroke', 'black')
    //     .attr('x1', d => d[0].x)
    //     .attr('y1', d => d[0].y)
    //     .attr('x2', d => d[1].x)
    //     .attr('y2', d => d[1].y);

    svg.selectAll('.starting-points')
      .data(jointNodes)
      .join('circle')
        .attr('class', 'starting-points')
        .attr('cx', d => d.x)
        .attr('cy', d => d.y)
        .attr('r', (d, i) => areaScale(i))
        .style('fill', 'black')
        .style('stroke', 'black');
  });

d3.select('svg')
  .on('mousemove', () => {

    ikTarget[0] = d3.event.pageX;
    ikTarget[1] = d3.event.pageY;
  });




