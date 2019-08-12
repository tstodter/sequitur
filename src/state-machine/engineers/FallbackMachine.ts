const R = require('ramda');

import { Blueprint } from "../Blueprint";
import { Try } from "../MachineResponse";

type FallbackMachine = (
  tryMachine: Blueprint,
  fallback: Blueprint
) => Blueprint;

export const FallbackMachine: FallbackMachine = (tryMachine, fallback) => {
  return R.mergeWith(Try)(tryMachine, fallback);
};
