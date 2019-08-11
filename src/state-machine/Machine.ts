const R = require('ramda');

import {
  MachineDescription,
  MachineDescriptionAdd2,
  MachineDescriptionSubtract
} from './MachineDescription';
import {
  MachineResponse,
  Send,
  typeguards as tg,
  match,
  MachineResponseF,
  MachineResponsePromise,
  Add,
  Effect,
  Series,
  Parallel,
  Subtract,
  Try,
} from './MachineResponse';

export type Machine = {
  kind: 'machine';
  send: (eventName: string, msg: any) => Promise<void>;
  desc: MachineDescription
};

export const Machine = (desc: MachineDescription): Machine => {
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
      machine.desc = MachineDescriptionAdd2(
        machine.desc,
        res.operand
      );
      console.log('-----', machine.desc);

    },
    async (res: Subtract) => {
      machine.desc = MachineDescriptionSubtract(
        machine.desc,
        res.operand
      );
      console.log('-----', machine.desc);
    },
    async (res: Effect) => res.effect(),
    async (res: Try) => {
      try {
        return await handleResponse(res.try);
      } catch (e) {
        if (tg.isMachineResponseF(res.failure)) {
          return handleResponse(await res.failure(e));
        }
        return handleResponse(res.failure);
      }
    },
    async (res: Send) => {
      console.log('-----', 'sending', res.name, res.message);
      const eventName = res.name;
      const msg = res.message;

      if (R.has(eventName, machine.desc)) {
        let handler = machine.desc[eventName];

        if (tg.isMachineResponseF(handler)) {
          return handleResponse(await handler(msg));
        } else {
          return handleResponse(handler);
        }
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