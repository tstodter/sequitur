const R = require('ramda');

import { MachineResponse, isPlainMachineResponse } from ".";

export type Parallel = {
  kind: 'parallel';
  responses: Array<MachineResponse>
};

export const Parallel = (...responses: Array<MachineResponse>): Parallel => ({
  kind: 'parallel',
  responses: R.chain((res: MachineResponse) => (
    isParallel(res)
      ? res.responses
      : res
  ))(responses)
});

export const isParallel = (res: MachineResponse): res is Parallel => (
  isPlainMachineResponse(res) && res.kind === 'parallel'
);
