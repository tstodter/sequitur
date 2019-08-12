const R = require('ramda');

import { MachineResponse, isPlainMachineResponse } from ".";

export type Series = {
  kind: 'series';
  responses: Array<MachineResponse>
};

export const Series = (...responses: Array<MachineResponse>): Series => ({
  kind: 'series',
  responses: R.chain((res: MachineResponse) => (
    isSeries(res)
      ? res.responses
      : res
  ))(responses)
});

export const isSeries = (res: MachineResponse): res is Series => (
  isPlainMachineResponse(res) && res.kind === 'series'
);
