<template></template>

<script setup lang="ts">
import type { CommonProps } from "./types.ts";

defineOptions({ name: "demo" });
defineProps<{ name: string } & CommonProps>();
</script>
