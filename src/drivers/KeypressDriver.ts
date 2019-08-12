import {Driver} from './Driver';
import {Machine} from '../state-machine/Machine';

export const onKeyPressed = (code?: string) => (
  !!code
    ? `onKeyPressed-${code}`
    : 'onKeyPressed'
);

export const onKeyDown = (code?: string) => (
  !!code
    ? `onKeyDown-${code}`
    : 'onKeyDown'
);

export const onKeyUp = (code?: string) => (
  !!code
    ? `onKeyUp-${code}`
    : 'onKeyUp'
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

export type GenericKeyDownMessage = [string, number];
type GenericKeyDownEvent = [
  string,
  GenericKeyDownMessage
];
const GenericKeyDownEvent = (code: string, time: number): GenericKeyDownEvent => ([
  onKeyDown(),
  [
    code,
    time
  ]
]);

export type SpecificKeyDownMessage = number;
type SpecificKeyDownEvent = [
  string,
  SpecificKeyDownMessage
];
const SpecificKeyDownEvent = (code: string, time: number): SpecificKeyDownEvent => ([
  onKeyDown(code),
  time
]);

export type GenericKeyUpMessage = [string, number];
type GenericKeyUpEvent = [
  string,
  GenericKeyUpMessage
];
const GenericKeyUpEvent = (code: string, time: number): GenericKeyUpEvent => ([
  onKeyUp(),
  [
    code,
    time
  ]
]);

export type SpecificKeyUpMessage = number;
type SpecificKeyUpEvent = [
  string,
  SpecificKeyUpMessage
];
const SpecificKeyUpEvent = (code: string, time: number): SpecificKeyUpEvent => ([
  onKeyUp(code),
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

        const now = performance.now();
        machine.send(...SpecificKeyDownEvent(evt.code, now));
        machine.send(...GenericKeyDownEvent(evt.code, now));
      }
    }
  });

  window.addEventListener('keyup', (evt: KeyboardEvent) => {
    if (keys.length === 0 || keysToWatch.has(evt.code)) {
      delete keyPresses[evt.code];

      const now = performance.now();
      machine.send(...SpecificKeyUpEvent(evt.code, now));
      machine.send(...GenericKeyUpEvent(evt.code, now));
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
