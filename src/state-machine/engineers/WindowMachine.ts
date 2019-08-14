const R = require('ramda');

import { Blueprint } from "../Blueprint";
import { MachineResponse, Series, Subtract, Add, isMachineResponseF } from "../MachineResponse";
import { NonSingletonSequenceMachine, PreGeneratedNonSingletonSequenceMachine } from ".";

type WindowMachine = (
  windowSize: number,
  event: string,
  handler: MachineResponse
) => Blueprint;

// export const WindowMachine: WindowMachine = (windowSize, event, handler) => (
//   NonSingletonSequenceMachine(R.repeat(event, windowSize), handler)
// );

export const WindowMachine: WindowMachine = (windowSize, event, handler) => (
  PreGeneratedNonSingletonSequenceMachine(R.repeat(event, windowSize), handler)
);
