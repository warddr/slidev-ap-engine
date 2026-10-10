<!-- Links naar de PDF en (indien aanwezig) notes.html op de titelslide. De
     engine zet de absolute URL's in de headmatter (apPdf/apNotes), zodat ze
     ook kloppen vanop /<deck>/1/; in de PDF zelf staan ze niet. -->
<script setup lang="ts">
import { computed } from 'vue'
import { useNav, useSlideContext } from '@slidev/client'

const { $slidev } = useSlideContext()
const { isPrintMode } = useNav()
const pdf = computed(() => $slidev.configs.apPdf as string | undefined)
const notes = computed(() => $slidev.configs.apNotes as string | undefined)
</script>

<template>
  <nav v-if="!isPrintMode && (pdf || notes)" class="ap-resource-links" aria-label="Downloads">
    <a v-if="pdf" class="ap-resource-link" :href="pdf" target="_blank" rel="noopener">
      <span class="ap-resource-icon">PDF</span>
      <span>Download slides</span>
    </a>
    <a v-if="notes" class="ap-resource-link" :href="notes" target="_blank" rel="noopener">
      <span class="ap-resource-icon">TXT</span>
      <span>Cursusmateriaal</span>
    </a>
  </nav>
</template>
