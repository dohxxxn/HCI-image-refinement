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
import { generateImage, generateRefinedImagePrompt } from './api/openai'

const originalImage = ref('')
const refinedImage = ref('')
const keywords = ref([])
const showKeywords = ref(false)
const isLoading = ref(false)
const error = ref(null)
const retryCount = ref(0)
const lastPrompt = ref('')  // store the last user prompt
const subject = ref('')


async function handleGenerate(prompt) {
  try {
    isLoading.value = true
    error.value = null
    retryCount.value = 0
    lastPrompt.value = prompt  // store for reuse

    console.log('OPENAI KEY:', import.meta.env.VITE_OPENAI_API_KEY)

    // Generate the initial image
    originalImage.value = await generateImage(prompt)

    // Get subject, keywords, and refined prompt
    const result = await generateRefinedImagePrompt(prompt)
    subject.value = result.subject
    keywords.value = result.keywords
    showKeywords.value = true
    refinedImage.value = ''  // reset refined image
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
    // Normalize subject into word list
    const subjectWords = subject.value.toLowerCase().split(/\s+/)

    // Filter out keywords that contain any subject words
    const filteredKeywords = selectedKeywords.filter(kw => {
      const kwWords = kw.toLowerCase().split(/\s+/)
      return kwWords.every(word => !subjectWords.includes(word))
    })

    // Build a new refinement prompt using the last prompt + selected keywords
    const refinementPrompt = `${lastPrompt.value}. Make the subject ${subject.value} have the following characteristics:${filteredKeywords.join(', ')}.`

    // Generate the refined image
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
