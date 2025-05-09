<template>
  <div>
    <h3>2. Original Image</h3>
    <img v-if="src" :src="src" alt="Original Image" width="250" />
  </div>
</template>

<script setup>
defineProps({ src: String })
</script>
