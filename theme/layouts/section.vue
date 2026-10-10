<script setup lang="ts">
import apBackground from '../assets/ap-background.jpg'
import apLogoColor from '../assets/ap-logo-color.png'
</script>

<template>
  <main class="ap-slide ap-title-master ap-slide-section">
    <img class="ap-title-bg" :src="apBackground" alt="" />
    <div class="ap-title-ribbon"></div>
    <img
      class="ap-title-logo"
      :src="apLogoColor"
      alt="AP Hogeschool Antwerpen"
    />
    <div class="ap-title-brand">AP.BE</div>
    <section class="ap-title-content ap-section-content">
      <slot />
    </section>
  </main>
</template>
