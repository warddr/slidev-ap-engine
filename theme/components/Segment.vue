<!-- Eén segment van een Bar (Hugo: {{< segment >}}). -->
<script setup lang="ts">
import { colorClass } from '../utils/asset'

defineProps<{ color?: string, width?: string, title?: string }>()
</script>

<template>
  <div class="bar-segment" :class="colorClass(color)" :style="{ flex: width ? `0 0 ${width}` : '1' }">
    <div v-if="title" class="bar-title">{{ title }}</div>
    <div v-if="$slots.default" class="bar-body"><slot /></div>
  </div>
</template>
