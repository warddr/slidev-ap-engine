<!-- Geluidsfragment met afspeelknop (Hugo: {{< audio >}}). -->
<script setup lang="ts">
import { resolveAsset } from '../utils/asset'

defineProps<{ src: string, caption?: string }>()
</script>

<template>
  <div class="audio-player">
    <audio controls :src="resolveAsset(src)" />
    <div v-if="caption || $slots.default" class="caption"><slot>{{ caption }}</slot></div>
  </div>
</template>
