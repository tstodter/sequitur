import { MachineResponse, isPlainMachineResponse } from ".";

export type Send = {
  kind: 'send';
  name: string;
  message: any;
};

export const Send = (name: string, message?: any): Send => ({
  kind: 'send',
  name,
  message
});

export const isSend = (res: MachineResponse): res is Send => (
  isPlainMachineResponse(res) && res.kind === 'send'
);
