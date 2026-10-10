<!-- Gewone slide zoals in de reveal-decks: wit, rode AP-driehoek linksonder,
     inhoud verticaal en horizontaal gecentreerd. -->
<script setup lang="ts">
import ApFitContent from '../components/ApFitContent.vue'
</script>

<template>
  <main class="ap-slide ap-slide-default">
    <ApFitContent>
      <slot />
    </ApFitContent>
  </main>
</template>
