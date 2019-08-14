const R = require('ramda');

import { MachineResponse, PlainMachineResponse, Parallel, AddMachineResponse, SubtractMachineResponse } from "./MachineResponse";

export type Blueprint = {
  [event: string]: MachineResponse
};

export const EmptyBlueprint = (): Blueprint => ({});

export const BlueprintAdd2 = (
  a: Blueprint,
  b: Blueprint
): Blueprint => (
  R.mergeWith(AddMachineResponse)(a, b)
);

export const BlueprintSubtract2 = (
  a: Blueprint,
  b: Blueprint
): Blueprint => {
  return Object.keys(a)
    .reduce((descAcc: Blueprint, eventName: string) => {
      if (!!b[eventName]) {
        const subResult = SubtractMachineResponse(a[eventName], b[eventName]);
        if (!!subResult) {
          descAcc[eventName] = subResult;
        }
      } else {
        descAcc[eventName] = a[eventName];
      }

      return descAcc;
    }, EmptyBlueprint());
};

export const BlueprintAdd = (...descs: Array<Blueprint>) => {
  return descs.reduce(BlueprintAdd2);
};
