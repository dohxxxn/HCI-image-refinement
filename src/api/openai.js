import axios from 'axios';

const API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
const API_URL = 'https://api.openai.com/v1';

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const retryWithBackoff = async (fn, maxRetries = 3, initialDelay = 1000) => {
  let retries = 0;
  let delay = initialDelay;

  while (true) {
    try {
      return await fn();
    } catch (error) {
      if (error.response?.status === 429 && retries < maxRetries) {
        console.log(`Rate limited. Retrying in ${delay}ms... (Attempt ${retries + 1}/${maxRetries})`);
        await wait(delay);
        retries++;
        delay *= 2;
        continue;
      }
      throw error;
    }
  }
};

/**
 * NEW: Generate keywords from full prompt (no subject extraction).
 */
export const generatePromptKeywords = async (prompt) => {
  const res = await retryWithBackoff(() => axios.post(
    `${API_URL}/chat/completions`,
    {
      model: 'gpt-4-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that extracts relevant visual refinement keywords from a full image description. Return a JSON array of 10 concise keywords (adjectives or short phrases) that could enhance the visual details of the scene. Respond with only the JSON array, and nothing else.'
        },
        {
          role: 'user',
          content: `Extract 10 useful visual keywords from the following image prompt to help refine its appearance:\n\n"${prompt}"`
        }
      ],
      temperature: 0.7
    },
    {
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      }
    }
  ));

  const raw = res.data.choices[0].message.content.trim();

  // Attempt direct JSON parse
  try {
    return JSON.parse(raw);
  } catch (err) {
    // Fallback: try to extract array part
    const match = raw.match(/\[.*\]/s); // match content between [ and ]
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch (innerErr) {
        console.error('Keyword fallback parse failed:', match[0]);
        throw new Error('Failed to parse keyword array from GPT response.');
      }
    }

    // Full failure
    console.error('Keyword parse error (raw response):', raw);
    throw new Error('Could not parse keywords JSON from GPT response.');
  }
};

/**
 * Build a refined prompt using selected keywords.
 */
export const refinePrompt = (originalPrompt, keywords) => {
  const list = keywords.join(', ');
  return {
    refinedPrompt: `${originalPrompt}. Make sure the image is realistic. Emphasize the following visual details: ${list}.`,
    filteredKeywords: keywords
  };
};

/**
 * New combined function.
 */
export const generateRefinedImagePrompt = async (prompt) => {
  const keywords = await generatePromptKeywords(prompt);
  const { refinedPrompt, filteredKeywords } = refinePrompt(prompt, keywords);
  return { keywords: filteredKeywords, refinedPrompt };
};

/**
 * Image generation via DALL·E 3
 */
export const generateImage = async (prompt) => {
  try {
    if (!API_KEY) {
      throw new Error('OpenAI API key is not set. Please check your .env file.');
    }

    console.log('Making request to OpenAI with prompt:', prompt);

    return await retryWithBackoff(async () => {
      const response = await axios.post(
        `${API_URL}/images/generations`,
        {
          model: "dall-e-3",
          prompt: prompt,
          n: 1,
          size: "1024x1024",
          quality: "standard",
          response_format: "url"
        },
        {
          headers: {
            'Authorization': `Bearer ${API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.data.data || !response.data.data[0]?.url) {
        throw new Error('No image URL in response');
      }

      return response.data.data[0].url;
    });
  } catch (error) {
    console.error('Full error object:', error);
    console.error('Error response:', error.response?.data);
    console.error('Error status:', error.response?.status);
    console.error('Error headers:', error.response?.headers);

    if (error.response?.status === 401) {
      throw new Error('Invalid API key. Please check your API key in the .env file.');
    } else if (error.response?.status === 429) {
      throw new Error('Rate limit exceeded. Please wait a moment before trying again.');
    } else if (error.response?.status === 400) {
      throw new Error(`Invalid request: ${JSON.stringify(error.response?.data)}`);
    } else {
      throw new Error(error.response?.data?.error?.message || error.message);
    }
  }
};
