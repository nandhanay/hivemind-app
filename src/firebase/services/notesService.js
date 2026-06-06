/**
 * Notes Service — Firestore CRUD + Search
 *
 * users/{userId}/notes/{noteId}
 */
import {
  collection, addDoc, getDoc, getDocs, doc, updateDoc, deleteDoc,
  query, where, orderBy, limit, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config';

const COLLECTION = 'notes';

function notesRef(userId) {
  return collection(db, 'users', userId, COLLECTION);
}

function noteDocRef(userId, noteId) {
  return doc(db, 'users', userId, COLLECTION, noteId);
}

// ─── Create ───────────────────────────────────────────────

export async function addNote(userId, note) {
  if (!userId) return { success: false, error: 'No user' };
  try {
    const docRef = await addDoc(notesRef(userId), {
      title: note.title || 'Untitled Note',
      content: note.content || '',
      contentType: note.contentType || 'manual',
      subject: note.subject || '',
      topic: note.topic || '',
      workspaceId: note.workspaceId || '',
      tags: note.tags || [],
      isPinned: note.isPinned || false,
      isArchived: note.isArchived || false,
      sourceType: note.sourceType || 'manual',
      mermaidCode: note.mermaidCode || '',
      createdByAI: note.createdByAI || false,
      aiPromptUsed: note.aiPromptUsed || '',
      // Document upload metadata & storage refs
      pdfUrl: note.pdfUrl || '',
      pdfName: note.pdfName || '',
      hasAIContent: note.hasAIContent || false,
      // Connected AI processing suite elements
      aiNotes: note.aiNotes || null,
      aiSummary: note.aiSummary || null,
      aiFlashcards: note.aiFlashcards || null,
      aiQuiz: note.aiQuiz || null,
      aiRevision: note.aiRevision || null,
      quizId: note.quizId || '',
      // Structured content sections from AI (legacy notes support)
      sections: note.sections || [],
      keyTakeaways: note.keyTakeaways || [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { success: true, id: docRef.id };
  } catch (e) {
    console.error('addNote:', e);
    return { success: false, error: e.message };
  }
}

// ─── Read ─────────────────────────────────────────────────

export async function getNote(userId, noteId) {
  if (!userId || !noteId) return null;
  try {
    const snap = await getDoc(noteDocRef(userId, noteId));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() };
  } catch (e) {
    console.error('getNote:', e);
    return null;
  }
}

export async function getNotes(userId) {
  if (!userId) return [];
  try {
    const q = query(notesRef(userId), orderBy('updatedAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.error('getNotes:', e);
    return [];
  }
}

export async function getNotesBySubject(userId, subject) {
  if (!userId || !subject) return [];
  try {
    const q = query(notesRef(userId), where('subject', '==', subject));
    const snap = await getDocs(q);
    let notes = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    notes.sort((a, b) => {
      const ta = a.updatedAt?.toMillis?.() ?? 0;
      const tb = b.updatedAt?.toMillis?.() ?? 0;
      return tb - ta;
    });
    return notes;
  } catch (e) {
    console.error('getNotesBySubject:', e);
    return [];
  }
}

export async function getRecentNotes(userId, count = 5) {
  if (!userId) return [];
  try {
    const q = query(notesRef(userId), orderBy('updatedAt', 'desc'), limit(count));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.error('getRecentNotes:', e);
    return [];
  }
}

// ─── Update ───────────────────────────────────────────────

export async function updateNote(userId, noteId, data) {
  if (!userId || !noteId) return { success: false, error: 'Missing id' };
  try {
    await updateDoc(noteDocRef(userId, noteId), {
      ...data,
      updatedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (e) {
    console.error('updateNote:', e);
    return { success: false, error: e.message };
  }
}

export async function togglePin(userId, noteId, currentValue) {
  return updateNote(userId, noteId, { isPinned: !currentValue });
}

export async function toggleArchive(userId, noteId, currentValue) {
  return updateNote(userId, noteId, { isArchived: !currentValue });
}

// ─── Delete ───────────────────────────────────────────────

export async function deleteNote(userId, noteId) {
  if (!userId || !noteId) return { success: false, error: 'Missing id' };
  try {
    await deleteDoc(noteDocRef(userId, noteId));
    return { success: true };
  } catch (e) {
    console.error('deleteNote:', e);
    return { success: false, error: e.message };
  }
}

// ─── Search (client-side) ─────────────────────────────────

export async function searchNotes(userId, queryText) {
  if (!userId || !queryText) return [];
  const allNotes = await getNotes(userId);
  const lower = queryText.toLowerCase();
  return allNotes.filter((n) =>
    n.title?.toLowerCase().includes(lower) ||
    n.content?.toLowerCase().includes(lower) ||
    n.subject?.toLowerCase().includes(lower) ||
    n.topic?.toLowerCase().includes(lower) ||
    (n.tags || []).some((t) => t.toLowerCase().includes(lower))
  );
}

// ─── Stats ────────────────────────────────────────────────

export async function getNotesCount(userId) {
  if (!userId) return 0;
  try {
    const snap = await getDocs(notesRef(userId));
    return snap.size;
  } catch (e) {
    return 0;
  }
}
