import type { Color } from "./enum.ts";
import type { BasicObject, ColorList, ColorMatrix } from "./obj.ts";

interface ExampleObject {
  foo: string;
  bar: number;
}

type StringNumberTuple = [string, number];
type StringOrNumberList = Array<string | number>;

export interface CommonProps {
  text?: string;
  color?: Color;
  string: string;
  number: number;
  boolean: boolean;
  undefined: undefined;
  null: null;
  any: any;
  unknown: unknown;
  never: never;
  void: void;
  object: {
    foo: string;
    bar: number;
    obj: { foo: string; bar: number };
    exampleObject: ExampleObject;
  };
  literalUnion: "foo" | "bar";
  symbol: symbol;
  bigint: bigint;
  basicObject: BasicObject;
  exampleObject: ExampleObject;
  primitiveTuple: [string, number, boolean];
  nameItems: [{ name: string }];
  stringNumberTuple: StringNumberTuple;
  stringOrNumberList: StringOrNumberList;
  colorList: ColorList;
  colorMatrix: ColorMatrix;
}
