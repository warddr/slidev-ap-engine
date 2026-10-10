<!-- Gekleurd kaartje (Hugo: {{< card >}}): icon, value en title zijn korte
     tekstjes, de body (slot) is gewone markdown. -->
<script setup lang="ts">
import { colorClass } from '../utils/asset'

const props = defineProps<{
  color?: string
  icon?: string
  value?: string
  title?: string
  stat?: boolean
  bare?: boolean
  outline?: boolean
  width?: string
}>()
</script>

<template>
  <div
    class="card"
    :class="[colorClass(props.color), { 'card-stat': stat, 'card-bare': bare, 'card-outline': outline }]"
    :style="width ? { flex: `0 0 ${width}` } : undefined"
  >
    <div v-if="icon" class="card-icon">{{ icon }}</div>
    <div v-if="value" class="card-value">{{ value }}</div>
    <div v-if="title" class="card-title">{{ title }}</div>
    <div v-if="$slots.default" class="card-body"><slot /></div>
  </div>
</template>
