const R = require('ramda');

import {
  Blueprint,
  BlueprintAdd2,
  BlueprintSubtract2
} from './Blueprint';
import {
  MachineResponse,
  Send,
  match,
  MachineResponseF,
  MachineResponsePromise,
  Add,
  Effect,
  Series,
  Parallel,
  Subtract,
  Try,
  isMachineResponseF,
  isParallel,
  PlainMachineResponse,
} from './MachineResponse';
import { Once } from './MachineResponse/Once';

export type Machine = {
  kind: 'machine';
  send: (eventName: string, msg: any) => Promise<void>;
  desc: Blueprint
};

type HandleResponse = (res: MachineResponse) => Promise<void>;

type HandlerInvoker = (recurF: HandlerInvoker, handler: MachineResponse) => Promise<void>;

const invokeHandlerWithMsg: (handleResponse: HandleResponse, msg: any) => HandlerInvoker =
  (handleResponse, msg: any) => async (recCall: HandlerInvoker, handler: MachineResponse): Promise<void> => {
    if (isMachineResponseF(handler)) {
      return recCall(recCall, await handler(msg));
    }
    else
    if (isParallel(handler)) {
      await Promise.all(handler.responses.map(response => recCall(recCall, response)));
    }
    else {
      return handleResponse(handler);
    }
  };

export const Machine = (desc: Blueprint): Machine => {
  const machine: Machine = {
    desc: R.clone(desc),
    kind: 'machine',
    send: async (eventName: string, msg: any) => handleResponse(Send(eventName, msg))
  };

  // DANGER WILL ROBINSON
  // This object is intended to mutate, and should only be touched
  // from WaitFor functions
  const waitingFor: {
    [event: string]: Array<(_: MachineResponse) => void>
  } = {};

  const handleResponse: HandleResponse = match(
    async () => {},
    async (res: MachineResponsePromise) => handleResponse(await res),
    async (res: MachineResponseF) => handleResponse(res()),
    async (res: Add) => {
      machine.desc = BlueprintAdd2(
        machine.desc,
        res.operand
      );
      // console.log('+++', machine.desc);

    },
    async (res: Subtract) => {
      machine.desc = BlueprintSubtract2(
        machine.desc,
        res.operand
      );
      // console.log('---', machine.desc);
    },
    async (res: Effect) => res.effect(),
    async (res: Try) => {
      try {
        return await handleResponse(res.try);
      } catch (e) {
        if (isMachineResponseF(res.failure)) {
          return handleResponse(await res.failure(e));
        }
        return handleResponse(res.failure);
      }
    },
    async (res: Once) => {
      const eventualMsg = new Promise<any>(resolve => {
        if (res.name in waitingFor) {
          waitingFor[res.name].push(resolve);
        } else {
          waitingFor[res.name] = [resolve];
        }
      });

      const msg = await eventualMsg;

      const invokeHandler = invokeHandlerWithMsg(handleResponse, msg);
      return await invokeHandler(invokeHandler, res.handler);
    },
    async (res: Send) => {
      // console.log('-----', 'sending', res.name, res.message);
      const eventName = res.name;
      const msg = res.message;

      const invokeHandler = invokeHandlerWithMsg(handleResponse, msg);

      if (eventName in waitingFor) {
        const waitingResponses = waitingFor[eventName];
        delete waitingFor[eventName];

        waitingResponses.forEach(resolve => resolve(res.message));
      }

      if (R.has(eventName, machine.desc)) {
        return await invokeHandler(invokeHandler, machine.desc[eventName]);
      }
    },
    async (res: Series) => {
      return res.responses.reduce(async (accP: Promise<MachineResponse>, respItem: MachineResponse) => {
        const acc = await accP;

        return handleResponse(respItem);
      }, Promise.resolve());
    },
    async (res: Parallel) => {
      await Promise.all(res.responses.map(handleResponse));
    }
  );

  return machine;
};