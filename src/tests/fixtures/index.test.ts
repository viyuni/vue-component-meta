import path from "node:path";
import { fileURLToPath } from "node:url";

import { beforeAll, describe, expect, it } from "vite-plus/test";

import { ComponentMetaResolver } from "../../index.ts";
import type {
  ResolvedComponentMeta,
  ResolvedEvent,
  ResolvedExposed,
  ResolvedProp,
  ResolvedSchema,
  ResolvedSlot,
} from "../../types.ts";

// ── Setup ─────────────────────────────────────────────────────────────────────

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../../..");
const tsconfig = path.resolve(root, "tsconfig.json");
const fixturePath = path.resolve(__dirname, "./demo.vue");

let resolver: ComponentMetaResolver;
let meta: ResolvedComponentMeta;

beforeAll(() => {
  resolver = new ComponentMetaResolver({ tsconfig, root });
  meta = resolver.resolveComponentMeta(fixturePath);
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function prop(name: string): ResolvedProp {
  const p = meta.props.find((p) => p.name === name);
  if (!p)
    throw new Error(`Prop "${name}" not found in: ${meta.props.map((p) => p.name).join(", ")}`);
  return p;
}

function event(name: string): ResolvedEvent {
  const e = meta.events.find((e) => e.name === name);
  if (!e) throw new Error(`Event "${name}" not found`);
  return e;
}

function slot(name: string): ResolvedSlot {
  const s = meta.slots.find((s) => s.name === name);
  if (!s) throw new Error(`Slot "${name}" not found`);
  return s;
}

function exposed(name: string): ResolvedExposed {
  const e = meta.exposed.find((e) => e.name === name);
  if (!e) throw new Error(`Exposed "${name}" not found`);
  return e;
}

// ── resolveComponentMeta ──────────────────────────────────────────────────────

describe("resolveComponentMeta", () => {
  it("returns a relative file path inside root", () => {
    expect(meta.file).not.toContain(root);
    expect(meta.file).toMatch(/\.vue$/);
  });

  it("has all top-level keys", () => {
    expect(meta).toHaveProperty("props");
    expect(meta).toHaveProperty("events");
    expect(meta).toHaveProperty("slots");
    expect(meta).toHaveProperty("exposed");
  });

  it("filters out global props (class, style, etc.)", () => {
    const names = meta.props.map((p) => p.name);
    expect(names).not.toContain("class");
    expect(names).not.toContain("style");
  });
});

// ── Props: primitives ─────────────────────────────────────────────────────────

describe("props – primitives", () => {
  it("name: required string primitive", () => {
    const { required, resolved } = prop("name");
    expect(required).toBe(true);
    expect(resolved).toMatchObject({ kind: "primitive", type: "string", required: true });
  });

  it("true: literal `true` type resolves to primitive boolean", () => {
    const { resolved } = prop("true");
    expect(resolved).toMatchObject({ kind: "primitive", type: "boolean", required: true });
  });

  it("false: literal `false` type resolves to primitive boolean", () => {
    const { resolved } = prop("false");
    expect(resolved).toMatchObject({ kind: "primitive", type: "boolean", required: true });
  });

  it("nil: literal `null` type resolves to primitive null", () => {
    const { resolved } = prop("nil");
    expect(resolved).toMatchObject({ kind: "primitive", type: "null", required: true });
  });

  it("undef: literal `undefined` type resolves to primitive undefined", () => {
    const { resolved } = prop("undef");
    expect(resolved).toMatchObject({ kind: "primitive", type: "undefined", required: false });
  });
});

// ── Props: literal union / enum ───────────────────────────────────────────────

describe("props – literal unions", () => {
  it("variant: single string literal resolves to enum with one unquoted value", () => {
    const { resolved } = prop("variant");
    expect(resolved).toMatchObject({ kind: "enum", required: true });
    const r = resolved as Extract<ResolvedSchema, { kind: "enum" }>;
    expect(r.value).toEqual(["solid"]);
  });

  it("color: 'red' | 'green' | 'blue' → enum kind with unquoted values", () => {
    const { resolved } = prop("color");
    expect(resolved).toMatchObject({ kind: "enum" });
    const r = resolved as Extract<ResolvedSchema, { kind: "enum" }>;
    expect(r.value).toEqual(expect.arrayContaining(["red", "green", "blue"]));
    expect(r.value).toHaveLength(3);
  });

  it("size: optional 'sm' | 'md' | 'lg' → enum kind, required=false", () => {
    const { resolved } = prop("size");
    expect(resolved).toMatchObject({ kind: "enum", required: false });
    const r = resolved as Extract<ResolvedSchema, { kind: "enum" }>;
    expect(r.value).toEqual(expect.arrayContaining(["sm", "md", "lg"]));
  });
});

// ── Props: boolean ────────────────────────────────────────────────────────────

describe("props – boolean", () => {
  it("disabled: optional → required=false, primitive boolean", () => {
    const { resolved } = prop("disabled");
    expect(resolved).toMatchObject({ kind: "primitive", type: "boolean", required: false });
  });

  it("expandedBoolean: true | false resolves back to primitive boolean", () => {
    const { resolved } = prop("expandedBoolean");
    expect(resolved).toMatchObject({ kind: "primitive", type: "boolean", required: true });
  });

  it("loading: optional → required=false, primitive boolean", () => {
    const { resolved } = prop("loading");
    expect(resolved).toMatchObject({ kind: "primitive", type: "boolean", required: false });
  });

  it("readonly: required → required=true, primitive boolean", () => {
    const { required, resolved } = prop("readonly");
    expect(required).toBe(true);
    expect(resolved).toMatchObject({ kind: "primitive", type: "boolean", required: true });
  });

  it("retryCount: numeric literal resolves to primitive number", () => {
    const { resolved } = prop("retryCount");
    expect(resolved).toMatchObject({ kind: "primitive", type: "number", required: true });
  });
});

// ── Props: null / undefined ───────────────────────────────────────────────────

describe("props – nullish", () => {
  it("maybeLabel: string | null resolves to primitive string with nullable=true", () => {
    const { resolved } = prop("maybeLabel");
    expect(resolved).toMatchObject({
      kind: "primitive",
      type: "string",
      required: true,
      nullable: true,
    });
  });

  it("maybeName: string | undefined resolves to primitive string with required=false", () => {
    const { resolved } = prop("maybeName");
    expect(resolved).toMatchObject({ kind: "primitive", type: "string", required: false });
  });
});

// ── Props: object ─────────────────────────────────────────────────────────────

describe("props – object", () => {
  it("config: required object, resolves label field as string", () => {
    const { required, resolved } = prop("config");
    expect(required).toBe(true);
    expect(resolved).toMatchObject({ kind: "object", required: true });
    const r = resolved as Extract<ResolvedSchema, { kind: "object" }>;
    expect(r.value).toHaveProperty("label");
    expect(r.value.label).toMatchObject({ kind: "primitive", type: "string" });
  });

  it("config.nested: depth-limited at maxDepth=1, snapshotted as object with empty value", () => {
    const r = prop("config").resolved as Extract<ResolvedSchema, { kind: "object" }>;
    expect(r.value).toHaveProperty("nested");
    // snapshotSchema collapses nested object → { kind: "object", value: {} }
    expect(r.value.nested).toMatchObject({ kind: "object", value: {} });
  });

  it("options: optional Options → required=false, has name and title fields", () => {
    const { resolved } = prop("options");
    expect(resolved).toMatchObject({ kind: "object", required: false });
    const r = resolved as Extract<ResolvedSchema, { kind: "object" }>;
    expect(r.value).toHaveProperty("name");
    expect(r.value).toHaveProperty("title");
    expect(r.value.name).toMatchObject({ kind: "primitive", type: "string" });
    expect(r.value.title).toMatchObject({ kind: "primitive", type: "string" });
  });
});

// ── Props: array / tuple ──────────────────────────────────────────────────────

describe("props – array and tuple", () => {
  it("tuple [string, number, boolean]: resolves as array kind", () => {
    const { resolved } = prop("tuple");
    expect(resolved).toMatchObject({ kind: "array" });
    const r = resolved as Extract<ResolvedSchema, { kind: "array" }>;
    // Member is a union of the 3 tuple element types
    if (r.value.kind === "union") {
      const types = r.value.value.map((v) => v.type);
      expect(types).toContain("string");
      expect(types).toContain("number");
      expect(types).toContain("boolean");
    } else {
      // Degenerate case: single-type tuple collapses to that primitive
      expect(["primitive", "unknown"]).toContain(r.value.kind);
    }
  });
});

// ── Defaults ──────────────────────────────────────────────────────────────────

describe("defaults", () => {
  it("color: quoted string default is normalized without quotes", () => {
    expect(prop("color").default).toBe("red");
  });

  it("disabled: boolean default is normalized to boolean", () => {
    expect(prop("disabled").default).toBe(false);
  });

  it("retryCount: numeric default is normalized to number", () => {
    expect(prop("retryCount").default).toBe(3);
  });

  it("variant: string literal default is normalized without quotes", () => {
    expect(prop("variant").default).toBe("solid");
  });

  it("nil: null default is normalized to null", () => {
    expect(prop("nil").default).toBeNull();
  });
});

// ── Events ────────────────────────────────────────────────────────────────────

describe("events", () => {
  it("click: no parameters", () => {
    const { resolved } = event("click");
    expect(resolved).toHaveLength(0);
  });

  it("change: single string parameter", () => {
    const { resolved } = event("change");
    expect(resolved).toHaveLength(1);
    expect(resolved[0]).toMatchObject({ kind: "primitive", type: "string" });
  });
});

// ── Slots ─────────────────────────────────────────────────────────────────────

describe("slots", () => {
  it("default: slot exists", () => {
    const s = slot("default");
    expect(s.name).toBe("default");
    expect(s.resolved).toBeDefined();
  });

  it("header: receives { title: string } → object with title field", () => {
    const s = slot("header");
    expect(s.resolved).toMatchObject({ kind: "object" });
    const r = s.resolved as Extract<ResolvedSchema, { kind: "object" }>;
    expect(r.value).toHaveProperty("title");
    expect(r.value.title).toMatchObject({ kind: "primitive", type: "string" });
  });
});

// ── Exposed ───────────────────────────────────────────────────────────────────

describe("exposed", () => {
  it("focus: () => void → event kind", () => {
    const { resolved } = exposed("focus");
    expect(resolved).toMatchObject({ kind: "event" });
  });

  it("value: string → primitive string", () => {
    const { resolved } = exposed("value");
    expect(resolved).toMatchObject({ kind: "primitive", type: "string" });
  });
});

// ── Declarations ──────────────────────────────────────────────────────────────

describe("declarations", () => {
  it("all prop declarations use forward slashes", () => {
    for (const p of meta.props) {
      for (const decl of p.declarations) {
        expect(decl.file).not.toContain("\\");
      }
    }
  });

  it("all prop declarations are relative paths (not absolute)", () => {
    for (const p of meta.props) {
      for (const decl of p.declarations) {
        expect(path.isAbsolute(decl.file)).toBe(false);
      }
    }
  });

  it("CommonProps-sourced props have declarations pointing to types.ts", () => {
    const declarations = prop("disabled").declarations;
    expect(declarations.length).toBeGreaterThan(0);
    expect(declarations.some((d) => d.file.includes("types"))).toBe(true);
  });
});
