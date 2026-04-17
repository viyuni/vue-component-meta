<!-- tests/fixtures/demo.vue -->
<script setup lang="ts">
import type { CommonProps } from "./types.ts";

defineProps<{ name: string } & CommonProps>();

defineEmits<{
  (e: "click"): void;
  (e: "change", value: string): void;
}>();

defineSlots<{
  default(): void;
  header(props: { title: string }): void;
}>();

defineExpose({
  focus: () => {},
  value: "" as string,
});
</script>

<template>
  <div><slot /></div>
</template>
