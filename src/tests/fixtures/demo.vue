<!-- tests/fixtures/demo.vue -->
<script setup lang="ts">
import type { CommonProps } from "./types.ts";

const {
  color = "red",
  disabled = false,
  retryCount = 3,
  variant = "solid",
  nil = null,
} = defineProps<{ name: string; color: "red" | "green" | "blue" } & CommonProps>();

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
  <div><slot /> {{ color }}</div>
</template>
