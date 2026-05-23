/**
 * Default constants for the study management system.
 */

// ─── SM-2 Spaced Repetition Defaults ──────────────────────
export const SM2_DEFAULTS = {
  easeFactor: 2.5,       // Starting ease factor
  interval: 1,           // Starting interval in days
  repetitions: 0,        // Number of successful reviews
  minEaseFactor: 1.3,    // Minimum ease factor
};

/**
 * SM-2 Algorithm: Calculate next review parameters.
 *
 * @param {number} quality      — User rating 0-5 (0=forgot, 5=perfect)
 * @param {number} repetitions  — Current repetition count
 * @param {number} easeFactor   — Current ease factor
 * @param {number} interval     — Current interval in days
 * @returns {{ repetitions, easeFactor, interval, nextReviewDate }}
 */
export function calculateSM2(quality, repetitions, easeFactor, interval) {
  let newRepetitions = repetitions;
  let newEaseFactor = easeFactor;
  let newInterval = interval;

  if (quality >= 3) {
    // Correct response
    if (newRepetitions === 0) {
      newInterval = 1;
    } else if (newRepetitions === 1) {
      newInterval = 6;
    } else {
      newInterval = Math.round(interval * easeFactor);
    }
    newRepetitions += 1;
  } else {
    // Incorrect response — reset
    newRepetitions = 0;
    newInterval = 1;
  }

  // Update ease factor
  newEaseFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (newEaseFactor < SM2_DEFAULTS.minEaseFactor) {
    newEaseFactor = SM2_DEFAULTS.minEaseFactor;
  }

  // Calculate next review date
  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + newInterval);

  return {
    repetitions: newRepetitions,
    easeFactor: Math.round(newEaseFactor * 100) / 100,
    interval: newInterval,
    nextReviewDate: nextReview,
  };
}

// ─── Note Types ───────────────────────────────────────────
export const NOTE_TYPE_LABELS = {
  manual: { label: 'Manual Note', icon: 'create-outline' },
  ai_summary: { label: 'AI Summary', icon: 'sparkles-outline' },
  ai_detailed: { label: 'AI Detailed', icon: 'document-text-outline' },
  ai_bullets: { label: 'Bullet Points', icon: 'list-outline' },
  ai_formula: { label: 'Formula Sheet', icon: 'calculator-outline' },
  ai_flowchart: { label: 'Flowchart', icon: 'git-network-outline' },
  ai_visual: { label: 'Visual Notes', icon: 'eye-outline' },
};

// ─── Flashcard Types ──────────────────────────────────────
export const FLASHCARD_TYPE_LABELS = {
  recall: { label: 'Recall', icon: 'bulb-outline', color: '#4CAF50' },
  mcq: { label: 'MCQ', icon: 'list-outline', color: '#2196F3' },
  formula: { label: 'Formula', icon: 'calculator-outline', color: '#FF9800' },
  definition: { label: 'Definition', icon: 'book-outline', color: '#9C27B0' },
  viva: { label: 'Viva', icon: 'chatbubbles-outline', color: '#E91E63' },
};

// ─── Quiz Defaults ────────────────────────────────────────
export const QUIZ_QUESTION_COUNTS = [5, 10, 15, 20];
export const QUIZ_DIFFICULTIES = ['easy', 'medium', 'hard', 'mixed'];

// ─── Difficulty Labels ────────────────────────────────────
export const DIFFICULTY_COLORS = {
  easy: '#4CAF50',
  medium: '#FF9800',
  hard: '#F44336',
};

// ─── Score Thresholds ─────────────────────────────────────
export const SCORE_THRESHOLDS = {
  excellent: 80,  // >= 80% → green
  good: 60,       // >= 60% → yellow
  // < 60% → red
};

// ─── Weak Topic Thresholds ────────────────────────────────
export const WEAK_TOPIC_THRESHOLDS = {
  minMistakesToDetect: 2,       // Min wrong answers on a topic to flag it
  accuracyThreshold: 60,       // Below this % accuracy → weak
  highWeaknessScore: 70,       // Above this → critical
};
