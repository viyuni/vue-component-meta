import type { PRIMITIVE_ARRAY } from "./constants.ts";
import { type Declaration, type MetaCheckerOptions, TypeMeta } from "vue-component-meta";

export type PrimitiveType = (typeof PRIMITIVE_ARRAY)[number];

export interface ResolvedPrimitiveSchema {
  kind: "primitive";
  type: string;
}

export interface ResolvedEnumSchema {
  kind: "enum";
  type: string;
  values: string[];
  resolved: ResolvedSchema;
}

export interface ResolvedArraySchema {
  kind: "array";
  type: string;
  items: ResolvedSchema;
}

export interface ResolvedObjectSchema {
  kind: "object";
  type: string;
  fields: Record<string, ResolvedSchema>;
}

export interface ResolvedEventSchema {
  kind: "event";
  type: string;
  params: { index: number; resolved: ResolvedSchema }[];
}

export type ResolvedSchema =
  | ResolvedPrimitiveSchema
  | ResolvedEnumSchema
  | ResolvedArraySchema
  | ResolvedObjectSchema
  | ResolvedEventSchema;

export interface ResolvedTag {
  name: string;
  text?: string;
}

export interface ResolvedProp {
  name: string;
  description: string;
  required: boolean;
  default?: string;
  tags: ResolvedTag[];
  originalType: string;
  resolved: ResolvedSchema;
  declarations: Declaration[];
}

export interface ResolvedEvent {
  name: string;
  description: string;
  tags: ResolvedTag[];
  signature: string;
  originalType: string;
  resolved: ResolvedSchema[];
  declarations: Declaration[];
}

export interface ResolvedSlot {
  name: string;
  description: string;
  tags: ResolvedTag[];
  originalType: string;
  resolved: ResolvedSchema;
  declarations: Declaration[];
}

export interface ResolvedExposed {
  name: string;
  description: string;
  tags: ResolvedTag[];
  originalType: string;
  resolved: ResolvedSchema;
  declarations: Declaration[];
}

export interface ResolvedComponentMeta {
  file: string;
  name?: string;
  description?: string;
  type: TypeMeta;
  props: ResolvedProp[];
  events: ResolvedEvent[];
  slots: ResolvedSlot[];
  exposed: ResolvedExposed[];
}

export interface ComponentMetaResolverOptions {
  /**
   * Root directory of the project.
   */
  root?: string;

  /**
   * Path to the tsconfig file.
   */
  tsconfig: string;

  /**
   * Options for the meta checker.
   */
  checkerOptions?: MetaCheckerOptions;

  /**
   * Maximum depth of the schema resolution.
   * @default 1
   */
  maxDepth?: number;
}
