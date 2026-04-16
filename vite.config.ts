import { defineConfig } from "vite-plus";
import vueJsxVapor from "vue-jsx-vapor/vite";

export default defineConfig({
  plugins: [
    vueJsxVapor({
      macros: true,
      interop: true,
    }),
  ],
  staged: {
    "*": "vp check --fix",
  },
  run: {
    tasks: {
      exec: {
        command: "vp exec jiti ./src/index.ts",
      },
    },
  },
  pack: {
    dts: {
      tsgo: true,
    },
    exports: true,
  },
  lint: {
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  fmt: {},
});
