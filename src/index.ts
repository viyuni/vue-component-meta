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
        resolved: this.resolveSchema(i.schema),
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

  resolveSchema(schema: PropertyMetaSchema, depth = 0): ResolvedSchema {
    if (typeof schema === "string") {
      return { kind: "primitive", type: schema };
    }

    if (depth >= this.maxDepth) {
      return this.resolveSchemaAtDepthLimit(schema);
    }

    if (schema.kind === "enum") {
      return this.resolvePrimitiveOrEnum(schema, depth);
    }

    if (schema.kind === "object") {
      const rawFields = schema.schema ?? {};
      const fields: Record<string, ResolvedSchema> = {};
      for (const [key, fieldMeta] of Object.entries(rawFields)) {
        fields[key] = this.resolveSchema(fieldMeta.schema, depth + 1);
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
        items: members.map((member) => this.resolveSchema(member, depth + 1)),
      };
    }

    return {
      kind: "event",
      type: schema.type,
      params: (schema.schema ?? []).map((s, i) => ({
        index: i,
        resolved: this.resolveSchema(s, depth + 1),
      })),
    };
  }

  private resolvePrimitiveOrEnum(
    schema: Extract<PropertyMetaSchema, { kind: "enum" }>,
    depth: number,
  ) {
    if (isPrimitiveType(schema.type)) {
      return { kind: "primitive", type: schema.type } as const;
    }

    return {
      kind: "enum",
      type: schema.type,
      values: schema.schema?.map((item) => this.resolveSchema(item, depth + 1)) ?? [],
    } as const;
  }

  private resolveSchemaAtDepthLimit(schema: Exclude<PropertyMetaSchema, string>): ResolvedSchema {
    if (schema.kind === "enum") {
      return this.resolvePrimitiveOrEnum(schema, this.maxDepth);
    }

    if (schema.kind === "object") {
      const fields = Object.fromEntries(
        Object.entries(schema.schema ?? {}).map(([key, fieldMeta]) => [
          key,
          this.snapshotSchema(fieldMeta.schema),
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
        items: members.map((member) => this.snapshotSchema(member)),
      };
    }

    return {
      kind: "event",
      type: schema.type,
      params: (schema.schema ?? []).map((item, index) => ({
        index,
        resolved: this.snapshotSchema(item),
      })),
    };
  }

  private snapshotSchema(schema: PropertyMetaSchema): ResolvedSchema {
    if (typeof schema === "string") {
      return { kind: "primitive", type: schema };
    }

    if (schema.kind === "enum") {
      return this.resolvePrimitiveOrEnum(schema, this.maxDepth);
    }

    if (schema.kind === "object") {
      return {
        kind: "object",
        type: schema.type,
        fields: {},
      };
    }

    if (schema.kind === "array") {
      return {
        kind: "array",
        type: schema.type,
        items: [],
      };
    }

    return {
      kind: "event",
      type: schema.type,
      params: [],
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
