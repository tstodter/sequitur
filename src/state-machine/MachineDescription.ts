const R = require('ramda');

import { MachineResponse, PlainMachineResponse, Parallel, AddMachineResponse, SubtractMachineResponse } from "./MachineResponse";

export type MachineDescription = {
  [event: string]: MachineResponse
};

export const EmptyMachineDescription = (): MachineDescription => ({});

export const MachineDescriptionAdd2 = (
  a: MachineDescription,
  b: MachineDescription
): MachineDescription => (
  R.mergeWith(AddMachineResponse)(a, b)
);

export const MachineDescriptionSubtract = (
  a: MachineDescription,
  b: MachineDescription
): MachineDescription => {
  // write SubtractMachineResponse that does the below
  //   plain - plain
  //   paral - plain
  //   plain - paral
  //   paral - paral

  // go through a's keys
  // if key is in b, evaluate:
  //   if b[key] is parallel, remove all MR in b[key] from a[key]
  //   else remove MR from a[key]
  // else put it final object

  return Object.keys(a)
    .reduce((descAcc: MachineDescription, eventName: string) => {
      if (!!b[eventName]) {
        const subResult = SubtractMachineResponse(a[eventName], b[eventName]);
        if (!!subResult) {
          descAcc[eventName] = SubtractMachineResponse(a[eventName], b[eventName]);
        }
      } else {
        descAcc[eventName] = a[eventName];
      }

      return descAcc;
    }, EmptyMachineDescription());
};

export const MachineDescriptionAdd = (...descs: Array<MachineDescription>) => {
  return descs.reduce(MachineDescriptionAdd2);
};
