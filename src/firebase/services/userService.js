import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
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
