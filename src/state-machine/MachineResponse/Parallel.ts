const R = require('ramda');

import { MachineResponse, isPlainMachineResponse } from ".";

const flattenResponses = (responses: Array<MachineResponse>): Array<MachineResponse> => {
  const retArray: Array<MachineResponse> = [];
  for (let i = 0; i < responses.length; i++) {
    const res = responses[i];
    if (isParallel(res))
      retArray.push(...res.responses);
    else
      retArray.push(res);
  }
  return retArray;
};

export type Parallel = {
  kind: 'parallel';
  responses: Array<MachineResponse>
};

export const Parallel = (...responses: Array<MachineResponse>): Parallel => ({
  kind: 'parallel',
  responses: flattenResponses(responses)
});

export const isParallel = (res: MachineResponse): res is Parallel => (
  isPlainMachineResponse(res) && res.kind === 'parallel'
);
