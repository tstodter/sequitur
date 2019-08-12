import { Blueprint } from "../Blueprint";
import { MachineResponse, isPlainMachineResponse } from ".";

export type Subtract = {
  kind: 'subtract';
  operand: Blueprint;
};

export const Subtract = (desc: Blueprint): Subtract => ({
  kind: 'subtract',
  operand: desc
});

export const isSubtract = (res: MachineResponse): res is Subtract => (
  isPlainMachineResponse(res) && res.kind === 'subtract'
);
