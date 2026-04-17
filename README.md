# @viyuni/component-meta

`@viyuni/component-meta` is a small wrapper around [`vue-component-meta`](https://github.com/vuejs/language-tools/tree/master/packages/component-meta) for resolving Vue component metadata into a simpler, easier-to-consume shape.

It keeps the power of `vue-component-meta`, while smoothing over a few rough edges for library tooling and documentation generation:

- normalized file path handling
- a stable `ComponentMetaResolver` class API
- simplified prop, event, slot, and expose metadata
- recursive schema resolution for primitives, enums, arrays, objects, and event params
- configurable depth limits when expanding nested schemas

## Install

```bash
vp add @viyuni/component-meta
```

## Usage

```ts
import path from "node:path";
import { ComponentMetaResolver } from "@viyuni/component-meta";

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

Returns normalized metadata for:

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
- `resolve`

The `resolve` field uses a normalized schema shape:

```ts
interface ResolvedSchema {
  kind: "primitive" | "enum" | "array" | "object" | "event";
  type: string;
  values?: string[];
  fields?: Record<string, ResolvedSchema>;
  itemType?: ResolvedSchema;
  params?: { index: number; type: ResolvedSchema }[];
}
```

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

The project is currently hosted at:

- `https://github.com/YanChenBai/component-meta`

It is planned to move to:

- `https://github.com/viyuni/component-meta`

Package metadata is already aligned with the future `viyuni` namespace.

## Development

```bash
vp install
vp check
vp test
vp pack
```

## License

MIT
