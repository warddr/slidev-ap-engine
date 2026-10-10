<!-- Inhoudsvlak van een slide. Loopt de inhoud toch over (lange lijst, grote
     tabel), dan wordt ze proportioneel verkleind tot ze past — op het scherm
     en in de PDF. Zo loopt er nooit inhoud van de slide af en komt er geen extra
     PDF-pagina. In de console staat welke slide verkleind werd. -->
<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useSlideContext } from '@slidev/client'

const { $page } = useSlideContext()
const box = ref<HTMLElement>()
const inner = ref<HTMLElement>()
let observer: ResizeObserver | undefined
let reported = 0

function fit() {
  const el = inner.value
  const available = box.value?.clientHeight || 0
  if (!el || !available) return
  el.style.zoom = ''
  const needed = el.scrollHeight
  if (needed <= available + 1) return
  const scale = Math.max(0.5, available / needed)
  el.style.zoom = String(scale)
  if (Math.abs(reported - scale) > 0.01) {
    reported = scale
    console.warn(`[ap-theme] slide ${$page.value} is te vol: verkleind tot ${Math.round(scale * 100)} %`)
  }
}

onMounted(() => {
  observer = new ResizeObserver(() => fit())
  if (box.value) observer.observe(box.value)
  if (inner.value) observer.observe(inner.value)
  fit()
})
onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <section ref="box" class="ap-content">
    <div ref="inner" class="ap-content-inner">
      <slot />
    </div>
  </section>
</template>
