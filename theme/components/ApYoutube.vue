<!-- YouTube-video via youtube-nocookie.com: geen tracking-cookies tot iemand
     op play drukt (de ingebouwde <Youtube> van Slidev gebruikt youtube.com).
     In de PDF staat een kader met de link: een speler kan je niet afdrukken,
     en hij zou de export laten wachten op het netwerk. -->
<script setup lang="ts">
import { useNav } from '@slidev/client'

withDefaults(defineProps<{ id: string, title?: string, width?: string }>(), { title: 'YouTube-video', width: '70%' })
const { isPrintMode } = useNav()
</script>

<template>
  <div v-if="isPrintMode" class="ap-youtube ap-youtube-print" :style="{ width }">
    <div class="ap-youtube-play">▶</div>
    <div>{{ title }}</div>
    <a :href="`https://www.youtube.com/watch?v=${id}`">youtube.com/watch?v={{ id }}</a>
  </div>
  <div v-else class="ap-youtube" :style="{ width }">
    <iframe
      :src="`https://www.youtube-nocookie.com/embed/${id}`"
      :title="title"
      frameborder="0"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      referrerpolicy="strict-origin-when-cross-origin"
      allowfullscreen
    />
  </div>
</template>
