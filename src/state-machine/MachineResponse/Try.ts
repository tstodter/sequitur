import { MachineResponse, isPlainMachineResponse } from ".";

export type Try = {
  kind: 'try';
  try: MachineResponse;
  failure: MachineResponse;
};

export const Try = (toTry: MachineResponse, onFailure: MachineResponse): Try => ({
  kind: 'try',
  try: toTry,
  failure: onFailure
});

export const isTry = (res: MachineResponse): res is Try => (
  isPlainMachineResponse(res) && res.kind === 'try'
);
