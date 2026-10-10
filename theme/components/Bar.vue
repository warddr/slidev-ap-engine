<!-- Naadloze proportionele balk (Hugo: {{< bar >}}); `label`/`sublabel`
     zetten een naam vóór de balk, voor gestapelde balken. -->
<script setup lang="ts">
const props = withDefaults(defineProps<{ width?: string, label?: string, sublabel?: string }>(), { width: '85%' })
</script>

<template>
  <div class="bar" :class="{ 'bar-labeled': label }">
    <div v-if="label" class="bar-label">
      <div class="bar-label-title">{{ label }}</div>
      <div v-if="sublabel" class="bar-label-sub">{{ sublabel }}</div>
    </div>
    <div class="bar-track" :style="props.width !== 'auto' ? { width: props.width } : undefined"><slot /></div>
  </div>
</template>
