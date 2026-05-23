/**
 * Prompt templates for AI-powered flashcard generation.
 */

export const FLASHCARD_TYPES = {
  recall: 'recall',
  mcq: 'mcq',
  formula: 'formula',
  definition: 'definition',
  viva: 'viva',
};

/**
 * Generate flashcards from a topic name.
 */
export function topicFlashcardsPrompt(topic, type, count = 10) {
  const typeInstruction = getTypeInstruction(type);

  return `You are an expert study assistant. Generate exactly ${count} ${typeInstruction} flashcards for the following topic.

Topic: "${topic}"

${getFlashcardOutputFormat(type)}

Respond ONLY with valid JSON. No markdown, no explanation outside the JSON.`;
}

/**
 * Generate flashcards from provided content.
 */
export function contentFlashcardsPrompt(content, type, count = 10) {
  const typeInstruction = getTypeInstruction(type);

  return `You are an expert study assistant. Read the following content and generate exactly ${count} ${typeInstruction} flashcards based on the key concepts.

Content:
"""
${content}
"""

${getFlashcardOutputFormat(type)}

Respond ONLY with valid JSON. No markdown, no explanation outside the JSON.`;
}

function getTypeInstruction(type) {
  switch (type) {
    case FLASHCARD_TYPES.recall:
      return 'recall-based (question asks to recall a fact, answer provides the fact)';
    case FLASHCARD_TYPES.mcq:
      return 'multiple-choice (question with 4 options, one correct)';
    case FLASHCARD_TYPES.formula:
      return 'formula-based (question asks for a formula or equation, answer provides it with explanation)';
    case FLASHCARD_TYPES.definition:
      return 'definition-based (question asks "What is X?", answer provides a clear definition)';
    case FLASHCARD_TYPES.viva:
      return 'viva-style (open-ended conceptual questions requiring detailed explanation)';
    default:
      return 'recall-based';
  }
}

function getFlashcardOutputFormat(type) {
  if (type === FLASHCARD_TYPES.mcq) {
    return `Return JSON in this exact format:
{
  "flashcards": [
    {
      "question": "<question text>",
      "answer": "<correct answer>",
      "options": ["<option A>", "<option B>", "<option C>", "<option D>"],
      "correctIndex": 0,
      "difficulty": "easy|medium|hard",
      "explanation": "<why this answer is correct>"
    }
  ]
}`;
  }

  return `Return JSON in this exact format:
{
  "flashcards": [
    {
      "question": "<question text>",
      "answer": "<answer text>",
      "difficulty": "easy|medium|hard"
    }
  ]
}`;
}
