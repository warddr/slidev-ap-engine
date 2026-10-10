<!-- Afbeelding naast tekst of kaartjes (Hugo: {{< split >}}). -->
<script setup lang="ts">
import { computed } from 'vue'
import { resolveAsset } from '../utils/asset'

const props = withDefaults(defineProps<{
  src: string
  side?: 'left' | 'right'
  width?: string
  height?: string
  position?: string
  alt?: string
}>(), { side: 'left', width: '38%', alt: '' })

const style = computed(() => ({ width: props.width, height: props.height, objectPosition: props.position }))
</script>

<template>
  <div class="split" :class="{ 'split-right': side === 'right' }">
    <img :src="resolveAsset(src)" :alt="alt" :style="style">
    <div v-if="$slots.default" class="split-content"><slot /></div>
  </div>
</template>
