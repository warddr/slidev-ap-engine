<!-- PDF-knop (en notes.html, indien aanwezig) linksonder op de titelslide,
     zoals in de reveal-decks. De engine zet de absolute URL's in de
     headmatter (apPdf/apNotes); in de PDF zelf staan ze niet. -->
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
    <a v-if="pdf" :href="pdf" title="Download deze slides als PDF" target="_blank" rel="noopener">📄 PDF</a>
    <a v-if="notes" :href="notes" target="_blank" rel="noopener">Cursusmateriaal</a>
  </nav>
</template>
