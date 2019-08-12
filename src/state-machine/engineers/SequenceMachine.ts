const R = require('ramda');

import { Blueprint } from "../Blueprint";
import { MachineResponse, Series, Subtract, Add, isMachineResponseF } from "../MachineResponse";

type SequenceMachine = (
  events: Array<string>,
  handler: MachineResponse
) => Blueprint;

export const SequenceMachine: SequenceMachine = (allEvents, handler) => {
  const SeqHelper = (helperEvents: Array<string>, msgAcc: Array<any>, lastEvent?: string): Blueprint => {
    const thisMachine: Blueprint = {
      [helperEvents[0]]: async (msg: any) => {
        const msgsSoFar = msgAcc.concat(msg);

        return helperEvents.length === 1
          ? Series(
              Subtract(thisMachine),
              Add(
                SeqHelper(allEvents, [])
              ),
              isMachineResponseF(handler)
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
