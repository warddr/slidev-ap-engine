<script setup lang="ts">
import ApFitContent from '../components/ApFitContent.vue'
</script>

<template>
  <main class="ap-slide ap-slide-default">
    <ApFitContent>
      <div class="ap-two-cols">
        <slot />
      </div>
    </ApFitContent>
  </main>
</template>
