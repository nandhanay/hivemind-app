/**
 * Workspace & Subject Hierarchy — Firestore Service
 *
 * users/{userId}/workspaces/{workspaceId}
 * users/{userId}/subjects/{subjectId}
 */
import {
  collection, addDoc, getDocs, doc, updateDoc, deleteDoc,
  query, where, orderBy, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config';

const WORKSPACES = 'workspaces';
const SUBJECTS = 'subjects';

// ─── Workspace CRUD ───────────────────────────────────────

export async function createWorkspace(userId, { name, color, icon }) {
  if (!userId) return { success: false, error: 'No user' };
  try {
    const ref = collection(db, 'users', userId, WORKSPACES);
    const docRef = await addDoc(ref, {
      name: name?.trim() || 'Untitled Workspace',
      color: color || '#FBC02D',
      icon: icon || 'folder-outline',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { success: true, id: docRef.id };
  } catch (e) {
    console.error('createWorkspace:', e);
    return { success: false, error: e.message };
  }
}

export async function getWorkspaces(userId) {
  if (!userId) return [];
  try {
    const ref = collection(db, 'users', userId, WORKSPACES);
    const q = query(ref, orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    const workspaces = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    
    // Auto-create default workspace and subject if none exist
    if (workspaces.length === 0) {
      const defaultWorkspaceResult = await createWorkspace(userId, {
        name: 'Main Workspace',
        color: '#FBC02D',
        icon: 'folder-open-outline',
      });
      if (defaultWorkspaceResult.success) {
        await createSubject(userId, {
          name: 'General',
          workspaceId: defaultWorkspaceResult.id,
          color: '#2196F3',
        });
        const refollowSnap = await getDocs(q);
        return refollowSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      }
    }
    return workspaces;
  } catch (e) {
    console.error('getWorkspaces:', e);
    return [];
  }
}

export async function updateWorkspace(userId, workspaceId, data) {
  if (!userId) return { success: false, error: 'No user' };
  try {
    const ref = doc(db, 'users', userId, WORKSPACES, workspaceId);
    await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
    return { success: true };
  } catch (e) {
    console.error('updateWorkspace:', e);
    return { success: false, error: e.message };
  }
}

export async function deleteWorkspace(userId, workspaceId) {
  if (!userId) return { success: false, error: 'No user' };
  try {
    const ref = doc(db, 'users', userId, WORKSPACES, workspaceId);
    await deleteDoc(ref);
    return { success: true };
  } catch (e) {
    console.error('deleteWorkspace:', e);
    return { success: false, error: e.message };
  }
}

// ─── Subject CRUD ─────────────────────────────────────────

export async function createSubject(userId, { name, workspaceId, color }) {
  if (!userId) return { success: false, error: 'No user' };
  try {
    const ref = collection(db, 'users', userId, SUBJECTS);
    const docRef = await addDoc(ref, {
      name: name?.trim() || 'Untitled Subject',
      workspaceId: workspaceId || '',
      color: color || '#2196F3',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { success: true, id: docRef.id };
  } catch (e) {
    console.error('createSubject:', e);
    return { success: false, error: e.message };
  }
}

export async function getSubjects(userId) {
  if (!userId) return [];
  try {
    const ref = collection(db, 'users', userId, SUBJECTS);
    const q = query(ref, orderBy('name', 'asc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.error('getSubjects:', e);
    return [];
  }
}

export async function getSubjectsByWorkspace(userId, workspaceId) {
  if (!userId) return [];
  try {
    const ref = collection(db, 'users', userId, SUBJECTS);
    const q = query(ref, where('workspaceId', '==', workspaceId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.error('getSubjectsByWorkspace:', e);
    return [];
  }
}

/**
 * Get unique subject names from notes/flashcards for quick filtering.
 */
export async function getUniqueSubjectNames(userId) {
  const subjects = await getSubjects(userId);
  return [...new Set(subjects.map((s) => s.name).filter(Boolean))];
}

export async function updateSubject(userId, subjectId, data) {
  if (!userId || !subjectId) return { success: false, error: 'Missing parameters' };
  try {
    const ref = doc(db, 'users', userId, SUBJECTS, subjectId);
    await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
    return { success: true };
  } catch (e) {
    console.error('updateSubject:', e);
    return { success: false, error: e.message };
  }
}

export async function deleteSubject(userId, subjectId) {
  if (!userId || !subjectId) return { success: false, error: 'Missing parameters' };
  try {
    const ref = doc(db, 'users', userId, SUBJECTS, subjectId);
    await deleteDoc(ref);
    return { success: true };
  } catch (e) {
    console.error('deleteSubject:', e);
    return { success: false, error: e.message };
  }
}
