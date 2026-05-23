/**
 * Flashcard Service — Firestore CRUD + Spaced Repetition
 *
 * users/{userId}/flashcards/{flashcardId}
 */
import {
  collection, addDoc, getDoc, getDocs, doc, updateDoc, deleteDoc,
  query, where, orderBy, limit, serverTimestamp, Timestamp,
} from 'firebase/firestore';
import { db } from '../config';
import { SM2_DEFAULTS, calculateSM2 } from '../../constants/studyDefaults';

const COLLECTION = 'flashcards';

function cardsRef(userId) {
  return collection(db, 'users', userId, COLLECTION);
}

function cardDocRef(userId, cardId) {
  return doc(db, 'users', userId, COLLECTION, cardId);
}

// ─── Create ───────────────────────────────────────────────

export async function addFlashcard(userId, card) {
  if (!userId) return { success: false, error: 'No user' };
  try {
    const now = new Date();
    const docRef = await addDoc(cardsRef(userId), {
      question: card.question || '',
      answer: card.answer || '',
      type: card.type || 'recall',
      difficulty: card.difficulty || 'medium',
      tags: card.tags || [],
      subject: card.subject || '',
      topic: card.topic || '',
      workspaceId: card.workspaceId || '',
      createdByAI: card.createdByAI || false,
      // MCQ-specific
      options: card.options || [],
      correctIndex: card.correctIndex ?? -1,
      explanation: card.explanation || '',
      // SM-2 spaced repetition fields
      easeFactor: SM2_DEFAULTS.easeFactor,
      interval: SM2_DEFAULTS.interval,
      repetitions: SM2_DEFAULTS.repetitions,
      nextReviewDate: Timestamp.fromDate(now), // Due immediately
      lastReviewedAt: null,
      confidence: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { success: true, id: docRef.id };
  } catch (e) {
    console.error('addFlashcard:', e);
    return { success: false, error: e.message };
  }
}

/**
 * Batch-create multiple flashcards (e.g. from AI generation).
 */
export async function addFlashcards(userId, cards) {
  if (!userId || !cards?.length) return { success: false, error: 'No cards' };
  const results = [];
  for (const card of cards) {
    const result = await addFlashcard(userId, card);
    results.push(result);
  }
  const successCount = results.filter((r) => r.success).length;
  return { success: true, count: successCount };
}

// ─── Read ─────────────────────────────────────────────────

export async function getFlashcard(userId, cardId) {
  if (!userId || !cardId) return null;
  try {
    const snap = await getDoc(cardDocRef(userId, cardId));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() };
  } catch (e) {
    console.error('getFlashcard:', e);
    return null;
  }
}

export async function getFlashcards(userId) {
  if (!userId) return [];
  try {
    const q = query(cardsRef(userId), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.error('getFlashcards:', e);
    return [];
  }
}

export async function getFlashcardsBySubject(userId, subject) {
  if (!userId || !subject) return [];
  try {
    const q = query(cardsRef(userId), where('subject', '==', subject));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.error('getFlashcardsBySubject:', e);
    return [];
  }
}

export async function getFlashcardsByTopic(userId, topic) {
  if (!userId || !topic) return [];
  try {
    const q = query(cardsRef(userId), where('topic', '==', topic));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.error('getFlashcardsByTopic:', e);
    return [];
  }
}

/**
 * Get flashcards due for review (nextReviewDate <= now).
 */
export async function getDueFlashcards(userId) {
  if (!userId) return [];
  try {
    const now = Timestamp.fromDate(new Date());
    const q = query(
      cardsRef(userId),
      where('nextReviewDate', '<=', now),
      orderBy('nextReviewDate', 'asc')
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.error('getDueFlashcards:', e);
    // Fallback: get all and filter client-side
    try {
      const all = await getFlashcards(userId);
      const nowMs = Date.now();
      return all.filter((c) => {
        const due = c.nextReviewDate?.toMillis?.() ?? 0;
        return due <= nowMs;
      });
    } catch {
      return [];
    }
  }
}

// ─── Spaced Repetition Review ─────────────────────────────

/**
 * Review a flashcard and update SM-2 parameters.
 * @param {string} userId
 * @param {string} cardId
 * @param {number} quality — User rating 0-5 (0=forgot, 5=perfect)
 */
export async function reviewFlashcard(userId, cardId, quality) {
  if (!userId || !cardId) return { success: false, error: 'Missing id' };
  try {
    const card = await getFlashcard(userId, cardId);
    if (!card) return { success: false, error: 'Card not found' };

    const sm2Result = calculateSM2(
      quality,
      card.repetitions || 0,
      card.easeFactor || SM2_DEFAULTS.easeFactor,
      card.interval || SM2_DEFAULTS.interval
    );

    await updateDoc(cardDocRef(userId, cardId), {
      easeFactor: sm2Result.easeFactor,
      interval: sm2Result.interval,
      repetitions: sm2Result.repetitions,
      nextReviewDate: Timestamp.fromDate(sm2Result.nextReviewDate),
      lastReviewedAt: serverTimestamp(),
      confidence: quality,
      updatedAt: serverTimestamp(),
    });
    return { success: true, ...sm2Result };
  } catch (e) {
    console.error('reviewFlashcard:', e);
    return { success: false, error: e.message };
  }
}

/**
 * Mark a flashcard as difficult (bumps difficulty + lowers ease factor).
 */
export async function markDifficult(userId, cardId) {
  if (!userId || !cardId) return { success: false, error: 'Missing id' };
  try {
    await updateDoc(cardDocRef(userId, cardId), {
      difficulty: 'hard',
      easeFactor: Math.max(SM2_DEFAULTS.minEaseFactor, SM2_DEFAULTS.easeFactor - 0.3),
      updatedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ─── Update ───────────────────────────────────────────────

export async function updateFlashcard(userId, cardId, data) {
  if (!userId || !cardId) return { success: false, error: 'Missing id' };
  try {
    await updateDoc(cardDocRef(userId, cardId), {
      ...data,
      updatedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (e) {
    console.error('updateFlashcard:', e);
    return { success: false, error: e.message };
  }
}

// ─── Delete ───────────────────────────────────────────────

export async function deleteFlashcard(userId, cardId) {
  if (!userId || !cardId) return { success: false, error: 'Missing id' };
  try {
    await deleteDoc(cardDocRef(userId, cardId));
    return { success: true };
  } catch (e) {
    console.error('deleteFlashcard:', e);
    return { success: false, error: e.message };
  }
}

// ─── Stats ────────────────────────────────────────────────

export async function getFlashcardStats(userId) {
  if (!userId) return { total: 0, due: 0, mastered: 0 };
  try {
    const all = await getFlashcards(userId);
    const nowMs = Date.now();
    const due = all.filter((c) => {
      const reviewDate = c.nextReviewDate?.toMillis?.() ?? 0;
      return reviewDate <= nowMs;
    }).length;
    const mastered = all.filter((c) => (c.repetitions || 0) >= 5).length;
    return { total: all.length, due, mastered };
  } catch (e) {
    return { total: 0, due: 0, mastered: 0 };
  }
}
