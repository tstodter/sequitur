const R = require('ramda');
import { MachineDescription } from "./MachineDescription";
import { Add, Series, Val, MachineResponse, PlainMachineResponse, MachineResponseF, typeguards } from "./MachineResponse";

type SequenceMachine = (
  events: Array<string>,
  handler: MachineResponse
) => MachineDescription;

export const SequenceMachine: SequenceMachine = (events, handler) => {
  const SeqHelper = (events: Array<string>, msgAcc: Array<any>, lastEvent?: string): MachineDescription => ({
    [events[0]]: async (msg: any) => {
      const deleteLastEvent = !!lastEvent
        ? Add({
          [lastEvent]: Val('deleted')
        })
        : undefined;

      const msgsSoFar = msgAcc.concat(msg);

      return events.length === 1
        ? Series(
            Add({
              [events[0]]: Val('deleted')
            }),
            typeguards.isMachineResponseF(handler)
              ? await handler(msgsSoFar)
              : handler,
            deleteLastEvent
          )
        : Series(
            Add(SeqHelper(R.tail(events), msgsSoFar, msg)),
            deleteLastEvent
          );
    }
  });

  return SeqHelper(events, [])
};
