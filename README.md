# @viyuni/vue-component-meta

`@viyuni/vue-component-meta` is a small wrapper around [`vue-component-meta`](https://github.com/vuejs/language-tools/tree/master/packages/component-meta) for resolving Vue component metadata into a simpler, easier-to-consume shape.

It keeps the power of `vue-component-meta`, while smoothing over a few rough edges for library tooling and documentation generation:

- normalized file path handling
- a stable `ComponentMetaResolver` class API
- simplified prop, event, slot, and expose metadata
- recursive schema resolution for primitives, enums, arrays, objects, and event params
- configurable depth limits when expanding nested schemas

## Install

```bash
vp add @viyuni/vue-component-meta
```

## Usage

```ts
import path from "node:path";
import { ComponentMetaResolver, TypeMeta } from "@viyuni/vue-component-meta";

const resolver = new ComponentMetaResolver({
  root: process.cwd(),
  tsconfig: path.resolve(process.cwd(), "tsconfig.json"),
  maxDepth: 2,
});

const meta = resolver.resolveComponentMeta("src/components/Button.vue");

console.dir(meta, { depth: null });
```

## API

### `new ComponentMetaResolver(options)`

Creates a resolver backed by `vue-component-meta`.

Options:

- `tsconfig`: path to the project `tsconfig.json`
- `root`: project root used to resolve relative component paths
- `checkerOptions`: raw `vue-component-meta` checker options
- `maxDepth`: maximum nested schema expansion depth, defaults to `1`

### `resolver.resolveComponentMeta(fileName, exportName?)`

Returns a `ResolvedComponentMeta` object:

```ts
interface ResolvedComponentMeta {
  file: string;
  name?: string;
  description?: string;
  type: TypeMeta;
  props: ResolvedProp[];
  events: ResolvedEvent[];
  slots: ResolvedSlot[];
  exposed: ResolvedExposed[];
}
```

Top-level fields:

- `file`: component path relative to the configured `root`
- `name`: resolved component name when available
- `description`: component-level description when available
- `type`: raw component type metadata from `vue-component-meta`

Collection fields:

- `props`
- `events`
- `slots`
- `exposed`

Each prop includes:

- `name`
- `description`
- `required`
- `default`
- `tags`
- `originalType`
- `resolved`
- `declarations`

`events`, `slots`, and `exposed` use matching normalized entry shapes too:

```ts
interface ResolvedEvent {
  name: string;
  description: string;
  tags: ResolvedTag[];
  signature: string;
  originalType: string;
  resolves: ResolvedSchema[];
  declarations: Declaration[];
}

interface ResolvedSlot {
  name: string;
  description: string;
  tags: ResolvedTag[];
  originalType: string;
  resolved: ResolvedSchema;
  declarations: Declaration[];
}

interface ResolvedExposed {
  name: string;
  description: string;
  tags: ResolvedTag[];
  originalType: string;
  resolved: ResolvedSchema;
  declarations: Declaration[];
}
```

`TypeMeta` is also re-exported from this package, so callers can type the raw `type` field without importing from `vue-component-meta` directly.

The `resolved` field uses a normalized schema shape:

```ts
interface ResolvedPrimitiveSchema {
  kind: "primitive";
  type: string;
}

interface ResolvedEnumSchema {
  kind: "enum";
  type: string;
  values: string[];
  resolved: ResolvedSchema;
}

interface ResolvedArraySchema {
  kind: "array";
  type: string;
  items: ResolvedSchema;
}

interface ResolvedObjectSchema {
  kind: "object";
  type: string;
  fields: Record<string, ResolvedSchema>;
}

interface ResolvedEventSchema {
  kind: "event";
  type: string;
  params: { index: number; resolved: ResolvedSchema }[];
}

type ResolvedSchema =
  | ResolvedPrimitiveSchema
  | ResolvedEnumSchema
  | ResolvedArraySchema
  | ResolvedObjectSchema
  | ResolvedEventSchema;
```

The `declarations` field contains the source declarations collected from `vue-component-meta`, filtered to files inside the current project root and normalized to relative paths:

```ts
interface ResolvedDeclaration {
  file: string;
  range: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
}
```

`events`, `slots`, and `exposed` entries also include `declarations`, so you can map resolved metadata back to its original source location.

### Other methods

- `resolveProps(props)`
- `resolveEvents(events)`
- `resolveSlots(slots)`
- `resolveExposed(exposes)`
- `getExportNames(componentPath)`
- `getComponentMeta(fileName, exportName?)`
- `updateFile(fileName, text)`
- `deleteFile(fileName)`
- `reload()`
- `clearCache()`
- `getProgram()`

## Why wrap `vue-component-meta`

`vue-component-meta` is powerful, but its raw schema output is a little awkward when you want to build:

- component docs
- playground controls
- design system metadata panels
- form or prop editors
- custom analysis tooling

This package turns that raw metadata into a more direct data model so downstream code can stay smaller and more predictable.

## Repository

- `https://github.com/viyuni/vue-component-meta`

## Development

```bash
vp install
vp check
vp test
vp pack
```

## CI/CD

GitHub Actions workflows are provided in [`.github/workflows/ci.yml`](/c:/Users/bycrx/MyCode/viyuni/component-meta/.github/workflows/ci.yml) and [`.github/workflows/release.yml`](/c:/Users/bycrx/MyCode/viyuni/component-meta/.github/workflows/release.yml).

- CI runs on pushes to `main` and `master`, and on pull requests
- Release runs when pushing a `v*` tag or when triggered manually from GitHub Actions
- Release publishing is configured for GitHub OIDC trusted publishing with npm provenance
- Make sure the npm package is connected to this GitHub repository in npm trusted publishing settings

## License

MIT
