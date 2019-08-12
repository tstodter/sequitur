import { Blueprint } from "../Blueprint";
import { MachineResponse, isPlainMachineResponse } from ".";

export type Add = {
  kind: 'add';
  operand: Blueprint;
};

export const Add = (desc: Blueprint): Add => ({
  kind: 'add',
  operand: desc
});

export const isAdd = (res: MachineResponse): res is Add => (
  isPlainMachineResponse(res) && res.kind === 'add'
);
