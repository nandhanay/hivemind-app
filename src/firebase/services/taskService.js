import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config';

const COLLECTION = 'tasks';

/**
 * Add a new planner task.
 */
export async function addTask(userId, task) {
  try {
    const tasksRef = collection(db, 'users', userId, COLLECTION);
    const docRef = await addDoc(tasksRef, {
      subject: task.subject || '',
      topic: task.topic || '',
      startTime: task.startTime || '',
      endTime: task.endTime || '',
      duration: task.duration || '',
      difficulty: task.difficulty || 'Medium',
      status: task.status || 'Upcoming',
      progress: task.progress || 0,
      date: task.date || '', // YYYY-MM-DD string
      completed: false,
      createdAt: serverTimestamp(),
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error adding task:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get tasks for a specific date.
 */
export async function getTasksByDate(userId, dateKey) {
  try {
    const tasksRef = collection(db, 'users', userId, COLLECTION);
    const q = query(
      tasksRef,
      where('date', '==', dateKey),
      orderBy('startTime', 'asc')
    );
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error('Error fetching tasks for date:', error);
    return [];
  }
}

/**
 * Get all tasks for a user.
 */
export async function getAllTasks(userId) {
  try {
    const tasksRef = collection(db, 'users', userId, COLLECTION);
    const q = query(tasksRef, orderBy('date', 'desc'));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error('Error fetching all tasks:', error);
    return [];
  }
}

/**
 * Update task status (Upcoming → Active → Completed).
 */
export async function updateTaskStatus(userId, taskId, status) {
  try {
    const taskRef = doc(db, 'users', userId, COLLECTION, taskId);
    await updateDoc(taskRef, {
      status,
      completed: status === 'Completed',
      progress: status === 'Completed' ? 100 : status === 'Active' ? 50 : 0,
    });
    return { success: true };
  } catch (error) {
    console.error('Error updating task:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete a task.
 */
export async function deleteTask(userId, taskId) {
  try {
    const taskRef = doc(db, 'users', userId, COLLECTION, taskId);
    await deleteDoc(taskRef);
    return { success: true };
  } catch (error) {
    console.error('Error deleting task:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get dates that have tasks (for calendar dot indicators).
 */
export async function getDatesWithTasks(userId) {
  try {
    const tasks = await getAllTasks(userId);
    const dates = new Set(tasks.map((t) => t.date).filter(Boolean));
    return [...dates];
  } catch (error) {
    console.error('Error fetching task dates:', error);
    return [];
  }
}
