<template>
  <div class="w-full flex justify-center">
    <div v-if="loading" class="text-gray-500 italic py-8">
      Generating image...
    </div>
    <div v-else-if="src">
      <img :src="src" alt="Generated image" class="rounded-lg shadow-md max-w-full h-auto" />
    </div>
    <div v-else class="text-gray-400 italic py-8">
      Your generated image will appear here.
    </div>
  </div>
</template>


<script setup>
defineProps({
  src: String,
  loading: Boolean,
})
</script>
