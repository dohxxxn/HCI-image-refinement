<template>
  <div class="flex flex-col gap-4">
    <input
        type="text"
        v-model="prompt"
        placeholder="Enter your image prompt..."
        class="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-300"
    />
    <button
        @click="emit('generate', prompt)"
        :disabled="disabled"
        class="bg-blue-100 text-blue-700 hover:bg-blue-200 font-semibold py-2 px-4 rounded-lg transition disabled:opacity-50"
    >
      Generate Image
    </button>
  </div>
</template>

<script setup>
import { ref } from 'vue'
const prompt = ref('')
defineProps(['disabled'])
const emit = defineEmits(['generate'])
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