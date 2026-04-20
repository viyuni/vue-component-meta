import path from "node:path";
import { fileURLToPath } from "node:url";
import { createChecker } from "vue-component-meta";
import { describe, it, expect, beforeAll } from "vite-plus/test";
import { ComponentMetaResolver } from "../../index.ts";
import type { ResolvedProp, ResolvedSchema } from "../../types.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const fixturePath = path.resolve(__dirname, "./demo.vue");
const checker = createChecker(path.resolve(__dirname, "../../../tsconfig.json"), {
  schema: true,
});
const resolver = new ComponentMetaResolver({
  tsconfig: path.resolve(__dirname, "../../../tsconfig.json"),
  root: path.resolve(__dirname, "../../.."),
  checkerOptions: {
    schema: true,
  },
});
const shallowResolver = new ComponentMetaResolver({
  tsconfig: path.resolve(__dirname, "../../../tsconfig.json"),
  root: path.resolve(__dirname, "../../.."),
  maxDepth: 2,
  checkerOptions: {
    schema: true,
  },
});

type ComponentMeta = ReturnType<typeof checker.getComponentMeta>;

let resolved: ResolvedProp[];
let events: ComponentMeta["events"];
let slots: ComponentMeta["slots"];
let exposed: ComponentMeta["exposed"];
let resolvedMeta: ReturnType<ComponentMetaResolver["resolveComponentMeta"]>;

beforeAll(() => {
  const meta = checker.getComponentMeta(fixturePath);
  resolved = resolver.resolveProps(meta.props);
  events = meta.events;
  slots = meta.slots;
  exposed = meta.exposed;
  resolvedMeta = resolver.resolveComponentMeta(fixturePath);
});

function getProp(name: string) {
  const p = resolved.find((p) => p.name === name);
  if (!p) throw new Error(`prop "${name}" not found`);
  return p;
}

// ── primitive ────────────────────────────────────────────────────────────────

describe("primitive props", () => {
  it("name: string → primitive", () => {
    expect(getProp("name").resolved).toMatchObject<ResolvedSchema>({
      kind: "primitive",
      type: "string",
    });
  });

  it("disabled?: boolean keeps undefined in enum members", () => {
    const t = getProp("disabled").resolved;
    expect(t.kind).toBe("enum");
    if (t.kind !== "enum") throw new Error("Expected enum schema");
    expect(t.values).toEqual([
      { kind: "primitive", type: "undefined" },
      { kind: "primitive", type: "false" },
      { kind: "primitive", type: "true" },
    ]);
  });

  it("loading?: boolean keeps undefined in enum members", () => {
    const t = getProp("loading").resolved;
    expect(t.kind).toBe("enum");
    if (t.kind !== "enum") throw new Error("Expected enum schema");
    expect(t.values).toEqual([
      { kind: "primitive", type: "undefined" },
      { kind: "primitive", type: "false" },
      { kind: "primitive", type: "true" },
    ]);
  });
});

// ── enum ─────────────────────────────────────────────────────────────────────

describe("enum props", () => {
  it("size?: enum keeps undefined member", () => {
    const t = getProp("size").resolved;
    expect(t.kind).toBe("enum");
    if (t.kind !== "enum") throw new Error("Expected enum schema");
    expect(t.values).toEqual([
      { kind: "primitive", type: "undefined" },
      { kind: "primitive", type: '"sm"' },
      { kind: "primitive", type: '"md"' },
      { kind: "primitive", type: '"lg"' },
    ]);
  });
});

describe("object props", () => {
  it("config keeps first-level fields", () => {
    const t = getProp("config").resolved;
    expect(t.kind).toBe("object");
    if (t.kind !== "object") throw new Error("Expected object schema");
    expect(t.fields).toMatchObject({
      label: {
        kind: "primitive",
        type: "string",
      },
      nested: {
        kind: "object",
        fields: {
          count: {
            kind: "primitive",
            type: "number",
          },
        },
      },
    });
  });

  it("maxDepth can flatten nested objects earlier", () => {
    const meta = checker.getComponentMeta(fixturePath);
    const shallowConfig = shallowResolver
      .resolveProps(meta.props)
      .find((prop) => prop.name === "config");
    expect(shallowConfig).toBeDefined();
    expect(shallowConfig!.resolved).toMatchObject({
      kind: "object",
      fields: {
        nested: {
          kind: "object",
          type: "{ count: number; }",
          fields: {},
        },
      },
    });
    if (shallowConfig!.resolved.kind !== "object") throw new Error("Expected object schema");
    expect(shallowConfig!.resolved.fields.nested).toMatchObject({
      kind: "object",
      fields: {},
    });
  });
});

describe("array props", () => {
  it("options?: array enum keeps undefined member", () => {
    const t = getProp("options").resolved;
    expect(t.kind).toBe("enum");
    if (t.kind !== "enum") throw new Error("Expected enum schema");
    expect(t.values).toEqual([
      { kind: "primitive", type: "undefined" },
      {
        kind: "array",
        type: '("sm" | "md")[]',
        items: [
          {
            kind: "enum",
            type: '"sm" | "md"',
            values: [
              { kind: "primitive", type: '"sm"' },
              { kind: "primitive", type: '"md"' },
            ],
          },
        ],
      },
    ]);
  });

  it("tuple arrays keep per-item schemas", () => {
    const t = getProp("tuple").resolved;
    expect(t.kind).toBe("array");
    if (t.kind !== "array") throw new Error("Expected array schema");
    expect(t.items).toEqual([
      { kind: "primitive", type: "string" },
      { kind: "primitive", type: "number" },
      { kind: "primitive", type: "boolean" },
    ]);
  });
});

describe("default values", () => {
  it("keeps enum string defaults untouched", () => {
    expect(getProp("color").default).toBe('"red"');
  });

  it("keeps props without defaults as undefined", () => {
    expect(getProp("name").default).toBeUndefined();
  });
});

describe("resolveComponentMeta", () => {
  it("matches the per-section resolvers for props", () => {
    expect(resolvedMeta.props).toEqual(resolved);
  });

  it("resolves event payload schemas", () => {
    const change = resolvedMeta.events.find((event) => event.name === "change");
    expect(change?.resolved).toEqual([
      {
        kind: "primitive",
        type: "string",
      },
    ]);
  });

  it("resolves slot payload schemas", () => {
    const header = resolvedMeta.slots.find((slot) => slot.name === "header");
    expect(header?.resolved).toMatchObject({
      kind: "object",
      fields: {
        title: {
          kind: "primitive",
          type: "string",
        },
      },
    });
  });

  it("resolves exposed members", () => {
    const focus = resolvedMeta.exposed.find((item) => item.name === "focus");
    const value = resolvedMeta.exposed.find((item) => item.name === "value");
    expect(focus?.resolved).toMatchObject({
      kind: "event",
      params: [],
    });
    expect(value?.resolved).toMatchObject({
      kind: "primitive",
      type: "string",
    });
  });
});

// ── emits ────────────────────────────────────────────────────────────────────

describe("emits", () => {
  it("click event exists", () => {
    expect(events.find((e) => e.name === "click")).toBeDefined();
  });

  it("change event exists", () => {
    expect(events.find((e) => e.name === "change")).toBeDefined();
  });
});

// ── slots ────────────────────────────────────────────────────────────────────

describe("slots", () => {
  it("default slot exists", () => {
    expect(slots.find((s) => s.name === "default")).toBeDefined();
  });

  it("header slot exists with title prop", () => {
    const header = slots.find((s) => s.name === "header");
    expect(header).toBeDefined();
    const schema = header!.schema as any;
    expect(schema?.schema).toHaveProperty("title");
  });
});

// ── expose ───────────────────────────────────────────────────────────────────

describe("expose", () => {
  it("focus is exposed", () => {
    expect(exposed.find((e) => e.name === "focus")).toBeDefined();
  });

  it("value is exposed as string", () => {
    const val = exposed.find((e) => e.name === "value");
    expect(val).toBeDefined();
    expect(val!.type).toContain("string");
  });
});
