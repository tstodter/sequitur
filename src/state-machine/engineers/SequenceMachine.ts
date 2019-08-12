const R = require('ramda');

import { Blueprint } from "../Blueprint";
import { MachineResponse, Series, Subtract, Add, isMachineResponseF } from "../MachineResponse";

type SequenceMachine = (
  isSingleton: boolean,
  events: Array<string>,
  handler: MachineResponse
) => Blueprint;

export const SequenceMachine: SequenceMachine = (isSingleton, allEvents, handler) => {
  const SeqHelper = (
    helperEvents: Array<string>,
    msgAcc: Array<any>,
    shouldCoverTracks: boolean,
    lastEvent?: string
  ): Blueprint => {
    const thisMachine: Blueprint = {
      [helperEvents[0]]: async (msg: any) => {
        console.log(msg);
        const msgsSoFar = msgAcc.concat(msg);
        // console.log(msgsSoFar);

        const thisMachineRemoval = shouldCoverTracks
          ? Subtract(thisMachine)
          : undefined;

        const sequenceRestart = isSingleton
          ? Add(
              SeqHelper(allEvents, [], isSingleton)
            )
          : undefined;

        const nextInSequence = Add(
          SeqHelper(R.tail(helperEvents), msgsSoFar, true, msg)
        );

        return helperEvents.length === 1
          ? Series(
              thisMachineRemoval,
              sequenceRestart,
              isMachineResponseF(handler)
                ? await handler(msgsSoFar)
                : handler
            )
          : Series(
              thisMachineRemoval,
              nextInSequence
            );
      }
    };

    return thisMachine;
  };

  const shouldCoverTracks = isSingleton;
  return SeqHelper(allEvents, [], shouldCoverTracks);
};

export const SingletonSequenceMachine: (events: Array<string>, handler: MachineResponse) => Blueprint = (
  (allEvents, handler) => SequenceMachine(true, allEvents, handler)
);

export const NonSingletonSequenceMachine: (events: Array<string>, handler: MachineResponse) => Blueprint = (
  (allEvents, handler) => SequenceMachine(false, allEvents, handler)
);
