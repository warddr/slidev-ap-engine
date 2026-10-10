<!-- Afbeelding met de opties van de Hugo-image-shortcode:
       height="300px"              → vult de rest van de slide, hoogstens 300 px
       width="60%" maxwidth="600px" → vaste breedte, gecentreerd
       geen maat                   → vult de beschikbare ruimte
       zoom of zoom="images/groot/foto.jpg" → klikken toont de (grote) foto schermvullend -->
<script setup lang="ts">
import { computed, ref } from 'vue'
import { useNav } from '@slidev/client'
import { resolveAsset } from '../utils/asset'

const props = withDefaults(defineProps<{
  src: string
  alt?: string
  width?: string
  height?: string
  maxwidth?: string
  zoom?: boolean | string
}>(), { alt: '', zoom: false })

const { isPrintMode } = useNav()
const url = computed(() => resolveAsset(props.src))
const zoomUrl = computed(() => {
  if (!props.zoom || props.zoom === 'false' || isPrintMode.value) return ''
  return props.zoom === true || props.zoom === 'true' ? url.value : resolveAsset(props.zoom)
})
const centered = computed(() => Boolean(props.maxwidth))
const imgStyle = computed(() => centered.value
  ? { width: props.width || '80%', maxWidth: props.maxwidth }
  // Een hoogte in % volgde in reveal.js de vrije ruimte; hier vult de foto die
  // ruimte altijd. Een vaste hoogte (bv. 300px) werkt wel als maximum.
  : { width: props.width, maxHeight: props.height && !props.height.endsWith('%') ? props.height : undefined })
const open = ref(false)
</script>

<template>
  <div class="ap-image" :class="centered ? 'ap-image-center' : 'ap-image-stretch'">
    <img
      :src="url"
      :alt="alt"
      :style="imgStyle"
      :class="{ 'ap-zoomable': zoomUrl }"
      @click="zoomUrl && (open = true)"
    >
    <Teleport v-if="open" to="body">
      <div class="ap-zoom-overlay" title="Klik om te sluiten" @click="open = false">
        <img :src="zoomUrl" :alt="alt">
      </div>
    </Teleport>
  </div>
</template>
