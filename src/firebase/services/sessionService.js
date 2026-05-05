import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config';

const COLLECTION = 'sessions';

/**
 * Save a completed focus session to Firestore.
 */
export async function addSession(userId, { duration, mode, subject }) {
  if (!userId) return { success: false, error: 'No user' };
  try {
    const sessionsRef = collection(db, 'users', userId, COLLECTION);
    const docRef = await addDoc(sessionsRef, {
      duration, // in seconds
      mode: mode || 'pomodoro',
      subject: subject || '',
      date: serverTimestamp(),
      createdAt: serverTimestamp(),
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error saving session:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Fetch all sessions for a user, ordered by date (newest first).
 */
export async function getSessions(userId) {
  if (!userId) return [];
  try {
    const sessionsRef = collection(db, 'users', userId, COLLECTION);
    const q = query(sessionsRef, orderBy('date', 'desc'));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      date: doc.data().date?.toDate?.() || new Date(),
    }));
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return [];
  }
}

/**
 * Fetch sessions within a date range.
 */
export async function getSessionsByDateRange(userId, startDate, endDate) {
  if (!userId) return [];
  try {
    const sessionsRef = collection(db, 'users', userId, COLLECTION);
    const q = query(
      sessionsRef,
      where('date', '>=', Timestamp.fromDate(startDate)),
      where('date', '<=', Timestamp.fromDate(endDate)),
      orderBy('date', 'desc')
    );
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      date: doc.data().date?.toDate?.() || new Date(),
    }));
  } catch (error) {
    console.error('Error fetching sessions by date range:', error);
    return [];
  }
}

/**
 * Fetch today's sessions.
 */
export async function getTodaySessions(userId) {
  if (!userId) return [];
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  return getSessionsByDateRange(userId, startOfDay, endOfDay);
}

/**
 * Calculate the user's study streak (consecutive days with at least one session).
 */
export async function getStreak(userId) {
  if (!userId) return [];
  try {
    const sessions = await getSessions(userId);
    if (sessions.length === 0) return 0;

    // Get unique study dates (YYYY-MM-DD)
    const studyDates = new Set(
      sessions.map((s) => {
        const d = s.date instanceof Date ? s.date : new Date(s.date);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      })
    );

    let streak = 0;
    const today = new Date();

    for (let i = 0; i < 365; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() - i);
      const key = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;

      if (studyDates.has(key)) {
        streak++;
      } else if (i === 0) {
        // Today doesn't count as a break — user might study later
        continue;
      } else {
        break;
      }
    }

    return streak;
  } catch (error) {
    console.error('Error calculating streak:', error);
    return 0;
  }
}

/**
 * Get total study time in seconds for a user.
 */
export async function getTotalStudyTime(userId) {
  if (!userId) return [];
  const sessions = await getSessions(userId);
  return sessions.reduce((sum, s) => sum + (s.duration || 0), 0);
}
