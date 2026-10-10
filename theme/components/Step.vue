<!-- Eén balk in een Timeline (Hugo: {{< step >}}). -->
<script setup lang="ts">
import { colorClass } from '../utils/asset'

defineProps<{ color?: string, label?: string, icon?: string }>()
</script>

<template>
  <div class="timeline-item" :class="colorClass(color)">
    <span v-if="icon" class="timeline-icon">{{ icon }}</span>
    <span v-if="label" class="timeline-label">{{ label }}</span>
    <span v-if="$slots.default" class="timeline-body"><slot /></span>
  </div>
</template>
