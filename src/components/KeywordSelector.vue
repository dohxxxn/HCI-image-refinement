<template>
    <div>
<!--      <h3>Image Refinement</h3>-->
      <h3>If you want to refine the image, please click the keyword(s) below you want to add</h3>
      <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
        <button
          v-for="(kw, index) in keywords"
          :key="index"
          @click="toggleKeyword(kw)"
          :class="{ selected: selected.includes(kw) }"
        >
          {{ kw }}
        </button>
      </div>
      <button
          @click="refine"
          :disabled="disabled"
          class="bg-blue-100 text-blue-700 hover:bg-blue-200 font-semibold py-2 px-4 rounded-lg transition disabled:opacity-50"
      >
        Refine Image
      </button>
    </div>
  </template>
  
  <script setup>
  import { ref } from 'vue'
  const props = defineProps({ keywords: Array })
  const emit = defineEmits(['refine'])
  
  const selected = ref([])
  
  function toggleKeyword(kw) {
    if (selected.value.includes(kw)) {
      selected.value = selected.value.filter(k => k !== kw)
    } else {
      selected.value.push(kw)
    }
  }
  
  function refine() {
    emit('refine', selected.value)
  }
  </script>
  
  <style scoped>
  .selected {
    background-color: #333;
    color: white;
  }
  </style>
  