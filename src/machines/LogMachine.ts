import { Blueprint } from "../state-machine/Blueprint";

export const onLog = 'log';

export const logMachine: Blueprint = {
  [onLog]: async (msg) => console.log('LOG: ', msg)
};
