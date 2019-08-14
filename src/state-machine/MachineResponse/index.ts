const R = require('ramda');

import { Add } from './Add';
import { Subtract } from './Subtract';
import { Send } from './Send';
import { Effect } from './Effect';
import { Try } from './Try';
import { Series } from './Series';
import { Parallel, isParallel } from './Parallel';
import { Machine } from '../Machine';
import { Once } from './Once';

export * from './Add';
export * from './Subtract';
export * from './Send';
export * from './Effect';
export * from './Try';
export * from './Series';
export * from './Parallel';

export type MachineResponse =
  | PlainMachineResponse
  | MachineResponseF
  | MachineResponsePromise
  | void;

export type PlainMachineResponse =
  | Add | Subtract | Send | Effect
  | Try | Once | Series | Parallel;

export type MachineResponseF =
  (...msg: Array<any>) => MachineResponse;

export type MachineResponsePromise =
  | Promise<
      | PlainMachineResponse
      | MachineResponseF
      | void
    >;

export const isMachineResponsePromise = (res: MachineResponse): res is MachineResponsePromise => (
  res instanceof Promise
);

export const isMachineResponseF = (res: MachineResponse): res is MachineResponseF => (
  res instanceof Function
);

export const isPlainMachineResponse = (res: MachineResponse): res is PlainMachineResponse => (
  !!res && !isMachineResponsePromise(res) && !isMachineResponseF(res)
);

export const AddMachineResponse = Parallel;

const without = (arr: Array<MachineResponse>, from: Array<MachineResponse>) => {
  const retArray: Array<MachineResponse> = [];

  for (let i = 0; i < from.length; i++) {
    if (arr.indexOf(from[i]) === -1) {
      retArray.push(from[i]);
    }
  }
  return retArray;
};

// TODO:  The R.without's here are having a significant performance impact
export const SubtractMachineResponse = (a: MachineResponse, b: MachineResponse): MachineResponse => {
  if (isParallel(a)) {
    if (isParallel(b)) {
      const withBRemoved = without(b.responses, a.responses);
      return withBRemoved.length > 0
        ? Parallel(...withBRemoved)
        : undefined;
    } else {
      const withBRemoved = without([b], a.responses);
      return withBRemoved.length > 0
        ? Parallel(...withBRemoved)
        : undefined;
    }
  } else {
    if (isParallel(b)) {
      const withBRemoved: Array<MachineResponse> = without(b.responses, [a]);
      return withBRemoved.length > 0
        ? withBRemoved[0]
        : undefined;
    } else {
      return a === b
        ? undefined
        : a;
    }
  }
};

export const match = <T>(
  onVoid    : () => T,
  onPromise : (_: MachineResponsePromise) => T,
  onF       : (_: MachineResponseF) => T,
  onAdd     : (_: Add) => T,
  onSubtract: (_: Subtract) => T,
  onEffect  : (_: Effect) => T,
  onTry     : (_: Try) => T,
  onOnce : (_: Once) => T,
  onSend    : (_: Send) => T,
  onSeries  : (_: Series) => T,
  onParallel: (_: Parallel) => T
) => (res: MachineResponse) => {
  if (!res)                          return onVoid();
  if (isMachineResponsePromise(res)) return onPromise(res);
  if (isMachineResponseF(res))       return onF(res);

  switch (res.kind) {
    case 'add'     : return onAdd(res);
    case 'subtract': return onSubtract(res);
    case 'effect'  : return onEffect(res);
    case 'try'     : return onTry(res);
    case 'once'    : return onOnce(res);
    case 'send'    : return onSend(res);
    case 'series'  : return onSeries(res);
    case 'parallel': return onParallel(res);
  }
};
