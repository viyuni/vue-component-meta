export const PRIMITIVE_ARRAY = [
  "string",
  "number",
  "boolean",
  "undefined",
  "null",
  "any",
  "unknown",
  "never",
  "void",
  "symbol",
  "bigint",
  "true",
  "false",
] as const;

export const PRIMITIVE_TYPES = new Set(PRIMITIVE_ARRAY);
