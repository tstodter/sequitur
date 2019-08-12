import {Driver} from './Driver';
import {Machine} from '../state-machine/Machine';

export const onTimeStep = 'on-time-step';

type TimestepMessage = {
  delta: number;
  progress: number;
};

type TimestepEvent = [
  'on-time-step',
  TimestepMessage
];
const TimestepEvent = (delta: number, progress: number): TimestepEvent => ([
  'on-time-step',
  {
    delta,
    progress
  }
]);

const TimestepDriver = (
  machine: Machine
): Driver => {
  let shouldContinue = true;

  return {
    engage: () => {
      let progress = 0;

      const onAnimationFrame = (lastT: number = 0) => (t: number) => {
        if (!lastT) lastT = t;

        const deltaT = t - lastT;
        progress += deltaT;

        machine.send(...TimestepEvent(deltaT, progress));

        if (shouldContinue) {
          window.requestAnimationFrame(onAnimationFrame(t));
        }
      };

      window.requestAnimationFrame(onAnimationFrame());
    },
    stop: () => {
      shouldContinue = false;
    }
  };
};

export default TimestepDriver;
