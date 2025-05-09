<template>
    <div>
      <h3>1. Enter a prompt</h3>
      <input v-model="prompt" type="text" placeholder="e.g. A futuristic city at night" />
      <button @click="onGenerate">Generate Image</button>
    </div>
  </template>
  
  <script setup>
  import { ref } from 'vue'
  
  const prompt = ref('')
  const emit = defineEmits(['generate'])
  
  function onGenerate() {
    if (prompt.value.trim()) {
      emit('generate', prompt.value)
    }
  }
  </script>

<style scoped>
.prompt-input {
  width: 100%;
  height: 100%;
  font-size: 16px;
  padding: 8px 12px;
  border: 1px solid #ccc;
  border-radius: 4px;
  margin-bottom: 1rem;
}
</style>