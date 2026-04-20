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

function isPrimitiveType(type: string) {
  return ["string", "number", "boolean", "function", "symbol", "null", "undefined"].includes(type);
}

function isBooleanLiteralType(type: string) {
  return type === "true" || type === "false";
}

function isNumberLiteralType(type: string) {
  return /^-?\d+(\.\d+)?$/.test(type);
}

function isStringLiteralType(type: string) {
  return (
    (type.startsWith('"') && type.endsWith('"')) || (type.startsWith("'") && type.endsWith("'"))
  );
}

function isQuotedString(value: string) {
  return (
    (value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))
  );
}

function stripLiteralQuotes(value: string) {
  if (isQuotedString(value)) {
    return value.slice(1, -1);
  }
  return value;
}

function isLiteralUnionSchema(schemas: PropertyMetaSchema[]): schemas is string[] {
  return schemas.every(
    (schema) =>
      typeof schema === "string" &&
      ((schema.startsWith('"') && schema.endsWith('"')) ||
        (schema.startsWith("'") && schema.endsWith("'")) ||
        schema === "true" ||
        schema === "false" ||
        /^-?\d+(\.\d+)?$/.test(schema)),
  );
}

function isEnumRefSchema(schemas: PropertyMetaSchema[]): schemas is string[] {
  return schemas.every((schema) => typeof schema === "string" && schema.includes("."));
}

function isBooleanSchema(
  schemas: PropertyMetaSchema[],
): schemas is ["true", "false"] | ["false", "true"] {
  return schemas.length === 2 && schemas.includes("true") && schemas.includes("false");
}

function normalizeDefaultValue(value?: string) {
  if (value == null) {
    return undefined;
  }

  const text = value.trim();

  if (!text || text === "undefined") {
    return undefined;
  }

  if (text === "null") {
    return null;
  }

  if (text === "true") {
    return true;
  }

  if (text === "false") {
    return false;
  }

  if (/^-?\d+(\.\d+)?$/.test(text)) {
    return Number(text);
  }

  if (isQuotedString(text)) {
    return stripLiteralQuotes(text);
  }

  return text;
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
        default: normalizeDefaultValue(i.default),
        tags: i.tags ?? [],
        originalType: i.type,
        resolved: this.resolveSchema(i.schema, i.type, i.required),
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
      resolved: i.schema.map((j) =>
        this.resolveSchema(j, typeof j === "string" ? j : j.type, true),
      ),
      declarations: this.normalizeDeclarations(i.getDeclarations()),
    }));
  }

  resolveSlots(slots: SlotMeta[]): ResolvedSlot[] {
    return slots.map((i) => ({
      name: i.name,
      description: i.description,
      tags: i.tags ?? [],
      originalType: i.type,
      resolved: this.resolveSchema(i.schema, i.type, true),
      declarations: this.normalizeDeclarations(i.getDeclarations()),
    }));
  }

  resolveExposed(exposes: ExposeMeta[]): ResolvedExposed[] {
    return exposes.map((i) => ({
      name: i.name,
      description: i.description,
      tags: i.tags ?? [],
      originalType: i.type,
      resolved: this.resolveSchema(i.schema, i.type, true),
      declarations: this.normalizeDeclarations(i.getDeclarations()),
    }));
  }

  resolveSchema(
    schema: PropertyMetaSchema,
    type: string,
    required: boolean,
    depth = 0,
  ): ResolvedSchema {
    if (typeof schema === "string") {
      if (isPrimitiveType(schema)) {
        return {
          kind: "primitive",
          type: schema,
          required: schema === "undefined" ? false : required,
          nullable: schema === "null" ? true : undefined,
        };
      }

      if (isBooleanLiteralType(schema)) {
        return { kind: "primitive", type: "boolean", required };
      }

      if (isNumberLiteralType(schema)) {
        return { kind: "primitive", type: "number", required };
      }

      if (isStringLiteralType(schema)) {
        return { kind: "enum", type, required, value: [stripLiteralQuotes(schema)] };
      }

      return { kind: "unknown", type, required, value: schema };
    }

    if (depth >= this.maxDepth) {
      return this.resolveSchemaAtDepthLimit(schema, required);
    }

    if (schema.kind === "enum") {
      return this.resolveEnumSchema(schema, required, depth);
    }

    if (schema.kind === "object") {
      const rawFields = schema.schema ?? {};
      const value: Record<string, ResolvedSchema> = {};

      for (const [key, fieldMeta] of Object.entries(rawFields)) {
        value[key] = this.resolveSchema(
          fieldMeta.schema,
          fieldMeta.type,
          fieldMeta.required,
          depth + 1,
        );
      }

      return {
        kind: "object",
        type: schema.type,
        required,
        value,
      };
    }

    if (schema.kind === "array") {
      const members = (schema.schema ?? []).filter((item) => item !== "undefined");

      if (members.length === 0) {
        return {
          kind: "unknown",
          type: schema.type,
          required,
        };
      }

      if (members.length === 1) {
        return {
          kind: "array",
          type: schema.type,
          required,
          value: this.resolveSchema(
            members[0],
            typeof members[0] === "string" ? members[0] : members[0].type,
            false,
            depth + 1,
          ),
        };
      }

      return {
        kind: "array",
        type: schema.type,
        required,
        value: {
          kind: "union",
          type: schema.type,
          required: false,
          value: members.map((member) =>
            this.resolveSchema(
              member,
              typeof member === "string" ? member : member.type,
              false,
              depth + 1,
            ),
          ),
        },
      };
    }

    return {
      kind: "event",
      type: schema.type,
      required,
      value: (schema.schema ?? []).map((item) =>
        this.resolveSchema(item, typeof item === "string" ? item : item.type, true, depth + 1),
      ),
    };
  }

  private resolveEnumSchema(
    schema: Extract<PropertyMetaSchema, { kind: "enum" }>,
    required: boolean,
    depth: number,
  ): ResolvedSchema {
    if (isPrimitiveType(schema.type)) {
      return {
        kind: "primitive",
        type: schema.type,
        required,
        nullable: schema.type === "null" ? true : undefined,
      };
    }

    const rawSchemas = schema.schema ?? [];
    const hasUndefined = rawSchemas.some(
      (item) => typeof item === "string" && item === "undefined",
    );
    const hasNull = rawSchemas.some((item) => typeof item === "string" && item === "null");

    let definedSchemas = rawSchemas.filter(
      (item) => !(typeof item === "string" && (item === "undefined" || item === "null")),
    );

    const finalRequired = hasUndefined ? false : required;

    if (definedSchemas.length === 0) {
      if (hasNull) {
        return {
          kind: "primitive",
          type: "null",
          required: finalRequired,
          nullable: true,
        };
      }

      if (hasUndefined) {
        return {
          kind: "primitive",
          type: "undefined",
          required: finalRequired,
        };
      }

      return {
        kind: "unknown",
        type: schema.type,
        required: finalRequired,
      };
    }

    if (isBooleanSchema(definedSchemas)) {
      return {
        kind: "primitive",
        type: "boolean",
        required: finalRequired,
        nullable: hasNull || undefined,
      };
    }

    if (definedSchemas.length === 1) {
      const resolved = this.resolveSchema(
        definedSchemas[0],
        typeof definedSchemas[0] === "string" ? definedSchemas[0] : definedSchemas[0].type,
        finalRequired,
        depth,
      );

      return hasNull ? { ...resolved, nullable: true } : resolved;
    }

    if (isLiteralUnionSchema(definedSchemas) || isEnumRefSchema(definedSchemas)) {
      return {
        kind: "enum",
        type: schema.type,
        required: finalRequired,
        nullable: hasNull || undefined,
        value: definedSchemas.map((item) => stripLiteralQuotes(item)),
      };
    }

    const stringSchemas = definedSchemas.filter((item): item is string => typeof item === "string");

    if (
      definedSchemas.length > 2 &&
      stringSchemas.includes("true") &&
      stringSchemas.includes("false")
    ) {
      definedSchemas = definedSchemas.filter((i) => i !== "true" && i !== "false");
      definedSchemas.push("boolean");
    }

    return {
      kind: "union",
      type: schema.type,
      required: finalRequired,
      nullable: hasNull || undefined,
      value: definedSchemas.map((item) =>
        this.resolveSchema(item, typeof item === "string" ? item : item.type, false, depth + 1),
      ),
    };
  }

  private resolveSchemaAtDepthLimit(
    schema: Exclude<PropertyMetaSchema, string>,
    required: boolean,
  ): ResolvedSchema {
    if (schema.kind === "enum") {
      return this.resolveEnumSchema(schema, required, this.maxDepth);
    }

    if (schema.kind === "object") {
      return {
        kind: "object",
        type: schema.type,
        required,
        value: Object.fromEntries(
          Object.entries(schema.schema ?? {}).map(([key, fieldMeta]) => [
            key,
            this.snapshotSchema(fieldMeta.schema, fieldMeta.type, fieldMeta.required),
          ]),
        ),
      };
    }

    if (schema.kind === "array") {
      const members = (schema.schema ?? []).filter((item) => item !== "undefined");

      if (members.length === 0) {
        return {
          kind: "unknown",
          type: schema.type,
          required,
        };
      }

      if (members.length === 1) {
        return {
          kind: "array",
          type: schema.type,
          required,
          value: this.snapshotSchema(
            members[0],
            typeof members[0] === "string" ? members[0] : members[0].type,
            false,
          ),
        };
      }

      return {
        kind: "array",
        type: schema.type,
        required,
        value: {
          kind: "union",
          type: schema.type,
          required: false,
          value: members.map((member) =>
            this.snapshotSchema(member, typeof member === "string" ? member : member.type, false),
          ),
        },
      };
    }

    return {
      kind: "event",
      type: schema.type,
      required,
      value: (schema.schema ?? []).map((item) =>
        this.snapshotSchema(item, typeof item === "string" ? item : item.type, true),
      ),
    };
  }

  private snapshotSchema(
    schema: PropertyMetaSchema,
    type: string,
    required: boolean,
  ): ResolvedSchema {
    if (typeof schema === "string") {
      if (isPrimitiveType(schema)) {
        return { kind: "primitive", type: schema, required };
      }

      return { kind: "unknown", type, required, value: schema };
    }

    if (schema.kind === "enum") {
      return this.resolveEnumSchema(schema, required, this.maxDepth);
    }

    if (schema.kind === "object") {
      return {
        kind: "object",
        type: schema.type,
        required,
        value: {},
      };
    }

    if (schema.kind === "array") {
      return {
        kind: "unknown",
        type: schema.type,
        required,
      };
    }

    return {
      kind: "event",
      type: schema.type,
      required,
      value: [],
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
