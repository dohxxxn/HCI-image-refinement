import axios from 'axios';

const API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
console.log('API Key loaded:', API_KEY ? 'Yes (length: ' + API_KEY.length + ')' : 'No');
const API_URL = 'https://api.openai.com/v1';

// Helper function to wait
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to retry with exponential backoff
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
        delay *= 2; // Exponential backoff
        continue;
      }
      throw error;
    }
  }
};

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

export const generateKeywords = async (prompt) => {
  try {
    if (!API_KEY) {
      throw new Error('OpenAI API key is not set. Please check your .env file.');
    }

    return await retryWithBackoff(async () => {
      const response = await axios.post(
        `${API_URL}/chat/completions`,
        {
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are a helpful assistant that generates relevant keywords for image refinement. Return only a JSON array of keywords.'
            },
            {
              role: 'user',
              content: `Generate 10 relevant keywords for refining this image prompt: ${prompt}`
            }
          ],
          temperature: 0.7
        },
        {
          headers: {
            'Authorization': `Bearer ${API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const content = response.data.choices[0].message.content;
      try {
        return JSON.parse(content);
      } catch (parseError) {
        console.error('Failed to parse keywords:', content);
        throw new Error('Failed to parse keywords from response');
      }
    });
  } catch (error) {
    console.error('Error details:', error.response?.data || error.message);
    throw new Error(error.response?.data?.error?.message || error.message);
  }
}; 