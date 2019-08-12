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
} from './MachineResponse';

export type Machine = {
  kind: 'machine';
  send: (eventName: string, msg: any) => Promise<void>;
  desc: Blueprint
};

export const Machine = (desc: Blueprint): Machine => {
  const machine: Machine = {
    desc: R.clone(desc),
    kind: 'machine',
    send: async (eventName: string, msg: any) => handleResponse(Send(eventName, msg))
  };

  type HandleResponse = (res: MachineResponse) => Promise<void>;
  const handleResponse: HandleResponse = match(
    async () => {},
    async (res: MachineResponsePromise) => handleResponse(await res),
    async (res: MachineResponseF) => handleResponse(res()),
    async (res: Add) => {
      machine.desc = BlueprintAdd2(
        machine.desc,
        res.operand
      );
      console.log('+++', machine.desc);

    },
    async (res: Subtract) => {
      machine.desc = BlueprintSubtract2(
        machine.desc,
        res.operand
      );
      console.log('---', machine.desc);
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
    async (res: Send) => {
      // console.log('-----', 'sending', res.name, res.message);
      const eventName = res.name;
      const msg = res.message;

      if (R.has(eventName, machine.desc)) {
        const invokeHandler = async (handler: MachineResponse): Promise<void> => {
          if (isMachineResponseF(handler)) {
            return invokeHandler(await handler(msg));
          }
          else
          if (isParallel(handler)) {
            await Promise.all(handler.responses.map(invokeHandler));
          }
          else {
            return handleResponse(handler);
          }
        };

        return await invokeHandler(machine.desc[eventName]);
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