import type { Color } from "./enum.ts";

export interface BasicObject {
  foo: string;
  bar: number;
}

export type ColorList = Color[];

export type ColorMatrix = ColorList[];
