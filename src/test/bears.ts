export type Bear = Readonly<{
  type: "bear";
  name: string;
  age: number;
}>;

export const yogi: Bear = {
  type: "bear",
  name: "Yogi",
  age: 36
};

export const bubu: Bear = {
  type: "bear",
  name: "Bubu",
  age: 32
};

export const dodo: Bear = {
  type: "bear",
  name: "Dodo",
  age: 34
};

export function bearToTuple(bear: Bear): [string, number] {
  return [bear.name, bear.age];
}

export function bearsToTupleSet(
  bears: readonly Bear[]
): ReadonlySet<readonly [string, number]> {
  return new Set(bears.map(bearToTuple));
}
