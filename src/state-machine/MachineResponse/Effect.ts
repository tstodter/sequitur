import { MachineResponse, isPlainMachineResponse } from ".";

export type Effect = {
  kind: 'effect';
  effect: () => void | Promise<void>
};

export const Effect = (effect: () => void): Effect => ({
  kind: 'effect',
  effect
});

export const isEffect = (res: MachineResponse): res is Effect => (
  isPlainMachineResponse(res) && res.kind === 'effect'
);
