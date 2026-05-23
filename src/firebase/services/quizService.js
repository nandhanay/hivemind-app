/**
 * Quiz Service — Firestore CRUD + Scoring + Analytics
 *
 * users/{userId}/quizzes/{quizId}
 * users/{userId}/quizAnalytics (single doc)
 */
import {
  collection, addDoc, getDoc, getDocs, doc, setDoc, updateDoc, deleteDoc,
  query, orderBy, limit, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config';
import { addFlashcard } from './flashcardService';

const COLLECTION = 'quizzes';
const ANALYTICS_DOC = 'quizAnalytics';

function quizzesRef(userId) {
  return collection(db, 'users', userId, COLLECTION);
}

function quizDocRef(userId, quizId) {
  return doc(db, 'users', userId, COLLECTION, quizId);
}

function analyticsDocRef(userId) {
  return doc(db, 'users', userId, 'meta', ANALYTICS_DOC);
}

// ─── Create ───────────────────────────────────────────────

export async function createQuiz(userId, quizData) {
  if (!userId) return { success: false, error: 'No user' };
  try {
    const docRef = await addDoc(quizzesRef(userId), {
      title: quizData.title || 'Untitled Quiz',
      quizType: quizData.quizType || 'mcq',
      subject: quizData.subject || '',
      topic: quizData.topic || '',
      workspaceId: quizData.workspaceId || '',
      sourceType: quizData.sourceType || 'topic',
      sourceId: quizData.sourceId || '',
      questions: quizData.questions || [],
      totalQuestions: quizData.questions?.length || 0,
      score: null,
      percentage: null,
      status: 'pending',
      weakTopicsDetected: [],
      createdAt: serverTimestamp(),
      completedAt: null,
    });
    return { success: true, id: docRef.id };
  } catch (e) {
    console.error('createQuiz:', e);
    return { success: false, error: e.message };
  }
}

// ─── Read ─────────────────────────────────────────────────

export async function getQuiz(userId, quizId) {
  if (!userId || !quizId) return null;
  try {
    const snap = await getDoc(quizDocRef(userId, quizId));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() };
  } catch (e) {
    console.error('getQuiz:', e);
    return null;
  }
}

export async function getQuizzes(userId) {
  if (!userId) return [];
  try {
    const q = query(quizzesRef(userId), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.error('getQuizzes:', e);
    return [];
  }
}

export async function getRecentQuizzes(userId, count = 5) {
  if (!userId) return [];
  try {
    const q = query(quizzesRef(userId), orderBy('createdAt', 'desc'), limit(count));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.error('getRecentQuizzes:', e);
    return [];
  }
}

// ─── Submit & Grade ───────────────────────────────────────

/**
 * Submit quiz answers, grade, and update analytics.
 * @param {string} userId
 * @param {string} quizId
 * @param {Array<{ questionIndex: number, userAnswer: string }>} answers
 */
export async function submitQuiz(userId, quizId, answers) {
  if (!userId || !quizId) return { success: false, error: 'Missing id' };
  try {
    const quiz = await getQuiz(userId, quizId);
    if (!quiz) return { success: false, error: 'Quiz not found' };

    const questions = [...quiz.questions];
    let correctCount = 0;
    const weakTopics = {};

    // Grade each question
    for (const ans of answers) {
      const q = questions[ans.questionIndex];
      if (!q) continue;

      q.userAnswer = ans.userAnswer;

      // Determine correctness
      if (q.type === 'short_answer') {
        q.isCorrect = q.correctAnswer.toLowerCase().trim() === ans.userAnswer.toLowerCase().trim();
      } else {
        q.isCorrect = q.correctAnswer === ans.userAnswer;
      }

      if (q.isCorrect) {
        correctCount++;
      } else {
        // Track weak topics
        const topicKey = q.topic || quiz.topic || 'General';
        if (!weakTopics[topicKey]) {
          weakTopics[topicKey] = { count: 0, mistakes: [] };
        }
        weakTopics[topicKey].count++;
        weakTopics[topicKey].mistakes.push({
          question: q.question,
          userAnswer: ans.userAnswer,
          correctAnswer: q.correctAnswer,
        });
      }
    }

    const totalAnswered = answers.length;
    const percentage = totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0;

    const weakTopicsDetected = Object.entries(weakTopics).map(([topic, data]) => ({
      topic,
      mistakeCount: data.count,
      mistakes: data.mistakes,
    }));

    // Update quiz document
    await updateDoc(quizDocRef(userId, quizId), {
      questions,
      score: correctCount,
      percentage,
      status: 'completed',
      weakTopicsDetected,
      completedAt: serverTimestamp(),
    });

    // Update analytics
    await updateQuizAnalytics(userId, {
      score: percentage,
      subject: quiz.subject,
      weakTopics: weakTopicsDetected.map((w) => w.topic),
    });

    return {
      success: true,
      score: correctCount,
      total: quiz.totalQuestions,
      percentage,
      weakTopicsDetected,
    };
  } catch (e) {
    console.error('submitQuiz:', e);
    return { success: false, error: e.message };
  }
}

// ─── Analytics ────────────────────────────────────────────

export async function getQuizAnalytics(userId) {
  if (!userId) return null;
  try {
    const snap = await getDoc(analyticsDocRef(userId));
    if (!snap.exists()) {
      return { totalQuizzes: 0, averageScore: 0, weakSubjects: [], recentScores: [] };
    }
    return snap.data();
  } catch (e) {
    console.error('getQuizAnalytics:', e);
    return { totalQuizzes: 0, averageScore: 0, weakSubjects: [], recentScores: [] };
  }
}

async function updateQuizAnalytics(userId, quizResult) {
  try {
    const current = await getQuizAnalytics(userId);

    const recentScores = [...(current.recentScores || []), quizResult.score].slice(-20);
    const totalQuizzes = (current.totalQuizzes || 0) + 1;
    const averageScore = Math.round(recentScores.reduce((a, b) => a + b, 0) / recentScores.length);

    // Track weak subjects
    const weakSubjectsSet = new Set(current.weakSubjects || []);
    if (quizResult.score < 60 && quizResult.subject) {
      weakSubjectsSet.add(quizResult.subject);
    }
    // Remove from weak if improved
    if (quizResult.score >= 80 && quizResult.subject) {
      weakSubjectsSet.delete(quizResult.subject);
    }

    await setDoc(analyticsDocRef(userId), {
      totalQuizzes,
      averageScore,
      weakSubjects: [...weakSubjectsSet],
      recentScores,
      lastQuizDate: serverTimestamp(),
    }, { merge: true });
  } catch (e) {
    console.error('updateQuizAnalytics:', e);
  }
}

// ─── Convert Mistakes to Flashcards ───────────────────────

export async function convertMistakesToFlashcards(userId, quizId) {
  if (!userId || !quizId) return { success: false, error: 'Missing id' };
  try {
    const quiz = await getQuiz(userId, quizId);
    if (!quiz) return { success: false, error: 'Quiz not found' };

    const wrongQuestions = quiz.questions.filter((q) => q.isCorrect === false);
    let created = 0;

    for (const q of wrongQuestions) {
      const result = await addFlashcard(userId, {
        question: q.question,
        answer: q.correctAnswer,
        type: 'recall',
        difficulty: 'hard',
        subject: quiz.subject,
        topic: q.topic || quiz.topic,
        createdByAI: true,
        explanation: q.explanation || '',
      });
      if (result.success) created++;
    }

    return { success: true, count: created };
  } catch (e) {
    console.error('convertMistakesToFlashcards:', e);
    return { success: false, error: e.message };
  }
}

// ─── Delete ───────────────────────────────────────────────

export async function deleteQuiz(userId, quizId) {
  if (!userId || !quizId) return { success: false, error: 'Missing id' };
  try {
    await deleteDoc(quizDocRef(userId, quizId));
    return { success: true };
  } catch (e) {
    console.error('deleteQuiz:', e);
    return { success: false, error: e.message };
  }
}

// ─── Stats ────────────────────────────────────────────────

export async function getQuizzesCount(userId) {
  if (!userId) return 0;
  try {
    const snap = await getDocs(quizzesRef(userId));
    return snap.size;
  } catch (e) {
    return 0;
  }
}
