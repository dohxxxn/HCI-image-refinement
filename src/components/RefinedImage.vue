<template>
    <div>
      <h3>4. Refined Image</h3>
      <img v-if="src" :src="src" alt="Refined Image" width="250" />
    </div>
  </template>
  
  <script setup>
  defineProps({ src: String })
  </script>
  