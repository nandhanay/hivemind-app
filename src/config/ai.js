/**
 * Groq AI Configuration
 *
 * API key is read from the .env file (EXPO_PUBLIC_GROQ_API_KEY).
 * Falls back to EXPO_PUBLIC_GEMINI_API_KEY for backwards-compatibility
 * with EAS secrets that were set under the old Gemini name.
 */

// ---------------------------------------------------------------------------
// API Key — prefer GROQ key, fall back to the legacy GEMINI key name
// ---------------------------------------------------------------------------
const RAW_KEY =
  process.env.EXPO_PUBLIC_GROQ_API_KEY ||
  process.env.EXPO_PUBLIC_GEMINI_API_KEY ||
  '';

const GROQ_API_KEY = RAW_KEY.trim().replace(/^['"]|['"]$/g, '');

// ---------------------------------------------------------------------------
// Environment variable validation & startup logging
// ---------------------------------------------------------------------------
if (!GROQ_API_KEY || GROQ_API_KEY === 'YOUR_GROQ_API_KEY_HERE') {
  console.error(
    '[HiveMind] ❌ Missing Groq API key!\n' +
    '  Checked: EXPO_PUBLIC_GROQ_API_KEY and EXPO_PUBLIC_GEMINI_API_KEY\n' +
    '  AI features will be disabled until a valid key is provided.'
  );
} else {
  // Log only first/last 4 chars for security
  const masked = GROQ_API_KEY.length > 8
    ? `${GROQ_API_KEY.slice(0, 4)}...${GROQ_API_KEY.slice(-4)}`
    : '****';
  console.log(`[HiveMind] ✅ Groq API Key loaded (${masked})`);
}

const GROQ_CHAT_MODEL = process.env.EXPO_PUBLIC_GROQ_CHAT_MODEL || 'llama-3.1-8b-instant';
const GROQ_LEARNING_MODEL = process.env.EXPO_PUBLIC_GROQ_LEARNING_MODEL || 'llama-3.3-70b-versatile';
const GROQ_VISION_MODEL = process.env.EXPO_PUBLIC_GROQ_VISION_MODEL || 'llama-3.2-11b-vision-preview';

console.log(`[HiveMind] AI Models — chat: ${GROQ_CHAT_MODEL}, learning: ${GROQ_LEARNING_MODEL}, vision: ${GROQ_VISION_MODEL}`);

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
