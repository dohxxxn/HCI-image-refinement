import './style.css'

<template>
  <div class="min-h-screen bg-gray-50 px-6 py-8 md:px-10 md:py-12">
    <!-- Page Header -->
    <header class="mb-12 text-center">
      <h1 class="text-4xl font-bold text-gray-800 mb-4">Image Refinement Project</h1>
      <p class="text-lg text-gray-600 max-w-2xl mx-auto">
        This tool allows you to generate and refine images using AI prompts and keyword enhancements.
      </p>
      <p>
        Created by Do Hyun Park and Shirley Lau.
      </p>
    </header>

    <!-- Error Message -->
    <div v-if="error" class="mb-6">
      <div class="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg shadow-sm">
        <p class="font-semibold">Error:</p>
        <p>{{ error }}</p>
      </div>
    </div>

    <!-- Main Section Layout -->
    <div class="grid grid-cols-1 xl:grid-cols-4 gap-6">
      <!-- Prompt Input -->
      <div class="bg-white rounded-xl shadow-md p-6">
        <h2 class="text-lg font-semibold mb-4 text-gray-700">Enter Your Prompt</h2>
        <PromptInput @generate="handleGenerate" :disabled="isGeneratingOriginal" />
      </div>

      <!-- Original Image -->
      <div class="bg-white rounded-xl shadow-md p-6 text-center">
        <h2 class="text-lg font-semibold mb-4 text-gray-700">Original Image</h2>
        <OriginalImage :src="originalImage" :loading="isGeneratingOriginal" />
      </div>
      <!-- Keyword Selector -->
      <div class="bg-white rounded-xl shadow-md p-6">
        <h2 class="text-lg font-semibold mb-4 text-gray-700">Refine with Keywords</h2>
        <KeywordSelector
            v-if="showKeywords"
            :keywords="keywords"
            @refine="handleRefine"
            :disabled="isRefining"
        />
      </div>
      <!-- Refined Image -->
      <div class="bg-white rounded-xl shadow-md p-6 text-center">
        <h2 class="text-lg font-semibold mb-4 text-gray-700">Refined Image</h2>
        <RefinedImage :src="refinedImage" :loading="isRefining" />
      </div>


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
import { filterSimilarKeywords } from './utils/filterSimilarKeywords'

const originalImage = ref('')
const refinedImage = ref('')
const keywords = ref([])
const showKeywords = ref(false)
const isGeneratingOriginal = ref(false)
const isRefining = ref(false)
const error = ref(null)
const retryCount = ref(0)
const lastPrompt = ref('')  // store the last user prompt
const subject = ref('')


async function handleGenerate(prompt) {
  try {
    isGeneratingOriginal.value = true
    error.value = null
    retryCount.value = 0
    lastPrompt.value = prompt  // store for reuse

    console.log('OPENAI KEY:', import.meta.env.VITE_OPENAI_API_KEY)

    // Generate the initial image
    originalImage.value = await generateImage(prompt)

    // Get subject, keywords, and refined prompt
    const result = await generateRefinedImagePrompt(prompt)
    subject.value = result.subject
    console.log('Original keywords:', result.keywords)
    keywords.value = await filterSimilarKeywords(result.keywords)
    console.log('Filtered keywords:', keywords.value)
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
    isGeneratingOriginal.value = false
  }
}


async function handleRefine(selectedKeywords) {
  try {
    isRefining.value = true
    error.value = null
    // Normalize subject into word list
    const subjectWords = subject.value.toLowerCase().split(/\s+/)

    // Filter out keywords that contain any subject words
    const filteredKeywords = selectedKeywords.filter(kw => {
      const kwWords = kw.toLowerCase().split(/\s+/)
      return kwWords.every(word => !subjectWords.includes(word))
    })

    // Build a new refinement prompt using the last prompt + selected keywords
    const refinementPrompt = `${lastPrompt.value}. Make sure the image is realistic. Make the subject ${subject.value} have the following characteristics:${filteredKeywords.join(', ')}.Make sure that the result looks like how "${subject}" looks like in real life.`

    // Generate the refined image
    refinedImage.value = await generateImage(refinementPrompt)
  } catch (err) {
    error.value = `Error: ${err.message}`
    console.error('Refinement error:', err)
  } finally {
    isRefining.value = false
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
