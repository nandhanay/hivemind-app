/**
 * Gemini AI Configuration
 *
 * API key is read from the .env file (EXPO_PUBLIC_GEMINI_API_KEY)
 * for both local development and production.
 */

const GROQ_API_KEY = (
  process.env.EXPO_PUBLIC_GROQ_API_KEY || ''
).trim().replace(/^['"]|['"]$/g, '');

const GROQ_CHAT_MODEL = process.env.EXPO_PUBLIC_GROQ_CHAT_MODEL || 'llama-3.1-8b-instant';
const GROQ_LEARNING_MODEL = process.env.EXPO_PUBLIC_GROQ_LEARNING_MODEL || 'llama-3.3-70b-versatile';
const GROQ_VISION_MODEL = process.env.EXPO_PUBLIC_GROQ_VISION_MODEL || 'llama-3.2-11b-vision-preview';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

/** Default generation parameters */
const DEFAULT_GENERATION_CONFIG = {
  temperature: 0.7,
  topP: 0.95,
  max_tokens: 4096,
  maxOutputTokens: 4096,
};

export {
  GROQ_API_KEY,
  GROQ_CHAT_MODEL,
  GROQ_LEARNING_MODEL,
  GROQ_VISION_MODEL,
  GROQ_API_URL,
  DEFAULT_GENERATION_CONFIG,
};
