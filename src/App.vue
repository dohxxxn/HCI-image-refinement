<template>
  <div class="container">
    <!-- Error message -->
    <div v-if="error" class="error-message">
      {{ error }}
    </div>

    <!-- 1. Prompt 입력 -->
    <div class="section">
      <PromptInput @generate="handleGenerate" :disabled="isLoading" />
    </div>

    <!-- 2. Original 이미지 -->
    <div class="section">
      <OriginalImage :src="originalImage" :loading="isLoading" />
    </div>

    <!-- 3. Refined 이미지 -->
    <div class="section">
      <RefinedImage :src="refinedImage" :loading="isLoading" />
    </div>

    <!-- 4. 키워드 선택 + 리파인 버튼 -->
    <div class="section">
      <KeywordSelector
        v-if="showKeywords"
        :keywords="keywords"
        @refine="handleRefine"
        :disabled="isLoading"
      />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import PromptInput from './components/PromptInput.vue'
import OriginalImage from './components/OriginalImage.vue'
import RefinedImage from './components/RefinedImage.vue'
import KeywordSelector from './components/KeywordSelector.vue'
import { generateImage, generateKeywords } from './api/openai'

const originalImage = ref('')
const refinedImage = ref('')
const keywords = ref([])
const showKeywords = ref(false)
const isLoading = ref(false)
const error = ref(null)
const retryCount = ref(0)

async function handleGenerate(prompt) {
  try {
    isLoading.value = true
    error.value = null
    retryCount.value = 0
    
    console.log('OPENAI KEY:', import.meta.env.VITE_OPENAI_API_KEY)

    // Generate the initial image
    originalImage.value = await generateImage(prompt)
    
    // Generate keywords for refinement
    keywords.value = await generateKeywords(prompt)
    showKeywords.value = true
    refinedImage.value = '' // Reset refined image
  } catch (err) {
    if (err.message.includes('Rate limit exceeded')) {
      error.value = `Rate limit exceeded. This is normal for new accounts. Please wait about 1 minute before trying again. (Attempt ${retryCount.value + 1}/3)`
      retryCount.value++
    } else {
      error.value = `Error: ${err.message}`
    }
    console.error('Generation error:', err)
  } finally {
    isLoading.value = false
  }
}

async function handleRefine(selectedKeywords) {
  try {
    isLoading.value = true
    error.value = null
    
    // Combine original prompt with selected keywords
    const refinementPrompt = `${selectedKeywords.join(', ')}`
    refinedImage.value = await generateImage(refinementPrompt)
  } catch (err) {
    error.value = `Error: ${err.message}`
    console.error('Refinement error:', err)
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
.container {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  padding: 2rem;
  height: 100vh;
}

.section {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  height: 100%;
}

.error-message {
  grid-column: 1 / -1;
  color: #dc3545;
  background-color: #f8d7da;
  padding: 1rem;
  border-radius: 4px;
  margin-bottom: 1rem;
}
</style>
