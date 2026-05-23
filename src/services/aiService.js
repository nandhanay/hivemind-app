/**
 * AI Service — Gemini API Client
 *
 * Central module for all AI-powered content generation.
 * Every feature (notes, flashcards, quizzes, weak topics) calls through here.
 */
import {
  GEMINI_API_KEY,
  GEMINI_API_URL,
  DEFAULT_GENERATION_CONFIG,
} from '../config/ai';

/**
 * Call the Gemini API with a text prompt and return parsed JSON or raw text.
 *
 * @param {string} prompt         — The full prompt to send
 * @param {object} [options]
 * @param {boolean} [options.json]        — If true, attempts to parse the response as JSON
 * @param {number}  [options.temperature] — Override default temperature
 * @param {number}  [options.maxTokens]   — Override default max output tokens
 * @param {number}  [options.retries]     — Number of retries on failure (default 2)
 * @returns {Promise<{ success: boolean, data?: any, text?: string, error?: string }>}
 */
export async function generateContent(prompt, options = {}) {
  const { json = true, temperature, maxTokens, retries = 2 } = options;

  if (!GEMINI_API_KEY || GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY_HERE' || GEMINI_API_KEY.trim() === '') {
    return {
      success: false,
      error: 'Gemini API key not configured. Please paste your valid API key in the .env file under EXPO_PUBLIC_GEMINI_API_KEY.',
    };
  }

  const generationConfig = {
    ...DEFAULT_GENERATION_CONFIG,
    ...(temperature != null && { temperature }),
    ...(maxTokens != null && { maxOutputTokens: maxTokens }),
  };

  // If we want JSON output, add response_mime_type
  if (json) {
    generationConfig.responseMimeType = 'application/json';
  }

  const parts = [{ text: prompt }];
  if (options.file) {
    parts.push({
      inlineData: {
        mimeType: options.file.mimeType,
        data: options.file.data,
      },
    });
  }

  const body = {
    contents: [{ parts }],
    generationConfig,
  };

  let lastError = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        lastError = `API error ${response.status}: ${errorBody}`;

        // Don't retry on auth errors
        if (response.status === 401 || response.status === 403) {
          return { success: false, error: 'Invalid API key. Check your Gemini API key configuration.' };
        }

        // Retry on rate limit or server errors
        if (response.status === 429 || response.status >= 500) {
          await delay(1000 * (attempt + 1)); // Exponential-ish backoff
          continue;
        }

        return { success: false, error: lastError };
      }

      const result = await response.json();

      // Extract text from Gemini response
      const rawText = result?.candidates?.[0]?.content?.parts?.[0]?.text;

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
      lastError = networkError.message || 'Network error';
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

  return JSON.parse(cleaned);
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
  const fullPrompt = `${systemPrompt}\n\nUser Input:\n${userInput}`;
  return generateContent(fullPrompt, { json: true, ...options });
}
