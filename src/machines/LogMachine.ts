import { MachineDescription } from "../state-machine/MachineDescription";

export const onLog = 'log';

export const LogMachine: MachineDescription = {
  [onLog]: async (msg) => console.log('LOG: ', msg)
};