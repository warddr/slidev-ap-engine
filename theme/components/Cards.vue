<!-- Een rij kaartjes (Hugo: {{< cards >}}). `stack` zet ze onder elkaar. -->
<script setup lang="ts">
defineProps<{ stack?: boolean }>()
</script>

<template>
  <div class="card-row" :class="{ 'card-row-stack': stack }">
    <slot />
  </div>
</template>
