import * as use from '@tensorflow-models/universal-sentence-encoder'
import * as tf from '@tensorflow/tfjs'

let model = null

export async function loadUSEModel() {
    if (!model) {
        model = await use.load()
    }
    return model
}

export async function filterSimilarKeywords(keywords, threshold = 0.8) {
    const useModel = await loadUSEModel()
    const embeddings = await useModel.embed(keywords)
    const embedArray = await embeddings.array()

    const result = []
    const used = new Set()

    for (let i = 0; i < keywords.length; i++) {
        if (used.has(i)) continue
        result.push(keywords[i])
        for (let j = i + 1; j < keywords.length; j++) {
            const sim = cosineSimilarity(embedArray[i], embedArray[j])
            if (sim >= threshold) {
                used.add(j)
            }
        }
    }

    tf.dispose(embeddings)
    return result
}

function cosineSimilarity(a, b) {
    const dot = a.reduce((sum, val, i) => sum + val * b[i], 0)
    const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0))
    const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0))
    return dot / (magA * magB)
}
