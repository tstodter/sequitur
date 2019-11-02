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
    {
      add: async ({operand}) => {
        machine.desc = BlueprintAdd2(
          machine.desc,
          operand
        );
      },
      subtract: async ({operand}) => {
        machine.desc = BlueprintSubtract2(
          machine.desc,
          operand
        );
      },
      effect: async (res) => res.effect(),
      'try': async ({try: onTry, failure: onFailure}) => {
        try {
          return await handleResponse(onTry);
        } catch (e) {
          if (isMachineResponseF(onFailure)) {
            return handleResponse(await onFailure(e));
          }
          return handleResponse(onFailure);
        }
      },
      once: async ({name, handler}) => {
        const eventualMsg = new Promise<any>(resolve => {
          if (name in waitingFor) {
            waitingFor[name].push(resolve);
          } else {
            waitingFor[name] = [resolve];
          }
        });

        const msg = await eventualMsg;

        const invokeHandler = invokeHandlerWithMsg(handleResponse, msg);
        return await invokeHandler(invokeHandler, handler);
      },
      send: async ({name, message}) => {
        // console.log('-----', 'sending', name, message);
        const eventName = name;
        const msg = message;

        const invokeHandler = invokeHandlerWithMsg(handleResponse, msg);

        if (eventName in waitingFor) {
          const waitingResponses = waitingFor[eventName];
          delete waitingFor[eventName];

          waitingResponses.forEach(resolve => resolve(message));
        }

        if (R.has(eventName, machine.desc)) {
          return await invokeHandler(invokeHandler, machine.desc[eventName]);
        }
      },
      series: async ({responses}) => {
        return responses.reduce(async (accP: Promise<MachineResponse>, respItem: MachineResponse) => {
          const acc = await accP;

          return handleResponse(respItem);
        }, Promise.resolve());
      },
      parallel: async ({responses}) => {
        await Promise.all(responses.map(handleResponse));
      }
    }
  );

  return machine;
};