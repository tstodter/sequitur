type VoidPromiseThunk = () => Promise<void>;
export const wait = (n: number): VoidPromiseThunk =>
  () => new Promise(resolve => setTimeout(resolve, n));
