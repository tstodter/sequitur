import {MachineDescription} from './MachineDescription';

export type MachineResponse =
  | PlainMachineResponse
  | MachineResponseF
  | MachineResponsePromise
  | void;

export type PlainMachineResponse =
  | Add | Send | Effect
  | Series | Parallel;

export type MachineResponsePromise =
  | Promise<
      | PlainMachineResponse
      | MachineResponseF
      | void
    >;

export type MachineResponseF =
  (...msg: Array<any>) => MachineResponse;

export type Add = {
  kind: 'add';
  operand: MachineDescription;
};
export const Add = (desc: MachineDescription): Add => ({
  kind: 'add',
  operand: desc
});

export type Send = {
  kind: 'send';
  name: string;
  message: any;
};
export const Send = (name: string, message?: any): Send => ({
  kind: 'send',
  name,
  message
});

export type Effect = {
  kind: 'effect';
  effect: () => void | Promise<void>
};
export const Effect = (effect: () => void): Effect => ({
  kind: 'effect',
  effect
});

export type Series = {
  kind: 'series';
  responses: Array<MachineResponse>
};
export const Series = (...responses: Array<MachineResponse>): Series => ({
  kind: 'series',
  responses
});

export type Parallel = {
  kind: 'parallel';
  responses: Array<MachineResponse>
};
export const Parallel = (...responses: Array<MachineResponse>): Parallel => ({
  kind: 'parallel',
  responses
});

const isMachineResponsePromise = (res: MachineResponse): res is MachineResponsePromise => (
  res instanceof Promise
);
const isMachineResponseF = (res: MachineResponse): res is MachineResponseF => (
  res instanceof Function
);
const isPlainMachineResponse = (res: MachineResponse): res is PlainMachineResponse => (
  !!res && !isMachineResponsePromise(res) && !isMachineResponseF(res)
);
const isAdd = (res: MachineResponse): res is Add => (
  isPlainMachineResponse(res) && res.kind === 'add'
);
const isSend = (res: MachineResponse): res is Send => (
  isPlainMachineResponse(res) && res.kind === 'send'
);
const isEffect = (res: MachineResponse): res is Effect => (
  isPlainMachineResponse(res) && res.kind === 'effect'
);
const isSeries = (res: MachineResponse): res is Series => (
  isPlainMachineResponse(res) && res.kind === 'series'
);
const isParallel = (res: MachineResponse): res is Parallel => (
  isPlainMachineResponse(res) && res.kind === 'parallel'
);

export const typeguards = {
  isMachineResponsePromise,
  isMachineResponseF,
  isPlainMachineResponse,
  isAdd,
  isSend,
  isEffect,
  isSeries,
  isParallel
};

export const match = <T>(
  onVoid    : () => T,
  onPromise : (_: MachineResponsePromise) => T,
  onF       : (_: MachineResponseF) => T,
  onAdd     : (_: Add) => T,
  onEffect  : (_: Effect) => T,
  onSend    : (_: Send) => T,
  onSeries  : (_: Series) => T,
  onParallel: (_: Parallel) => T
) => (res: MachineResponse) => {
  if (!res)                          return onVoid();
  if (isMachineResponsePromise(res)) return onPromise(res);
  if (isMachineResponseF(res))       return onF(res);

  switch (res.kind) {
    case 'add'     : return onAdd(res);
    case 'effect'  : return onEffect(res);
    case 'send'    : return onSend(res);
    case 'series'  : return onSeries(res);
    case 'parallel': return onParallel(res);
  }
};
