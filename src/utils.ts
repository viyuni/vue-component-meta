import { PRIMITIVE_TYPES } from "./constants.ts";
import type { PrimitiveType } from "./types.ts";

export function isPrimitiveType(type: any): type is PrimitiveType {
  return PRIMITIVE_TYPES.has(type);
}
