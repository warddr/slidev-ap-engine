<!-- Pijl die een procesflow naar de volgende rij laat "omslaan" (Hugo:
     {{< snakearrow >}}): dezelfde kolommen als de cards-rij erboven, met de
     pijl onder kolom `under` (standaard de laatste). -->
<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{ text?: string, columns?: number | string, under?: number | string }>(), { text: '↓', columns: 3 })
const cols = computed(() => Number(props.columns) || 3)
const at = computed(() => Number(props.under) || cols.value)
</script>

<template>
  <div class="card-row wrap-arrow-row">
    <template v-for="i in cols" :key="i">
      <div v-if="i === at" class="wrap-arrow-cell">{{ text }}</div>
      <div v-else class="wrap-arrow-spacer" />
    </template>
  </div>
</template>
