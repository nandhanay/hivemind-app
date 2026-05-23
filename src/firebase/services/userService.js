import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  collection,
  getDocs,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '../config';

/**
 * Get user profile or create a default one.
 */
export async function getOrCreateUser(userId) {
  try {
    const userRef = doc(db, 'users', userId);
    const snapshot = await getDoc(userRef);

    if (snapshot.exists()) {
      return { id: snapshot.id, ...snapshot.data() };
    }

    // Create default user profile
    const defaultUser = {
      name: 'Nandhana',
      email: '',
      createdAt: serverTimestamp(),
    };

    await setDoc(userRef, defaultUser);
    return { id: userId, ...defaultUser };
  } catch (error) {
    console.error('Error getting/creating user:', error);
    return { id: userId, name: 'Nandhana', email: '' };
  }
}

/**
 * Update user profile fields.
 */
export async function updateUser(userId, data) {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (error) {
    console.error('Error updating user:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Reset user data (delete all tasks, sessions, notes, flashcards, quizzes, weak topics, workspaces, subjects).
 */
export async function resetUserData(userId) {
  try {
    const collectionsToDelete = [
      'tasks', 'sessions',
      'notes', 'flashcards', 'quizzes', 'weakTopics',
      'workspaces', 'subjects',
    ];

    const deletePromises = [];

    for (const colName of collectionsToDelete) {
      const colRef = collection(db, 'users', userId, colName);
      const snap = await getDocs(colRef);
      snap.docs.forEach((docSnap) => deletePromises.push(deleteDoc(docSnap.ref)));
    }

    // Also delete quiz analytics doc
    const analyticsRef = doc(db, 'users', userId, 'meta', 'quizAnalytics');
    deletePromises.push(deleteDoc(analyticsRef).catch(() => {})); // Ignore if doesn't exist

    await Promise.all(deletePromises);

    return { success: true };
  } catch (error) {
    console.error('Error resetting user data:', error);
    return { success: false, error: error.message };
  }
}
