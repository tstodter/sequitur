import { MachineResponse, PlainMachineResponse } from "./MachineResponse";

export type MachineReducer = (acc: MachineDescription, msg: any) => Promise<MachineResponse>;

export type MachineDescription = {
  [event: string]: MachineReducer | PlainMachineResponse
};

export const EmptyMachineDescription = (): MachineDescription => ({});

export const MachineDescriptionAdd2 = (
  a: MachineDescription,
  b: MachineDescription
): MachineDescription => ({
  ...a,
  ...b
});

export const MachineDescriptionAdd = (...descs: Array<MachineDescription>) => {
  return descs.reduce(MachineDescriptionAdd2);
};
