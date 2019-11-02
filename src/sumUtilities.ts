export type UnionType = {kind: string};

export type UnionMemberByKind<U, K> = Extract<U, { kind: K }>

export type UnionMatchObj<U extends UnionType, Ret> = {
  [K in U['kind']]: (unionMember: UnionMemberByKind<U, K>) => Ret
};

export type Merge<M extends {}, N extends {}> = {
  [P in Exclude<keyof M, keyof N>]: M[P]
} & N;

export const match = <U extends UnionType, RetT>(
  fObj: UnionMatchObj<U, RetT>
) => (
  unionVal: U
) => (
  fObj[unionVal.kind as U['kind']](unionVal as any)
);

export const matcher =
  <U extends UnionType>() =>
    <RetT>(fObj: UnionMatchObj<U, RetT>) => (
      match<U, RetT>(fObj)
    );

type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

export const makeFactory = <T extends UnionType>(kind: T['kind']) =>
  (init: PartialBy<T, 'kind'>): T => ({
    ...init,
    kind
  } as T);
