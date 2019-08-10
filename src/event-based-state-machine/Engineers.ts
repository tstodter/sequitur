const R = require('ramda');
import { MachineDescription, MachineReducer } from "./MachineDescription";
import { Add, Series, Val, MachineResponse, PlainMachineResponse } from "./MachineResponse";

type ReturnType<T> = T extends (...args: any[]) => infer R ? R : any;

type SequenceReducer = (
  acc: MachineDescription,
  msgs: Array<any>
) => ReturnType<MachineReducer>;

const isSequenceReducer = (res: any): res is SequenceReducer => (
  res instanceof Function // janky but eh
);

type sequence = (
  events: Array<string>,
  handler: SequenceReducer | PlainMachineResponse
) => MachineDescription;

export const SequenceMachine: sequence = (events, handler) => {
  const SeqHelper = (events: Array<string>, msgAcc: Array<any>, lastEvent?: string): MachineDescription => ({
    [events[0]]: async (acc: MachineDescription, msg: any) => {
      let result: MachineResponse;
      if (events.length === 1) {
        result = isSequenceReducer(handler)
          ? await handler(acc, msgAcc.concat(msg))
          : handler;
      }

      return Series(
        events.length === 1
          ? Series(
              Add({
                [events[0]]: Val('deleted')
              }),
              result
            )
          : Add(SeqHelper(R.tail(events), msgAcc.concat(msg))),
        !!lastEvent
          ? Add({
            [lastEvent]: Val('deleted')
          })
          : undefined
      )
    }
  });

  return SeqHelper(events, [])
};
