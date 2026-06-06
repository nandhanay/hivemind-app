/**
 * AI Service — Groq API Client
 *
 * Central module for all AI-powered content generation.
 * Every feature (notes, flashcards, quizzes, weak topics) calls through here.
 */
import {
  GROQ_API_KEY,
  GROQ_CHAT_MODEL,
  GROQ_LEARNING_MODEL,
  GROQ_VISION_MODEL,
  GROQ_API_URL,
  DEFAULT_GENERATION_CONFIG,
} from '../config/ai';

/**
 * Call the Groq API with a text prompt and return parsed JSON or raw text.
 *
 * @param {string} prompt         — The user prompt to send
 * @param {object} [options]
 * @param {boolean} [options.json]        — If true, attempts to parse the response as JSON
 * @param {number}  [options.temperature] — Override default temperature
 * @param {number}  [options.maxTokens]   — Override default max output tokens
 * @param {number}  [options.retries]     — Number of retries on failure (default 2)
 * @param {string}  [options.systemPrompt]— Optional system prompt for instruction
 * @param {boolean} [options.useChatModel]— If true, use llama-3.1-8b-instant
 * @param {object}  [options.file]        — Base64 file attachment for vision
 * @returns {Promise<{ success: boolean, data?: any, text?: string, error?: string }>}
 */
export async function generateContent(prompt, options = {}) {
  const { json = true, temperature, maxTokens, retries = 2, timeout = 12000 } = options;

  if (!GROQ_API_KEY || GROQ_API_KEY === 'YOUR_GROQ_API_KEY_HERE' || GROQ_API_KEY.trim() === '') {
    return {
      success: false,
      error: 'Groq API key not configured. Please paste your valid API key in the .env file under EXPO_PUBLIC_GROQ_API_KEY.',
    };
  }

  // Determine model based on options
  let model = GROQ_LEARNING_MODEL;
  if (options.useChatModel || options.model === 'llama-3.1-8b-instant') {
    model = GROQ_CHAT_MODEL;
  } else if (options.file) {
    model = GROQ_VISION_MODEL;
  }

  // Build OpenAI-style message format
  const messages = [];

  if (options.systemPrompt) {
    messages.push({
      role: 'system',
      content: options.systemPrompt,
    });
  }

  if (options.file && model === GROQ_VISION_MODEL) {
    messages.push({
      role: 'user',
      content: [
        { type: 'text', text: prompt },
        {
          type: 'image_url',
          image_url: {
            url: `data:${options.file.mimeType};base64,${options.file.data}`,
          },
        },
      ],
    });
  } else {
    messages.push({
      role: 'user',
      content: prompt,
    });
  }

  const body = {
    model,
    messages,
    temperature: temperature ?? DEFAULT_GENERATION_CONFIG.temperature,
    top_p: DEFAULT_GENERATION_CONFIG.topP,
    max_tokens: maxTokens ?? DEFAULT_GENERATION_CONFIG.max_tokens ?? 4096,
    ...(json && model !== GROQ_VISION_MODEL && { response_format: { type: 'json_object' } }),
  };

  let lastError = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!response.ok) {
        const errorBody = await response.text();
        lastError = `API error ${response.status}: ${errorBody}`;

        // Don't retry on auth errors
        if (response.status === 401 || response.status === 403) {
          return { success: false, error: 'Invalid API key. Check your Groq API key configuration.' };
        }

        // Retry on rate limit or server errors
        if (response.status === 429 || response.status >= 500) {
          await delay(1000 * (attempt + 1)); // Exponential-ish backoff
          continue;
        }

        return { success: false, error: lastError };
      }

      const result = await response.json();

      // Extract text from Groq response
      const rawText = result?.choices?.[0]?.message?.content;

      if (!rawText) {
        return { success: false, error: 'Empty response from AI.' };
      }

      if (json) {
        try {
          const parsed = parseJSONResponse(rawText);
          return { success: true, data: parsed, text: rawText };
        } catch (parseErr) {
          return { success: false, error: `Failed to parse AI response as JSON: ${parseErr.message}`, text: rawText };
        }
      }

      return { success: true, text: rawText };

    } catch (networkError) {
      clearTimeout(timer);
      lastError = networkError.name === 'AbortError' ? 'Request timed out' : (networkError.message || 'Network error');
      console.warn(`Groq API attempt ${attempt} failed: ${lastError}`);
      if (attempt < retries) {
        await delay(1000 * (attempt + 1));
        continue;
      }
    }
  }

  return { success: false, error: lastError || 'AI generation failed after retries.' };
}

/**
 * Parse a JSON response from the AI, handling common edge cases
 * (markdown code fences, trailing commas, etc.)
 */
function parseJSONResponse(text) {
  let cleaned = text.trim();

  // Strip markdown code fences if present
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }

  cleaned = cleaned.trim();

  // Robustly extract JSON object or array content to avoid leading/trailing garbage text
  const firstBrace = cleaned.indexOf('{');
  const firstBracket = cleaned.indexOf('[');
  const startIdx = (firstBrace !== -1 && firstBracket !== -1)
    ? Math.min(firstBrace, firstBracket)
    : (firstBrace !== -1 ? firstBrace : firstBracket);

  const lastBrace = cleaned.lastIndexOf('}');
  const lastBracket = cleaned.lastIndexOf(']');
  const endIdx = (lastBrace !== -1 && lastBracket !== -1)
    ? Math.max(lastBrace, lastBracket)
    : (lastBrace !== -1 ? lastBrace : lastBracket);

  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    cleaned = cleaned.substring(startIdx, endIdx + 1);
  }

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    // Attempt standard fixes for unescaped newlines inside JSON string fields:
    let fixed = cleaned.replace(/"([^"\\]*(\\.[^"\\]*)*)"/g, (match) => {
      return match.replace(/\n/g, '\\n').replace(/\r/g, '\\r');
    });
    try {
      return JSON.parse(fixed);
    } catch (err2) {
      throw err; // throw original parsing error if fallback fails
    }
  }
}

/**
 * Simple delay helper
 */
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Convenience: generate structured content with a system instruction prepended.
 */
export async function generateStructured(systemPrompt, userInput, options = {}) {
  return generateContent(userInput, { json: true, systemPrompt, ...options });
}
