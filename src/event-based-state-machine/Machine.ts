const R = require('ramda');

import {
  MachineDescription,
  MachineDescriptionAdd2
} from './MachineDescription';
import {
  MachineResponse,
  Send,
  typeguards as tg,
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

  const handleResponse = async (res: MachineResponse): Promise<any | MachineDescription> => {
    debugger;
    if (tg.isVal(res)) {
      // console.log('-----', 'handling', res.kind, res.val);
      return res.val;
    }
    else
    if (tg.isAdd(res)) {
      // console.log('-----', 'handling', res.kind, Object.keys(res.operand));

      machine.desc = MachineDescriptionAdd2(
        machine.desc,
        res.operand
      );

      return machine.desc;
    }
    else
    if (tg.isSend(res)) {
      console.log('-----', 'sending', res.name, res.message);

      const eventName = res.name;
      const msg = res.message;

      if (R.has(eventName, machine.desc)) {
        let handler = machine.desc[eventName];

        if (handler instanceof Function) { // isMachineReducer
          return handleResponse(await handler(msg));
        } else {
          return handleResponse(handler);
        }
        // const result = await machine.desc[eventName](machine.desc, msg);
        // return handleResponse(result);
      } else {
        // console.log(`No handler found for ${eventName}`);
      }
    }
    else
    if (tg.isEffect(res)) {
      // console.log('-----', 'effecting', res.effect);

      return res.effect();
    }
    else
    if (tg.isSeries(res)) {
      // console.log('-----', 'handling', 'series', res.responses);
      return res.responses.reduce(async (accP: Promise<MachineResponse>, respItem: MachineResponse) => {
        const acc = await accP;

        return handleResponse(respItem);
      }, Promise.resolve());
    }
    else
    if (tg.isParallel(res)) {
      // console.log('-----', 'handling', 'parallel', res.responses);

      return Promise.all(res.responses.map(handleResponse));
    }
    else
    if (tg.isMachineResponsePromise(res)) {
      // console.log('-----', 'handling', 'promise', res);

      return handleResponse(await res);
    }
    else
    if (tg.isMachineResponseF(res)) {
      // console.log('--------', 'handling', 'function');
      return handleResponse(res());
    }
    // // console.log('-----', 'handling', 'nothing');
  };

  return machine;
};