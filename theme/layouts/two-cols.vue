<script setup lang="ts">
import ApFooter from '../components/ApFooter.vue'
</script>

<template>
  <main class="ap-slide ap-slide-default">
    <section class="ap-content ap-two-cols">
      <slot />
    </section>
    <ApFooter
      :course="$slidev.configs.course || $slidev.configs.title"
      :chapter="$frontmatter.chapter || $frontmatter.title"
      :date="$slidev.configs.apDate || $frontmatter.date"
      :page="$slidev.nav.currentPage"
    />
  </main>
</template>
