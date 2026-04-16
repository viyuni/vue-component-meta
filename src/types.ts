import type { Color } from "./enum.ts";

export interface CommonProps {
  /**
   * @default "hello"
   */
  text?: string;

  /**
   * @default Color.Red
   */
  color?: Color;
}
