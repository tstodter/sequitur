import {Driver} from './Driver';
import {Machine} from '../event-based-state-machine/Machine';

export const onKeyPressed = (code?: string) => (
  !!code
    ? `onKeyPressed-${code}`
    : 'onKeyPressed'
);

export const onKeyUnpressed = (code?: string) => (
  !!code
    ? `onKeyUnpressed-${code}`
    : 'onKeyUnpressed'
);

export type GenericKeypressedMessage = string;
type GenericKeypressedEvent = [
  string,
  GenericKeypressedMessage
];
const GenericKeypressedEvent = (code: string): GenericKeypressedEvent => ([
  onKeyPressed(),
  code
]);

export type SpecificKeypressedMessage = number;
type SpecificKeypressedEvent = [
  string,
  SpecificKeypressedMessage
];
const SpecificKeypressedEvent = (code: string): SpecificKeypressedEvent => ([
  onKeyPressed(code),
  performance.now()
]);

const KeypressDriver = (
  machine: Machine
): Driver => {
  let shouldContinue = true;

  const keyPresses: {[k: string]: boolean} = {};

  window.addEventListener('keydown', (evt: KeyboardEvent) => {
    keyPresses[evt.code] = true;
  });

  window.addEventListener('keyup', (evt: KeyboardEvent) => {
    delete keyPresses[evt.code];
  });

  return {
    engage: () => {
      const onAnimationFrame = () => {
        Object.keys(keyPresses).forEach(k => {
          machine.send(...SpecificKeypressedEvent(k));
        });

        if (shouldContinue) {
          window.requestAnimationFrame(onAnimationFrame);
        }
      };

      window.requestAnimationFrame(onAnimationFrame);
    },
    stop: () => {
      shouldContinue = false;
    }
  };
};

export default KeypressDriver;