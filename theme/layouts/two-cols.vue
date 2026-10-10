<script setup lang="ts">
import ApFooter from '../components/ApFooter.vue'
import ApFitContent from '../components/ApFitContent.vue'
</script>

<template>
  <main class="ap-slide ap-slide-default">
    <ApFitContent>
      <div class="ap-two-cols">
        <slot />
      </div>
    </ApFitContent>
    <ApFooter
      :course="$slidev.configs.course || $slidev.configs.title"
      :chapter="$frontmatter.chapter || $slidev.configs.chapter"
      :date="$slidev.configs.apDate"
      :page="$slidev.nav.currentPage"
    />
  </main>
</template>
