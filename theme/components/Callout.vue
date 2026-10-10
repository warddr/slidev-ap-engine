<!-- Uitspringend tip-kadertje met een accentrand (Hugo: {{< callout >}}). -->
<script setup lang="ts">
import { colorClass } from '../utils/asset'

defineProps<{ color?: string }>()
</script>

<template>
  <div class="callout" :class="colorClass(color, 'orange')"><slot /></div>
</template>
