import {MachineDescription} from './MachineDescription';

export type MachineResponse =
  | PlainMachineResponse
  | MachineResponseF
  | MachineResponsePromise
  | void;

export type PlainMachineResponse =
  | Add | Val | Send | Effect
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

export type Val = {
  kind: 'val';
  val: any;
};
export const Val = (val: any): Val => ({
  kind: 'val',
  val
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
const isVal = (res: MachineResponse): res is Val => (
  isPlainMachineResponse(res) && res.kind === 'val'
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
  isVal,
  isAdd,
  isSend,
  isEffect,
  isSeries,
  isParallel
};

