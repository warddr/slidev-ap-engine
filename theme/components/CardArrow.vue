<!-- Pijl tussen kaartjes in een procesflow (Hugo: {{< arrow >}}). -->
<script setup lang="ts">
withDefaults(defineProps<{ text?: string }>(), { text: '→' })
</script>

<template>
  <div class="card-arrow">{{ text }}</div>
</template>
