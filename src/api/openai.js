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
/**
 * 1. Identify the main subject of an arbitrary prompt string.
 *    We ask GPT to return just the noun phrase that
 *    plays the starring role.
 */
export const identifyMainSubject = async (prompt) => {
  const res = await retryWithBackoff(() => axios.post(
      `${API_URL}/chat/completions`,
      {
        model: 'gpt-4-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a concise extractor: given a sentence, return only its main subject as a short noun phrase.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0
      },
      { headers: { Authorization: `Bearer ${API_KEY}` }}
  ));

  // GPT should reply with just e.g. "golden retriever puppy"
  return res.data.choices[0].message.content.trim();
};

/**
 * 2. Generate keywords *just* for that subject:
 *    we pass only the subject into the keyword prompt.
 */
export const generateSubjectKeywords = async (subject) => {
  const res = await retryWithBackoff(() => axios.post(
      `${API_URL}/chat/completions`,
      {
        model: 'gpt-4-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that generates relevant keywords for image refinement. Return only a JSON array of 10 keywords consisting of popular artistic or style keywords and keywords that make the existing description of the subject more precise.'
          },
          {
            role: 'user',
            content: `Generate 10 keywords that would help refine an image of "${subject}".`
          }
        ],
        temperature: 0.7
      },
      { headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' }}
  ));

  try {
    return JSON.parse(res.data.choices[0].message.content);
  } catch (err) {
    console.error('Keyword parse error:', res.data.choices[0].message.content);
    throw new Error('Could not parse keywords JSON');
  }
};

/**
 * 3. Combine everything into a refined prompt:
 *    “Original prompt. Make the subject <SUBJECT> focus on: kw1, kw2, …”
 */
export const refinePrompt = (originalPrompt, subject, keywords) => {
  const subjectWords = subject.toLowerCase().split(/\s+/);
  const filteredKeywords = keywords.filter(kw => {
    const kwWords = kw.toLowerCase().split(/\s+/);
    return kwWords.every(word => !subjectWords.includes(word));
  });

  const list = filteredKeywords.join(', ');
  return {
    refinedPrompt: `${originalPrompt}. Make sure the image is realistic. Make the subject ${subject} have the following characteristics: ${list}.`,
    filteredKeywords
  };
};

/**
 * Optional helper that does steps 1+2+3 in one go.
 */
export const generateRefinedImagePrompt = async (prompt) => {
  // extract main subject
  const subject = await identifyMainSubject(prompt);

  // get keywords just for subject
  const kws = await generateSubjectKeywords(subject);

  // build new prompt
  const { refinedPrompt, filteredKeywords } = refinePrompt(prompt, subject, kws);
  return { subject, keywords: filteredKeywords, refinedPrompt };
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
//
// export const generateKeywords = async (prompt) => {
//   try {
//     if (!API_KEY) {
//       throw new Error('OpenAI API key is not set. Please check your .env file.');
//     }
//
//     return await retryWithBackoff(async () => {
//       const response = await axios.post(
//         `${API_URL}/chat/completions`,
//         {
//           model: 'gpt-3.5-turbo',
//           messages: [
//             {
//               role: 'system',
//               content: 'You are a helpful assistant that generates relevant keywords for image refinement. Return only a JSON array of keywords.'
//             },
//             {
//               role: 'user',
//               content: `Generate 10 relevant keywords for refining this image prompt: ${prompt}`
//             }
//           ],
//           temperature: 0.7
//         },
//         {
//           headers: {
//             'Authorization': `Bearer ${API_KEY}`,
//             'Content-Type': 'application/json'
//           }
//         }
//       );
//
//       const content = response.data.choices[0].message.content;
//       try {
//         return JSON.parse(content);
//       } catch (parseError) {
//         console.error('Failed to parse keywords:', content);
//         throw new Error('Failed to parse keywords from response');
//       }
//     });
//   } catch (error) {
//     console.error('Error details:', error.response?.data || error.message);
//     throw new Error(error.response?.data?.error?.message || error.message);
//   }
// };