import { type Declaration, type MetaCheckerOptions, TypeMeta } from "vue-component-meta";

export interface ResolvedSchemaBase {
  kind: string;
  type: string;
  required: boolean;
  nullable?: boolean;
}

export interface ResolvedPrimitiveSchema extends ResolvedSchemaBase {
  kind: "primitive";
}

export interface ResolvedEnumSchema extends ResolvedSchemaBase {
  kind: "enum";
  value: string[];
}

export interface ResolvedUnionSchema extends ResolvedSchemaBase {
  kind: "union";
  value: ResolvedSchema[];
}

export interface ResolvedArraySchema extends ResolvedSchemaBase {
  kind: "array";
  value: ResolvedSchema;
}

export interface ResolvedObjectSchema extends ResolvedSchemaBase {
  kind: "object";
  value: Record<string, ResolvedSchema>;
}

export interface ResolvedEventSchema extends ResolvedSchemaBase {
  kind: "event";
  value: ResolvedSchema[];
}

export interface ResolvedUnknownSchema extends ResolvedSchemaBase {
  kind: "unknown";
  value?: string;
}

export type ResolvedSchema =
  | ResolvedPrimitiveSchema
  | ResolvedEnumSchema
  | ResolvedUnionSchema
  | ResolvedArraySchema
  | ResolvedObjectSchema
  | ResolvedEventSchema
  | ResolvedUnknownSchema;

export interface ResolvedTag {
  name: string;
  text?: string;
}

export interface ResolvedProp {
  name: string;
  description: string;
  required: boolean;
  default?: string | number | boolean | null | undefined;
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
