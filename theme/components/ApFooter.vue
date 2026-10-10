<script setup lang="ts">
import apLogoWhite from '../assets/ap-logo-white.png'

const props = withDefaults(defineProps<{
  course?: string
  chapter?: string
  date?: string
  page?: number | string
}>(), {
  course: '',
  chapter: '',
  date: '',
  page: ''
})
</script>

<template>
  <footer class="ap-footer" aria-hidden="true">
    <div class="ap-footer-mark">
      <img :src="apLogoWhite" alt="" />
    </div>
    <div class="ap-footer-meta">
      <span v-if="props.date">{{ props.date }}</span>
      <span v-if="props.course">{{ props.course }}</span>
      <span v-if="props.chapter">{{ props.chapter }}</span>
    </div>
    <div class="ap-footer-page">{{ props.page }}</div>
  </footer>
</template>
