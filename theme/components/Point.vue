<!-- Eén punt op een HTimeline (Hugo: {{< point >}}). -->
<script setup lang="ts">
import { colorClass } from '../utils/asset'

defineProps<{ year?: string | number, color?: string }>()
</script>

<template>
  <div class="htimeline-point">
    <div class="htimeline-year">{{ year }}</div>
    <div class="htimeline-dot" :class="colorClass(color)" />
    <div v-if="$slots.default" class="htimeline-body"><slot /></div>
  </div>
</template>
