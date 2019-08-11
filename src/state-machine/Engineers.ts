const R = require('ramda');
import { MachineDescription } from "./MachineDescription";
import { Add, Series, MachineResponse, PlainMachineResponse, MachineResponseF, typeguards, Subtract, Try } from "./MachineResponse";
import { Machine } from "./Machine";

type SequenceMachine = (
  events: Array<string>,
  handler: MachineResponse
) => MachineDescription;

export const SequenceMachine: SequenceMachine = (allEvents, handler) => {
  const SeqHelper = (helperEvents: Array<string>, msgAcc: Array<any>, lastEvent?: string): MachineDescription => {
    const thisMachine: MachineDescription = {
      [helperEvents[0]]: async (msg: any) => {
        // const deleteLastEvent = !!lastEvent
        //   ? Add({
        //     [lastEvent]: () => {}
        //   })
        //   : undefined;

        const msgsSoFar = msgAcc.concat(msg);

        return helperEvents.length === 1
          ? Series(
              Subtract(thisMachine),
              Add(
                SeqHelper(allEvents, [])
              ),
              typeguards.isMachineResponseF(handler)
                ? await handler(msgsSoFar)
                : handler
            )
          : Series(
              Subtract(thisMachine),
              Add(
                SeqHelper(R.tail(helperEvents), msgsSoFar, msg)
              )
            );
      }
    };

    return thisMachine;
  };

  return SeqHelper(allEvents, []);
};

type FallbackMachine = (
  tryMachine: MachineDescription,
  fallback: MachineDescription
) => MachineDescription;

export const FallbackMachine: FallbackMachine = (tryMachine, fallback) => {
  return R.mergeWith(Try)(tryMachine, fallback);
};
