/**
 * Prompt templates for weak topic analysis and remediation.
 */

/**
 * Analyze quiz mistakes and identify weak areas.
 */
export function analyzeWeaknessPrompt(mistakes) {
  const mistakeText = mistakes
    .map((m, i) => `${i + 1}. Question: "${m.question}" | User answered: "${m.userAnswer}" | Correct: "${m.correctAnswer}" | Topic: "${m.topic || 'unknown'}"`)
    .join('\n');

  return `You are an expert learning analyst. Analyze the following quiz mistakes and identify the weak topics that need improvement.

Mistakes:
${mistakeText}

Return JSON in this exact format:
{
  "weakTopics": [
    {
      "topicName": "<specific topic name>",
      "subject": "<broader subject area>",
      "weaknessScore": <0-100, higher = weaker>,
      "reason": "<brief explanation of why this is a weak area>",
      "suggestions": ["<suggestion 1>", "<suggestion 2>"]
    }
  ]
}

Group related mistakes under the same topic. Respond ONLY with valid JSON.`;
}

/**
 * Generate a simplified explanation for a weak topic.
 */
export function simplifiedExplanationPrompt(topicName, subject) {
  return `You are a patient tutor. Explain the following topic in the simplest possible way, as if teaching a beginner. Use analogies, examples, and step-by-step breakdowns.

Topic: "${topicName}"
Subject: "${subject}"

Return JSON in this exact format:
{
  "title": "Understanding ${topicName}",
  "sections": [
    {
      "heading": "<section heading>",
      "content": "<simple explanation with examples — use \\n for line breaks>"
    }
  ],
  "keyPoints": ["<key point 1>", "<key point 2>"],
  "mnemonics": ["<memory aid or trick if applicable>"]
}

Respond ONLY with valid JSON.`;
}

/**
 * Generate a mini quiz focused on a specific weak topic.
 */
export function weakTopicMiniQuizPrompt(topicName, subject, count = 5) {
  return `You are an expert quiz maker. Generate exactly ${count} questions specifically targeting the following weak topic. Questions should test understanding, not just memorization. Include easy to medium difficulty questions that build confidence.

Weak Topic: "${topicName}"
Subject: "${subject}"

Return JSON in this exact format:
{
  "title": "Review: ${topicName}",
  "questions": [
    {
      "question": "<question text>",
      "type": "mcq",
      "options": ["<option A>", "<option B>", "<option C>", "<option D>"],
      "correctAnswer": "<the correct answer text>",
      "correctIndex": 0,
      "explanation": "<clear explanation to help the student understand>",
      "difficulty": "easy|medium",
      "topic": "${topicName}"
    }
  ]
}

Respond ONLY with valid JSON.`;
}

/**
 * Generate revision notes specifically for a weak topic.
 */
export function weakTopicRevisionPrompt(topicName, subject, mistakes = []) {
  const mistakeContext = mistakes.length > 0
    ? `\nThe student has made these specific mistakes:\n${mistakes.map((m, i) => `${i + 1}. "${m.question}" — answered "${m.userAnswer}" instead of "${m.correctAnswer}"`).join('\n')}\n\nAddress these specific misconceptions in your notes.`
    : '';

  return `You are an expert tutor. Generate focused revision notes for a student who is struggling with the following topic. ${mistakeContext}

Topic: "${topicName}"
Subject: "${subject}"

Return JSON in this exact format:
{
  "title": "Revision: ${topicName}",
  "sections": [
    {
      "heading": "<section heading>",
      "content": "<focused revision content with examples — use \\n for line breaks>"
    }
  ],
  "commonMistakes": ["<common mistake 1>", "<common mistake 2>"],
  "keyTakeaways": ["<takeaway 1>", "<takeaway 2>"]
}

Respond ONLY with valid JSON.`;
}
