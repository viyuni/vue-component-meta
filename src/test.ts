import path from "node:path";
import { fileURLToPath } from "node:url";
import { ComponentMetaResolver } from "./index.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const resolver = new ComponentMetaResolver({
  tsconfig: path.resolve(__dirname, "../tsconfig.json"),
  root: process.cwd(),
});

console.dir(resolver.resolveComponentMeta("./src/demo/demo.vue"), { depth: 6 });
