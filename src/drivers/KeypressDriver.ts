import {Driver} from './Driver';
import {Machine} from '../state-machine/Machine';

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

type KeysToTime = {[k: string]: number};

export type GenericKeyPressedMessage = KeysToTime;
type GenericKeyPressedEvent = [
  string,
  GenericKeyPressedMessage
];
const GenericKeyPressedEvent = (codes: KeysToTime): GenericKeyPressedEvent => ([
  onKeyPressed(),
  codes
]);

export type SpecificKeyPressedMessage = number;
type SpecificKeyPressedEvent = [
  string,
  SpecificKeyPressedMessage
];
const SpecificKeyPressedEvent = (code: string, time: number): SpecificKeyPressedEvent => ([
  onKeyPressed(code),
  time
]);

export type GenericKeyUnpressedMessage = [string, number];
type GenericKeyUnpressedEvent = [
  string,
  GenericKeyUnpressedMessage
];
const GenericKeyUnpressedEvent = (code: string, time: number): GenericKeyUnpressedEvent => ([
  onKeyUnpressed(),
  [
    code,
    time
  ]
]);

export type SpecificKeyUnpressedMessage = number;
type SpecificKeyUnpressedEvent = [
  string,
  SpecificKeyUnpressedMessage
];
const SpecificKeyUnpressedEvent = (code: string, time: number): SpecificKeyUnpressedEvent => ([
  onKeyUnpressed(code),
  time
]);

const KeypressDriver = (
  keys: Array<string> = []
) => (
  machine: Machine
): Driver => {
  let shouldContinue = true;

  const keysToWatch = new Set(keys);
  const keyPresses: {[k: string]: number} = {};

  window.addEventListener('keydown', (evt: KeyboardEvent) => {
    if (keys.length === 0 || keysToWatch.has(evt.code)) {
      if (!keyPresses[evt.code]) {
        keyPresses[evt.code] = performance.now();
      }
    }
  });

  window.addEventListener('keyup', (evt: KeyboardEvent) => {
    if (keys.length === 0 || keysToWatch.has(evt.code)) {
      delete keyPresses[evt.code];

      const now = performance.now();
      machine.send(...SpecificKeyUnpressedEvent(evt.code, now));
      machine.send(...GenericKeyUnpressedEvent(evt.code, now));
    }
  });

  return {
    engage: () => {
      const onAnimationFrame = () => {
        const keysBeingPressed = Object.keys(keyPresses);

        keysBeingPressed.forEach(k => {
          machine.send(...SpecificKeyPressedEvent(k, keyPresses[k]));
        });

        if (keysBeingPressed.length > 0) {
          machine.send(...GenericKeyPressedEvent(keyPresses));
        }

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

const letters = [
  'KeyA', 'KeyB', 'KeyC', 'KeyD', 'KeyE', 'KeyF', 'KeyG', 'KeyH', 'KeyI',
  'KeyJ', 'KeyK', 'KeyL', 'KeyM', 'KeyN', 'KeyO', 'KeyP', 'KeyQ', 'KeyR',
  'KeyS', 'KeyT', 'KeyU', 'KeyV', 'KeyW', 'KeyX', 'KeyY', 'KeyZ'
];

const whitespace = [
  'Space', 'Enter'
];

export const WhitespaceDriver = KeypressDriver(whitespace);
export const LetterDriver = KeypressDriver(letters);
export default KeypressDriver;
