<script setup lang="ts">
withDefaults(defineProps<{
  pdf?: string
  notes?: string
}>(), {
  pdf: './slides.pdf',
  notes: './notes.html'
})
</script>

<template>
  <nav class="ap-resource-links" aria-label="Downloads">
    <a class="ap-resource-link" :href="pdf" target="_blank" rel="noopener">
      <span class="ap-resource-icon">PDF</span>
      <span>Download slides</span>
    </a>
    <a class="ap-resource-link" :href="notes" target="_blank" rel="noopener">
      <span class="ap-resource-icon">TXT</span>
      <span>Cursusmateriaal</span>
    </a>
  </nav>
</template>
