import { Machine } from "../state-machine/Machine";

export type Driver = {
  engage: () => void;
  stop: () => void;
};

export type DriverConstructor = (machine: Machine) => Driver;

export const AddDrivers = (...driverCons: Array<DriverConstructor>): DriverConstructor =>
  (machine: Machine) => {
    const drivers = driverCons.map(con => con(machine));

    return {
      engage: () => {
        drivers.forEach(d => d.engage());
      },
      stop: () => {
        drivers.forEach(d => d.stop());
      }
    };
  };