/**
 * Collaborative Study Rooms — Firestore.
 *
 * rooms/{roomId} — metadata + session fields (sessionActive, sessionEndsAt, …)
 * rooms/{roomId}/members/{uid}
 * rooms/{roomId}/tasks/{taskId}
 * rooms/{roomId}/whiteboardStrokes/{strokeId}
 *
 * Index: rooms where isPublic == true orderBy createdAt desc (composite).
 *
 * Example rules (tune in console): authenticated users read rooms; creator owns room doc;
 * members may write only their member doc; tasks read/write for signed-in users.
 */

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  Timestamp,
  writeBatch,
  increment,
} from 'firebase/firestore';
import { db } from '../config';
import {
  bannerUrlFromSeed,
  DEFAULT_FOCUS_SECONDS,
  getThemePreset,
  ROOM_QUOTES,
} from '../../constants/studyRoomPresets';

const ROOMS = 'rooms';

function roomsCol() {
  return collection(db, ROOMS);
}

function roomRef(roomId) {
  return doc(db, ROOMS, roomId);
}

function membersCol(roomId) {
  return collection(db, ROOMS, roomId, 'members');
}

function memberRef(roomId, uid) {
  return doc(db, ROOMS, roomId, 'members', uid);
}

function tasksCol(roomId) {
  return collection(db, ROOMS, roomId, 'tasks');
}

function taskRef(roomId, taskId) {
  return doc(db, ROOMS, roomId, 'tasks', taskId);
}

function wbStrokeCol(roomId) {
  return collection(db, ROOMS, roomId, 'whiteboardStrokes');
}

function wbStrokeRef(roomId, strokeId) {
  return doc(db, ROOMS, roomId, 'whiteboardStrokes', strokeId);
}

export function generateRoomCode() {
  const n = Math.floor(1000 + Math.random() * 9000);
  return `HIVE-${n}`;
}

async function isRoomCodeTaken(code) {
  const q = query(roomsCol(), where('roomCode', '==', code), limit(1));
  const snap = await getDocs(q);
  return !snap.empty;
}

export async function generateUniqueRoomCode(maxAttempts = 12) {
  for (let i = 0; i < maxAttempts; i += 1) {
    const code = generateRoomCode();
    // eslint-disable-next-line no-await-in-loop
    const taken = await isRoomCodeTaken(code);
    if (!taken) return code;
  }
  return `HIVE-${Date.now().toString().slice(-4)}`;
}

export async function createStudyRoom(params) {
  const {
    creatorId,
    creatorName,
    roomName,
    theme,
    ambience,
    isPublic,
    focusGoal = '',
  } = params;

  if (!creatorId) {
    return { success: false, error: 'Sign in to create a room.' };
  }

  try {
    const roomCode = await generateUniqueRoomCode();
    const preset = getThemePreset(theme);
    const bannerUrl = bannerUrlFromSeed(preset.bannerSeed);
    const quote = ROOM_QUOTES[Math.floor(Math.random() * ROOM_QUOTES.length)];

    const batch = writeBatch(db);
    const roomDoc = doc(roomsCol());
    const rid = roomDoc.id;

    batch.set(roomDoc, {
      creatorId,
      creatorName: creatorName || 'Bee',
      roomName: roomName?.trim() || 'Untitled Hive',
      theme: theme || preset.id,
      ambience: ambience || 'rain',
      roomCode,
      isPublic: Boolean(isPublic),
      focusGoal: focusGoal?.trim() || '',
      bannerUrl,
      quote,
      createdAt: serverTimestamp(),
      totalFocusSeconds: 0,
      streakDays: 0,
      sessionActive: false,
      sessionEndsAt: null,
      sessionTotalSec: DEFAULT_FOCUS_SECONDS,
      sessionPausedRemainingSec: DEFAULT_FOCUS_SECONDS,
      sessionLeaderUid: null,
      sessionUpdatedAt: null,
    });

    batch.set(memberRef(rid, creatorId), {
      displayName: creatorName || 'Bee',
      isStudying: false,
      isQueen: true,
      joinedAt: serverTimestamp(),
      avatarHue: Math.floor(Math.random() * 360),
      beeStatus: 'idle',
      needsHelp: false,
      isExplaining: false,
    });

    await batch.commit();
    return { success: true, roomId: rid, roomCode };
  } catch (e) {
    console.error('createStudyRoom', e);
    return { success: false, error: e.message || 'Could not create room.' };
  }
}

export async function findRoomByCode(rawCode) {
  const code = (rawCode || '').trim().toUpperCase();
  if (!/^HIVE-\d{4}$/.test(code)) {
    return { success: false, error: 'Use format HIVE-1234' };
  }
  try {
    const q = query(roomsCol(), where('roomCode', '==', code), limit(1));
    const snap = await getDocs(q);
    if (snap.empty) {
      return { success: false, error: 'No hive found with that code.' };
    }
    const d = snap.docs[0];
    return { success: true, roomId: d.id, room: { id: d.id, ...d.data() } };
  } catch (e) {
    console.error('findRoomByCode', e);
    return { success: false, error: e.message || 'Lookup failed.' };
  }
}

export function subscribePublicRooms(callback, errCallback) {
  const q = query(roomsCol(), where('isPublic', '==', true), orderBy('createdAt', 'desc'), limit(40));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      callback(list);
    },
    (err) => {
      console.warn('subscribePublicRooms', err);
      if (errCallback) errCallback(err);
      callback([]);
    }
  );
}

export function subscribeRoom(roomId, callback, errCallback) {
  const ref = roomRef(roomId);
  return onSnapshot(
    ref,
    (snap) => {
      if (!snap.exists()) {
        callback(null);
        return;
      }
      callback({ id: snap.id, ...snap.data() });
    },
    (err) => {
      console.warn('subscribeRoom', err);
      if (errCallback) errCallback(err);
      callback(null);
    }
  );
}

export function subscribeMembers(roomId, callback, errCallback) {
  return onSnapshot(
    membersCol(roomId),
    (snap) => {
      const list = snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
      list.sort((a, b) => {
        const ta = a.joinedAt?.toMillis?.() ?? 0;
        const tb = b.joinedAt?.toMillis?.() ?? 0;
        return ta - tb;
      });
      callback(list);
    },
    (err) => {
      console.warn('subscribeMembers', err);
      if (errCallback) errCallback(err);
      callback([]);
    }
  );
}

export function subscribeTasks(roomId, callback, errCallback) {
  return onSnapshot(
    tasksCol(roomId),
    (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (a.sortIndex ?? 0) - (b.sortIndex ?? 0));
      callback(list);
    },
    (err) => {
      console.warn('subscribeTasks', err);
      if (errCallback) errCallback(err);
      callback([]);
    }
  );
}

export async function joinStudyRoomMember(roomId, uid, displayName, isQueen) {
  if (!roomId || !uid) return { success: false, error: 'Missing room or user.' };
  try {
    await setDoc(memberRef(roomId, uid), {
      displayName: displayName || 'Bee',
      isStudying: false,
      isQueen: Boolean(isQueen),
      joinedAt: serverTimestamp(),
      avatarHue: Math.floor(Math.random() * 360),
      beeStatus: 'idle',
      needsHelp: false,
      isExplaining: false,
    }, { merge: true });
    return { success: true };
  } catch (e) {
    console.error('joinStudyRoomMember', e);
    return { success: false, error: e.message };
  }
}

export async function leaveStudyRoomMember(roomId, uid) {
  if (!roomId || !uid) return { success: true };
  try {
    await deleteDoc(memberRef(roomId, uid));
    return { success: true };
  } catch (e) {
    console.error('leaveStudyRoomMember', e);
    return { success: false, error: e.message };
  }
}

export async function setMemberStudying(roomId, uid, isStudying) {
  try {
    await updateDoc(memberRef(roomId, uid), { isStudying: Boolean(isStudying) });
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * @param {object} fields — beeStatus, needsHelp, isExplaining, isStudying (subset)
 */
export async function updateMemberPresence(roomId, uid, fields) {
  if (!roomId || !uid) return { success: false, error: 'Missing id' };
  try {
    const allowed = {};
    if (fields.beeStatus != null) allowed.beeStatus = fields.beeStatus;
    if (fields.needsHelp != null) allowed.needsHelp = Boolean(fields.needsHelp);
    if (fields.isExplaining != null) allowed.isExplaining = Boolean(fields.isExplaining);
    if (fields.isStudying != null) allowed.isStudying = Boolean(fields.isStudying);
    await updateDoc(memberRef(roomId, uid), allowed);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

export function subscribeWhiteboardStrokes(roomId, callback, errCallback) {
  return onSnapshot(
    wbStrokeCol(roomId),
    (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (a.createdAt?.toMillis?.() ?? 0) - (b.createdAt?.toMillis?.() ?? 0));
      callback(list.slice(-120));
    },
    (err) => {
      console.warn('subscribeWhiteboardStrokes', err);
      if (errCallback) errCallback(err);
      callback([]);
    }
  );
}

/**
 * @param {object} stroke — kind, path (encoded string), color, width, tool, text?, x?, y?
 */
export async function addWhiteboardStroke(roomId, stroke) {
  if (!roomId || !stroke?.path) return { success: false, error: 'Invalid stroke' };
  try {
    const ref = await addDoc(wbStrokeCol(roomId), {
      ...stroke,
      createdAt: serverTimestamp(),
    });
    return { success: true, id: ref.id };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

export async function clearWhiteboardStrokes(roomId) {
  try {
    for (let i = 0; i < 25; i += 1) {
      const snap = await getDocs(query(wbStrokeCol(roomId), limit(400)));
      if (snap.empty) break;
      const batch = writeBatch(db);
      snap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

export async function addRoomTask(roomId, text, createdBy) {
  const t = (text || '').trim();
  if (!t || !roomId) return { success: false, error: 'Empty task' };
  try {
    const ref = await addDoc(tasksCol(roomId), {
      text: t,
      completed: false,
      createdBy: createdBy || '',
      createdAt: serverTimestamp(),
      sortIndex: Date.now(),
    });
    return { success: true, id: ref.id };
  } catch (e) {
    console.error('addRoomTask', e);
    return { success: false, error: e.message };
  }
}

export async function toggleRoomTask(roomId, taskId, completed) {
  try {
    await updateDoc(taskRef(roomId, taskId), { completed: Boolean(completed) });
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

export async function updateRoomAmbience(roomId, ambience) {
  try {
    await updateDoc(roomRef(roomId), { ambience, sessionUpdatedAt: serverTimestamp() });
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

export async function updateRoomTheme(roomId, theme) {
  try {
    const preset = getThemePreset(theme);
    await updateDoc(roomRef(roomId), {
      theme,
      bannerUrl: bannerUrlFromSeed(preset.bannerSeed),
      sessionUpdatedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function nowPlusSeconds(sec) {
  return Timestamp.fromMillis(Date.now() + sec * 1000);
}

export async function startRoomSession(roomId, totalSec, leaderUid) {
  const sec = Math.max(60, Math.min(4 * 60 * 60, Number(totalSec) || DEFAULT_FOCUS_SECONDS));
  try {
    await updateDoc(roomRef(roomId), {
      sessionActive: true,
      sessionTotalSec: sec,
      sessionPausedRemainingSec: sec,
      sessionEndsAt: nowPlusSeconds(sec),
      sessionLeaderUid: leaderUid || null,
      sessionUpdatedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

export async function pauseRoomSession(roomId, remainingSec) {
  const r = Math.max(0, Math.floor(Number(remainingSec) || 0));
  try {
    await updateDoc(roomRef(roomId), {
      sessionActive: false,
      sessionEndsAt: null,
      sessionPausedRemainingSec: r,
      sessionUpdatedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

export async function resumeRoomSession(roomId, remainingSec, leaderUid) {
  const r = Math.max(1, Math.floor(Number(remainingSec) || 1));
  try {
    await updateDoc(roomRef(roomId), {
      sessionActive: true,
      sessionPausedRemainingSec: r,
      sessionEndsAt: nowPlusSeconds(r),
      sessionLeaderUid: leaderUid || null,
      sessionUpdatedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

export async function resetRoomSession(roomId, totalSec) {
  const sec = Math.max(60, Math.min(4 * 60 * 60, Number(totalSec) || DEFAULT_FOCUS_SECONDS));
  try {
    await updateDoc(roomRef(roomId), {
      sessionActive: false,
      sessionEndsAt: null,
      sessionTotalSec: sec,
      sessionPausedRemainingSec: sec,
      sessionLeaderUid: null,
      sessionUpdatedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

export async function addRoomFocusSeconds(roomId, delta) {
  const d = Math.max(0, Math.floor(Number(delta) || 0));
  if (!d || !roomId) return { success: true };
  try {
    await updateDoc(roomRef(roomId), {
      totalFocusSeconds: increment(d),
      sessionUpdatedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}
