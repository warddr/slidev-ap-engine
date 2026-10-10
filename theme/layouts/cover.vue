<script setup lang="ts">
import { computed } from 'vue'
import { useSlideContext } from '@slidev/client'
import PdfLink from '../components/PdfLink.vue'
import apBackground from '../assets/ap-background.jpg'
import apLogoColor from '../assets/ap-logo-color.png'

// EU-icoon voor AI-inhoud (Art. 50 AI Act) rechtsboven, aan per deck of per
// vak met `aiLabel: modified` (of generated / ai; true = modified).
const icons = import.meta.glob('../assets/ai-label/*.png', { eager: true, import: 'default' }) as Record<string, string>
const { $slidev } = useSlideContext()
const aiLabel = computed(() => {
  const value = $slidev.configs.aiLabel ?? $slidev.configs.ai_label
  if (!value) return ''
  const variant = value === true ? 'modified' : String(value)
  const icon = icons[`../assets/ai-label/${variant}.png`]
  if (!icon) console.warn(`[ap-theme] aiLabel "${variant}" bestaat niet: kies modified, generated of ai`)
  return icon || ''
})
</script>

<template>
  <main class="ap-slide ap-title-master ap-slide-cover">
    <img class="ap-title-bg" :src="apBackground" alt="" />
    <div class="ap-title-ribbon"></div>
    <img
      class="ap-title-logo"
      :src="apLogoColor"
      alt="AP Hogeschool Antwerpen"
    />
    <div class="ap-title-brand">AP.BE</div>
    <img v-if="aiLabel" class="ap-ai-label" :src="aiLabel" alt="Met AI bewerkte inhoud (EU-label)" />
    <section class="ap-title-content">
      <slot />
    </section>
    <PdfLink class="ap-cover-links" />
  </main>
</template>
