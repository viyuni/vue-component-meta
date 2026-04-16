import path from "node:path";
import { fileURLToPath } from "node:url";
import { createChecker } from "vue-component-meta";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tsconfigPath = path.resolve(__dirname, "../tsconfig.json");

export const checker = createChecker(tsconfigPath, {});

const file = path.resolve(__dirname, "../src/demo.vue");

const meta = checker.getComponentMeta(file);

for (const prop of meta.props) {
  if (prop.global) continue;

  console.log(prop.name, ":", prop.type);
  console.log("TypeObject:", prop.getTypeObject());
}
