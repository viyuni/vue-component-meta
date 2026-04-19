import path from "node:path";

import { normalizePath } from "unplugin-utils";
import {
  createChecker,
  type ComponentMetaChecker,
  type Declaration,
  type EventMeta,
  type ExposeMeta,
  type MetaCheckerOptions,
  type PropertyMeta,
  type PropertyMetaSchema,
  type SlotMeta,
} from "vue-component-meta";

import type {
  ComponentMetaResolverOptions,
  ResolvedComponentMeta,
  ResolvedEvent,
  ResolvedExposed,
  ResolvedProp,
  ResolvedSchema,
  ResolvedSlot,
} from "./types.ts";
import { isPrimitiveType } from "./utils.ts";

function stripUndefinedFromType(type: string) {
  return type
    .split("|")
    .map((t) => t.trim())
    .filter((t) => t !== "undefined")
    .join(" | ");
}

/**
 * 去掉字符串字面量的外层引号：`"\"foo\""` -> `"foo"`
 */
function parseEnumValue(s: PropertyMetaSchema): string {
  const raw = typeof s === "string" ? s : s.type;
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === "string" ? parsed : raw;
  } catch {
    return raw;
  }
}

function getSchemaType(schema: PropertyMetaSchema) {
  return typeof schema === "string" ? schema : schema.type;
}

function normalizeEnumValues(values: PropertyMetaSchema[] | undefined, required: boolean) {
  const normalizedValues = values?.map(parseEnumValue) ?? [];
  return required ? normalizedValues : normalizedValues.filter((value) => value !== "undefined");
}

function stripUndefinedSchemaValues(values: PropertyMetaSchema[] | undefined) {
  return (values ?? []).filter((value) => getSchemaType(value) !== "undefined");
}

function joinUniqueTypes(types: string[]) {
  return [...new Set(types)].join(" | ");
}

export class ComponentMetaResolver {
  private checker: ComponentMetaChecker;
  private tsconfig: string;
  private checkerOptions?: MetaCheckerOptions;
  private root: string;
  private maxDepth: number;

  constructor(options: ComponentMetaResolverOptions) {
    this.tsconfig = options.tsconfig;
    this.checkerOptions = options.checkerOptions ?? { schema: true };
    this.checker = createChecker(this.tsconfig, this.checkerOptions);
    this.root = options.root ?? process.cwd();
    this.maxDepth = options.maxDepth ?? 1;
  }

  normalizePath(filePath: string) {
    if (path.isAbsolute(filePath)) {
      return normalizePath(filePath);
    }

    return normalizePath(path.resolve(this.root, filePath));
  }

  toRelativePath(filePath: string) {
    return normalizePath(path.relative(this.root, filePath));
  }

  normalizeDeclarations(declarations: Declaration[]): Declaration[] {
    return declarations
      .filter((i) => path.resolve(i.file).startsWith(this.root))
      .map((i) => ({
        file: this.toRelativePath(i.file),
        range: i.range,
      }));
  }

  resolveComponentMeta(fileName: string, exportName?: string): ResolvedComponentMeta {
    const meta = this.getComponentMeta(fileName, exportName);

    return {
      file: this.toRelativePath(fileName),
      name: meta.name,
      description: meta.description,
      type: meta.type,
      props: this.resolveProps(meta.props),
      events: this.resolveEvents(meta.events),
      slots: this.resolveSlots(meta.slots),
      exposed: this.resolveExposed(meta.exposed),
    };
  }

  resolveProps(props: PropertyMeta[]): ResolvedProp[] {
    return props
      .filter((i) => !i.global)
      .map((i) => ({
        name: i.name,
        description: i.description ?? "",
        required: i.required,
        default: i.default,
        tags: i.tags ?? [],
        originalType: i.type,
        resolved: this.resolveSchema(i.schema, i.required),
        declarations: this.normalizeDeclarations(i.getDeclarations()),
      }));
  }

  resolveEvents(events: EventMeta[]): ResolvedEvent[] {
    return events.map((i) => ({
      name: i.name,
      description: i.description,
      tags: i.tags ?? [],
      signature: i.signature,
      originalType: i.type,
      resolved: i.schema.map((j) => this.resolveSchema(j)),
      declarations: this.normalizeDeclarations(i.getDeclarations()),
    }));
  }

  resolveSlots(slots: SlotMeta[]): ResolvedSlot[] {
    return slots.map((i) => ({
      name: i.name,
      description: i.description,
      tags: i.tags ?? [],
      originalType: i.type,
      resolved: this.resolveSchema(i.schema),
      declarations: this.normalizeDeclarations(i.getDeclarations()),
    }));
  }

  resolveExposed(exposes: ExposeMeta[]): ResolvedExposed[] {
    return exposes.map((i) => ({
      name: i.name,
      description: i.description,
      tags: i.tags ?? [],
      originalType: i.type,
      resolved: this.resolveSchema(i.schema),
      declarations: this.normalizeDeclarations(i.getDeclarations()),
    }));
  }

  resolveSchema(schema: PropertyMetaSchema, required = true, depth = 0): ResolvedSchema {
    if (typeof schema === "string") {
      return { kind: "primitive", type: schema };
    }

    if (depth >= this.maxDepth) {
      return this.resolveSchemaAtDepthLimit(schema, required);
    }

    if (schema.kind === "enum") {
      return this.resolvePrimitiveOrEnum(schema, required, depth);
    }

    if (schema.kind === "object") {
      const rawFields = schema.schema ?? {};
      const fields: Record<string, ResolvedSchema> = {};
      for (const [key, fieldMeta] of Object.entries(rawFields)) {
        fields[key] = this.resolveSchema(fieldMeta.schema, fieldMeta.required, depth + 1);
      }

      return {
        kind: "object",
        type: schema.type,
        fields,
      };
    }

    if (schema.kind === "array") {
      const members = schema.schema ?? [];
      return {
        kind: "array",
        type: schema.type,
        itemType: this.resolveArrayItemType(
          schema.type,
          members,
          (member) => this.resolveSchema(member, true, depth + 1),
          required,
        ),
      };
    }

    return {
      kind: "event",
      type: schema.type,
      params: (schema.schema ?? []).map((s, i) => ({
        index: i,
        type: this.resolveSchema(s, true, depth + 1),
      })),
    };
  }

  private resolvePrimitiveOrEnum(
    schema: Extract<PropertyMetaSchema, { kind: "enum" }>,
    required: boolean,
    depth: number,
  ) {
    if (isPrimitiveType(schema.type)) {
      return { kind: "primitive", type: schema.type } as const;
    }

    const normalizedMembers = required
      ? (schema.schema ?? [])
      : stripUndefinedSchemaValues(schema.schema);

    if (normalizedMembers.length === 1) {
      const [member] = normalizedMembers;
      if (typeof member !== "string" && member.kind !== "enum") {
        return this.resolveSchema(member, true, depth);
      }
    }

    if (!required) {
      const cleaned = stripUndefinedFromType(schema.type);
      if (isPrimitiveType(cleaned)) {
        return { kind: "primitive", type: cleaned } as const;
      }
    }

    return {
      kind: "enum",
      type: schema.type,
      values: normalizeEnumValues(normalizedMembers, true),
    } as const;
  }

  private resolveArrayItemType(
    arrayType: string,
    members: PropertyMetaSchema[],
    resolveMember: (schema: PropertyMetaSchema) => ResolvedSchema,
    required: boolean,
  ) {
    if (members.length === 0) {
      return { kind: "primitive", type: "unknown" } as const;
    }

    if (members.length === 1) {
      return resolveMember(members[0]);
    }

    const types = members.map(getSchemaType);
    const values = normalizeEnumValues(members, required);
    const inferredItemType = arrayType.endsWith("[]")
      ? arrayType.slice(0, -2).trim()
      : joinUniqueTypes(types);

    if (types.every((type) => isPrimitiveType(type))) {
      return {
        kind: "primitive",
        type: joinUniqueTypes(types),
      } as const;
    }

    if (values.length === members.length) {
      return {
        kind: "enum",
        type: inferredItemType,
        values,
      } as const;
    }

    return {
      kind: "primitive",
      type: joinUniqueTypes(types),
    } as const;
  }

  private resolveSchemaAtDepthLimit(
    schema: Exclude<PropertyMetaSchema, string>,
    required: boolean,
  ): ResolvedSchema {
    if (schema.kind === "enum") {
      return this.resolvePrimitiveOrEnum(schema, required, this.maxDepth);
    }

    if (schema.kind === "object") {
      const fields = Object.fromEntries(
        Object.entries(schema.schema ?? {}).map(([key, fieldMeta]) => [
          key,
          this.snapshotSchema(fieldMeta.schema, fieldMeta.required),
        ]),
      );

      return {
        kind: "object",
        type: schema.type,
        fields,
      };
    }

    if (schema.kind === "array") {
      const members = schema.schema ?? [];
      return {
        kind: "array",
        type: schema.type,
        itemType: this.resolveArrayItemAtDepthLimit(schema.type, members, required),
      };
    }

    return {
      kind: "event",
      type: schema.type,
      params: (schema.schema ?? []).map((item, index) => ({
        index,
        type: this.snapshotSchema(item, true),
      })),
    };
  }

  private resolveArrayItemAtDepthLimit(
    arrayType: string,
    members: PropertyMetaSchema[],
    required: boolean,
  ): ResolvedSchema {
    if (members.length === 0) {
      return { kind: "primitive", type: "unknown" };
    }

    if (members.length === 1) {
      return this.snapshotSchema(members[0], true);
    }

    const types = members.map(getSchemaType);
    const values = normalizeEnumValues(members, required);
    const inferredItemType = arrayType.endsWith("[]")
      ? arrayType.slice(0, -2).trim()
      : joinUniqueTypes(types);

    if (types.every((type) => isPrimitiveType(type))) {
      return {
        kind: "primitive",
        type: joinUniqueTypes(types),
      };
    }

    if (values.length === members.length) {
      return {
        kind: "enum",
        type: inferredItemType,
        values,
      };
    }

    return {
      kind: "primitive",
      type: joinUniqueTypes(types),
    };
  }

  private snapshotSchema(schema: PropertyMetaSchema, required: boolean): ResolvedSchema {
    if (typeof schema === "string") {
      return { kind: "primitive", type: schema };
    }

    if (schema.kind === "enum") {
      return this.resolvePrimitiveOrEnum(schema, required, this.maxDepth);
    }

    return {
      kind: schema.kind,
      type: schema.type,
    };
  }

  getExportNames(componentPath: string) {
    return this.checker.getExportNames(this.normalizePath(componentPath));
  }

  getComponentMeta(fileName: string, exportName?: string) {
    return this.checker.getComponentMeta(this.normalizePath(fileName), exportName);
  }

  updateFile(fileName: string, text: string) {
    this.checker.updateFile(this.normalizePath(fileName), text);
  }

  deleteFile(fileName: string) {
    this.checker.deleteFile(this.normalizePath(fileName));
  }
  reload() {
    this.checker.reload();
  }
  clearCache() {
    this.checker.clearCache();
  }
  getProgram() {
    return this.checker.getProgram();
  }
}
