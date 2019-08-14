import { MachineResponse, isPlainMachineResponse } from ".";

export type Once = {
  kind: 'once';
  name: string;
  handler: MachineResponse;
};

export const Once = (name: string, handler: MachineResponse): Once => ({
  kind: 'once',
  name,
  handler
});

export const isOnce = (res: MachineResponse): res is Once => (
  isPlainMachineResponse(res) && res.kind === 'once'
);
