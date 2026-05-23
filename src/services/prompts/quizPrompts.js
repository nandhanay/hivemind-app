/**
 * Prompt templates for AI-powered quiz generation.
 */

export const QUIZ_TYPES = {
  mcq: 'mcq',
  trueFalse: 'true_false',
  shortAnswer: 'short_answer',
  mixed: 'mixed',
};

/**
 * Generate a quiz from a topic name.
 */
export function topicQuizPrompt(topic, quizType, count = 10, difficulty = 'mixed') {
  const typeInstruction = getQuizTypeInstruction(quizType);
  const diffInstruction = difficulty === 'mixed'
    ? 'Mix easy, medium, and hard questions.'
    : `All questions should be ${difficulty} difficulty.`;

  return `You are an expert quiz maker. Generate exactly ${count} ${typeInstruction} questions about the following topic.

Topic: "${topic}"
${diffInstruction}

${getQuizOutputFormat(quizType)}

Respond ONLY with valid JSON. No markdown, no explanation outside the JSON.`;
}

/**
 * Generate a quiz from provided content (notes, text, etc.)
 */
export function contentQuizPrompt(content, quizType, count = 10, difficulty = 'mixed') {
  const typeInstruction = getQuizTypeInstruction(quizType);
  const diffInstruction = difficulty === 'mixed'
    ? 'Mix easy, medium, and hard questions.'
    : `All questions should be ${difficulty} difficulty.`;

  return `You are an expert quiz maker. Read the following content and generate exactly ${count} ${typeInstruction} questions based on the key concepts.

Content:
"""
${content}
"""

${diffInstruction}

${getQuizOutputFormat(quizType)}

Respond ONLY with valid JSON. No markdown, no explanation outside the JSON.`;
}

/**
 * Generate a quiz from flashcard data.
 */
export function flashcardQuizPrompt(flashcards, quizType, count = 10) {
  const typeInstruction = getQuizTypeInstruction(quizType);
  const flashcardText = flashcards
    .map((f, i) => `${i + 1}. Q: ${f.question} | A: ${f.answer}`)
    .join('\n');

  return `You are an expert quiz maker. Using the following flashcard data, generate exactly ${count} ${typeInstruction} quiz questions. Rephrase the questions so they are not exact copies of the flashcards.

Flashcards:
${flashcardText}

${getQuizOutputFormat(quizType)}

Respond ONLY with valid JSON. No markdown, no explanation outside the JSON.`;
}

function getQuizTypeInstruction(quizType) {
  switch (quizType) {
    case QUIZ_TYPES.mcq:
      return 'multiple-choice (4 options each)';
    case QUIZ_TYPES.trueFalse:
      return 'true/false';
    case QUIZ_TYPES.shortAnswer:
      return 'short-answer';
    case QUIZ_TYPES.mixed:
      return 'mixed (combination of MCQ, true/false, and short-answer)';
    default:
      return 'multiple-choice';
  }
}

function getQuizOutputFormat(quizType) {
  return `Return JSON in this exact format:
{
  "title": "<quiz title>",
  "questions": [
    {
      "question": "<question text>",
      "type": "mcq|true_false|short_answer",
      "options": ["<option A>", "<option B>", "<option C>", "<option D>"],
      "correctAnswer": "<the correct answer text>",
      "correctIndex": 0,
      "explanation": "<brief explanation of why this is correct>",
      "difficulty": "easy|medium|hard",
      "topic": "<specific sub-topic this question covers>"
    }
  ]
}

For true/false questions, options should be ["True", "False"].
For short_answer questions, options should be an empty array [].
correctIndex is the 0-based index of the correct option (use -1 for short_answer).`;
}
