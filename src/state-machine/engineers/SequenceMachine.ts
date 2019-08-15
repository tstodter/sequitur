const R = require('ramda');

import { Blueprint } from "../Blueprint";
import { MachineResponse, Series, Subtract, Add, isMachineResponseF } from "../MachineResponse";
import { Machine } from "../Machine";
import { Once } from "../MachineResponse/Once";

type SequenceMachine = (
  isSingleton: boolean,
  events: Array<string>,
  handler: MachineResponse
) => Blueprint;

export const SequenceMachine: SequenceMachine = (isSingleton, allEvents, handler) => {
  const SeqHelper = (
    helperEvents: Array<string>,
    msgAcc: Array<any>,
    shouldCoverTracks: boolean
  ): Blueprint => {
    const thisMachine: Blueprint = {
      [helperEvents[0]]: async (msg: any) => {
        const msgsSoFar = msgAcc.concat(msg);

        const thisMachineRemoval = shouldCoverTracks
          ? Subtract(thisMachine)
          : undefined;

        const sequenceRestart = isSingleton
          ? Add(
              SeqHelper(allEvents, [], isSingleton)
            )
          : undefined;

        const nextInSequence = Add(
          SeqHelper(R.tail(helperEvents), msgsSoFar, true)
        );

        return helperEvents.length === 1
          ? Series(
              thisMachineRemoval,
              sequenceRestart,
              isMachineResponseF(handler)
                ? await handler(...msgsSoFar)
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

export const PreGeneratedNonSingletonSequenceMachine = (
  allEvents: Array<string>,
  handler: MachineResponse
): Blueprint => {
  return {
    [allEvents[0]]: (msg) => {
      const msgs: Array<any> = [msg];

      const addToMsgs = (newMsg: any) => {
        msgs.push(newMsg);
      };

      return Series(
        ...allEvents.slice(1).map((eventName) => (
          Once(eventName, addToMsgs)
        )),
        async () => {
          return isMachineResponseF(handler)
            ? handler(...msgs)
            : handler;
        }
      );
    }
  }
}


export const SingletonSequenceMachine: (events: Array<string>, handler: MachineResponse) => Blueprint = (
  (allEvents, handler) => SequenceMachine(true, allEvents, handler)
);

export const NonSingletonSequenceMachine: (events: Array<string>, handler: MachineResponse) => Blueprint = (
  (allEvents, handler) => SequenceMachine(false, allEvents, handler)
);
