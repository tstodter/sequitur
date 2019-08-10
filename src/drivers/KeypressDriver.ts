import {Driver} from './Driver';
import {Machine} from '../event-based-state-machine/Machine';

export const onKeyDown = (code?: string) => (
  !!code
    ? `onKeyDown-${code}`
    : 'onKeyDown'
);

const keypress = (): Promise<string> => (
  new Promise(resolve => {
    const handler = (evt: KeyboardEvent) => {
      window.removeEventListener('keydown', handler);
      resolve(evt.code);
    };

    window.addEventListener('keydown', handler);
  })
);

export type GenericKeypressMessage = string;
type GenericKeypressEvent = [
  string,
  GenericKeypressMessage
];
const GenericKeypressEvent = (code: string): GenericKeypressEvent => ([
  onKeyDown(),
  code
]);

export type SpecificKeypressMessage = number;
type SpecificKeypressEvent = [
  string,
  SpecificKeypressMessage
];
const SpecificKeypressEvent = (code: string): SpecificKeypressEvent => ([
  onKeyDown(code),
  performance.now()
]);

const KeypressDriver = (
  machine: Machine
): Driver => {
  let shouldContinue = true;

  const awaitKeyPresses = async () => {
    const key = await keypress();

    Promise.all([
      machine.send(...GenericKeypressEvent(key)),
      machine.send(...SpecificKeypressEvent(key))
    ]).then(() => {
      if (key === 'Space') console.log(machine);
    });

    if (shouldContinue)
      awaitKeyPresses();
  };

  return {
    engage: () => {
      awaitKeyPresses();
    },
    stop: () => {
      shouldContinue = false;
    }
  };
};

export default KeypressDriver;