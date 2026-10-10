<!-- Eén kolom binnen Columns (Hugo: {{< column >}}). -->
<script setup lang="ts">
defineProps<{ width?: string }>()
</script>

<template>
  <div class="column" :style="width ? { flex: `0 0 ${width}` } : undefined"><slot /></div>
</template>
