/**
 * Gemini AI Configuration
 *
 * API key is read from the .env file (EXPO_PUBLIC_GEMINI_API_KEY)
 * for both local development and production.
 */

const GEMINI_API_KEY = (process.env.EXPO_PUBLIC_GEMINI_API_KEY || '').trim().replace(/^['"]|['"]$/g, '');

const GEMINI_MODEL = 'gemini-2.5-flash';

const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

/** Default generation parameters */
const DEFAULT_GENERATION_CONFIG = {
  temperature: 0.7,
  topP: 0.95,
  topK: 40,
  maxOutputTokens: 4096,
};

export {
  GEMINI_API_KEY,
  GEMINI_MODEL,
  GEMINI_API_URL,
  DEFAULT_GENERATION_CONFIG,
};
