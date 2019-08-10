import {Driver} from './Driver';
import {Machine} from '../event-based-state-machine/Machine';

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

// const makeTimeStampHandler = (x: number) => async (acc: MachineDescription, msg: any): Promise<MachineResponse> => {
//   const {delta, progress} = msg as TimestepMessage;
//   // console.log(onTimeStep, x, delta, progress);

//   if (progress >= 10000) {
//     console.log('stopping', x);
//     driver.stop();
//     console.log(acc);
//   }

//   return Series([
//     wait(3000),
//     Add({
//       ['log']: async (acc, msg) => console.log('&&', msg)
//     }),
//     Send('log', [x, 'hi there travis']),
//     Series([
//       wait(3000),
//       Add({
//         ['log']: async (acc, msg) => console.log('', msg)
//       }),
//       Send('log', [x, 'hi there travis']),
//       Series([
//         wait(3000),
//         Add({
//           ['log']: async (acc, msg) => console.log('&&', msg)
//         }),
//         Send('log', [x, 'hi there travis']),
//       ])
//     ])
//   ]);
// };