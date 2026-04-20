import { PRIMITIVE_TYPES } from "./constants.ts";
import type { PrimitiveType } from "./types.ts";

export function isPrimitiveType(type: any): type is PrimitiveType {
  return PRIMITIVE_TYPES.has(type);
}

export function parseStringValue(value: string) {
  try {
    const parsed = JSON.parse(value);
    return typeof parsed === "string" ? parsed : value;
  } catch {
    return value;
  }
}

export function normalizedValue(value: string) {
  console.log(value);

  if (!isPrimitiveType(value)) {
    return parseStringValue(value);
  }
  if (value === "undefined") return undefined;

  if (value === "null") return null;

  if (value === "true") return true;

  if (value === "false") return false;
}
