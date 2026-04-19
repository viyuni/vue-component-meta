import { defineConfig } from "vite-plus";

export default defineConfig({
  staged: {
    "*": "vp check --fix",
  },
  run: {
    tasks: {
      exec: {
        command: "vp exec jiti ./src/test.ts",
      },
    },
  },
  pack: {
    entry: {
      index: "src/index.ts",
      utils: "src/utils.ts",
      types: "src/types.ts",
    },
    dts: {
      tsgo: true,
    },
    exports: true,
    deps: {
      neverBundle: ["typescript"],
    },
  },
  lint: {
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  fmt: {},
});
