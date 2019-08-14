// TODO
/*
  This machine's pretty broken. Try ['space', 'space', 'space'].
*/

const R = require('ramda');

import { MachineResponse, Series, Parallel, isMachineResponseF } from "../MachineResponse";
import { Blueprint, BlueprintAdd2 } from "../Blueprint";
import { Once } from "../MachineResponse/Once";

export const SetMachine = (
  allEvents: Array<string>,
  handler: MachineResponse
): Blueprint => {
  return allEvents.reduce((blueprintAcc: Blueprint, eventName: string) => {
    return BlueprintAdd2(blueprintAcc, {
      [eventName]: (msg: any) => {
        const receivedMsgs: {[k: string]: any} = {
          [eventName]: msg
        };

        const addToMsgs = (newEventName: string, newMsg: any) => {
          receivedMsgs[newEventName] = newMsg;
        };

        const remainingEvents = [...allEvents];
        remainingEvents.splice(remainingEvents.indexOf(eventName), 1);

        return Series(
          Parallel(
            ...remainingEvents.map(nextEvent => (
              Once(nextEvent, nextMsg => {console.log('**', msg); addToMsgs(nextEvent, nextMsg)})
            ))
          ),
          async () => {
            const msgsInOrder = allEvents.map(name => receivedMsgs[name]);

            return isMachineResponseF(handler)
              ? handler(...msgsInOrder)
              : handler;
          }
        );
      }
    });
  }, {});
};
