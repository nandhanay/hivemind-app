/**
 * Weak Topics Service — Auto-detection + Review Management
 *
 * users/{userId}/weakTopics/{weakTopicId}
 */
import {
  collection, addDoc, getDoc, getDocs, doc, updateDoc, deleteDoc,
  query, where, orderBy, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config';
import { WEAK_TOPIC_THRESHOLDS } from '../../constants/studyDefaults';

const COLLECTION = 'weakTopics';

function topicsRef(userId) {
  return collection(db, 'users', userId, COLLECTION);
}

function topicDocRef(userId, topicId) {
  return doc(db, 'users', userId, COLLECTION, topicId);
}

// ─── Create / Upsert ─────────────────────────────────────

/**
 * Add or update a weak topic. If a topic with the same name + subject exists,
 * appends new data to it; otherwise creates a new entry.
 */
export async function addOrUpdateWeakTopic(userId, {
  subject, topicName, weaknessScore,
  linkedFlashcardIds = [], linkedQuizMistakes = [],
}) {
  if (!userId || !topicName) return { success: false, error: 'Missing data' };
  try {
    // Check if topic already exists
    const existing = await findWeakTopic(userId, subject, topicName);

    if (existing) {
      // Append data to existing
      const updatedFlashcards = [
        ...new Set([...(existing.linkedFlashcardIds || []), ...linkedFlashcardIds]),
      ];
      const updatedMistakes = [
        ...(existing.linkedQuizMistakes || []),
        ...linkedQuizMistakes,
      ].slice(-50); // Keep last 50 mistakes

      const newScore = Math.min(100, Math.max(
        weaknessScore || existing.weaknessScore,
        existing.weaknessScore + 5 // Bump score on repeated failures
      ));

      await updateDoc(topicDocRef(userId, existing.id), {
        weaknessScore: newScore,
        linkedFlashcardIds: updatedFlashcards,
        linkedQuizMistakes: updatedMistakes,
        retryCount: (existing.retryCount || 0) + 1,
        updatedAt: serverTimestamp(),
      });
      return { success: true, id: existing.id, updated: true };
    }

    // Create new weak topic
    const docRef = await addDoc(topicsRef(userId), {
      subject: subject || '',
      topicName: topicName.trim(),
      weaknessScore: weaknessScore || 50,
      masteryProgress: 0,
      linkedFlashcardIds,
      linkedQuizMistakes,
      retryCount: 0,
      lastReviewed: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { success: true, id: docRef.id, updated: false };
  } catch (e) {
    console.error('addOrUpdateWeakTopic:', e);
    return { success: false, error: e.message };
  }
}

/**
 * Find an existing weak topic by subject + name.
 */
async function findWeakTopic(userId, subject, topicName) {
  try {
    const q = query(
      topicsRef(userId),
      where('topicName', '==', topicName.trim()),
      where('subject', '==', subject || '')
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return { id: snap.docs[0].id, ...snap.docs[0].data() };
  } catch (e) {
    console.error('findWeakTopic:', e);
    return null;
  }
}

// ─── Read ─────────────────────────────────────────────────

export async function getWeakTopics(userId) {
  if (!userId) return [];
  try {
    const snap = await getDocs(topicsRef(userId));
    let topics = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    // Sort by weakness score (highest first)
    topics.sort((a, b) => (b.weaknessScore || 0) - (a.weaknessScore || 0));
    return topics;
  } catch (e) {
    console.error('getWeakTopics:', e);
    return [];
  }
}

export async function getWeakTopic(userId, topicId) {
  if (!userId || !topicId) return null;
  try {
    const snap = await getDoc(topicDocRef(userId, topicId));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() };
  } catch (e) {
    console.error('getWeakTopic:', e);
    return null;
  }
}

// ─── Update ───────────────────────────────────────────────

export async function linkFlashcard(userId, topicId, flashcardId) {
  if (!userId || !topicId) return { success: false };
  try {
    const topic = await getWeakTopic(userId, topicId);
    if (!topic) return { success: false, error: 'Not found' };
    const ids = [...new Set([...(topic.linkedFlashcardIds || []), flashcardId])];
    await updateDoc(topicDocRef(userId, topicId), {
      linkedFlashcardIds: ids,
      updatedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

export async function linkQuizMistake(userId, topicId, mistake) {
  if (!userId || !topicId) return { success: false };
  try {
    const topic = await getWeakTopic(userId, topicId);
    if (!topic) return { success: false, error: 'Not found' };
    const mistakes = [...(topic.linkedQuizMistakes || []), mistake].slice(-50);
    await updateDoc(topicDocRef(userId, topicId), {
      linkedQuizMistakes: mistakes,
      updatedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

export async function updateMasteryProgress(userId, topicId, progress) {
  if (!userId || !topicId) return { success: false };
  try {
    const updates = {
      masteryProgress: Math.min(100, Math.max(0, progress)),
      lastReviewed: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    // If mastery >= 90, lower weakness score significantly
    if (progress >= 90) {
      updates.weaknessScore = 10;
    } else if (progress >= 70) {
      updates.weaknessScore = 30;
    }
    await updateDoc(topicDocRef(userId, topicId), updates);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ─── Auto-Detection ───────────────────────────────────────

/**
 * Detect weak topics from quiz results. Called after quiz submission.
 * @param {string} userId
 * @param {{ subject: string, weakTopicsDetected: Array }} quizResult
 */
export async function detectWeakTopicsFromQuiz(userId, quizResult) {
  if (!userId || !quizResult?.weakTopicsDetected?.length) return;

  for (const weakTopic of quizResult.weakTopicsDetected) {
    if (weakTopic.mistakeCount >= WEAK_TOPIC_THRESHOLDS.minMistakesToDetect) {
      const score = Math.min(100, 40 + weakTopic.mistakeCount * 15);
      await addOrUpdateWeakTopic(userId, {
        subject: quizResult.subject || '',
        topicName: weakTopic.topic,
        weaknessScore: score,
        linkedQuizMistakes: weakTopic.mistakes || [],
      });
    }
  }
}

/**
 * Detect weak topic from a difficult flashcard.
 */
export async function detectWeakTopicFromFlashcard(userId, flashcard) {
  if (!userId || !flashcard?.topic) return;

  await addOrUpdateWeakTopic(userId, {
    subject: flashcard.subject || '',
    topicName: flashcard.topic,
    weaknessScore: 45,
    linkedFlashcardIds: [flashcard.id],
  });
}

// ─── Delete ───────────────────────────────────────────────

export async function removeWeakTopic(userId, topicId) {
  if (!userId || !topicId) return { success: false };
  try {
    await deleteDoc(topicDocRef(userId, topicId));
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ─── Stats ────────────────────────────────────────────────

export async function getWeakTopicsCount(userId) {
  if (!userId) return 0;
  try {
    const snap = await getDocs(topicsRef(userId));
    return snap.size;
  } catch (e) {
    return 0;
  }
}
