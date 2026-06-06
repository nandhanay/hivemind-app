/**
 * Prompt templates for AI-powered study planner generation.
 */

/**
 * Generate a study plan for a subject based on a chosen mode (Exam Prep or Revision).
 */
export function plannerPrompt(subject, mode) {
  const modeInstruction = mode === 'Exam Prep'
    ? 'intensive study sessions, mock question reviews, and core theory drilling'
    : 'active recall, reviewing past mistakes, and studying flashcard decks';

  return `You are an expert study planner. Generate a structured daily study plan for the subject "${subject}" under the study mode "${mode}".
The plan must focus on ${modeInstruction}.

Generate exactly 3 study tasks. Each task must have:
- subject: "${subject}"
- topic: a specific subtopic, conceptual focus, or revision activity (be specific, e.g. "Reviewing Photosynthesis Light Reactions")
- startTime: in 24h format (e.g. "09:00", "13:30", "16:00")
- endTime: in 24h format (e.g. "10:00", "14:30", "17:00")
- difficulty: "Easy", "Medium", or "Hard"
- status: "Upcoming"

Return JSON in this exact format:
{
  "tasks": [
    {
      "subject": "<subject>",
      "topic": "<topic description>",
      "startTime": "<startTime>",
      "endTime": "<endTime>",
      "difficulty": "Easy|Medium|Hard",
      "status": "Upcoming"
    }
  ]
}

Ensure task times do not overlap and flow chronologically.
Respond ONLY with valid JSON. No markdown, no explanation outside the JSON.`;
}
