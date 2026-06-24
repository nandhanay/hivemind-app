import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_PREFIX = '@hivemind_recent_study_rooms';
const MAX = 12;

/**
 * Build a per-user storage key. Falls back to shared key for guests / missing uid.
 */
function storageKey(userId) {
  return userId ? `${KEY_PREFIX}_${userId}` : KEY_PREFIX;
}

/**
 * @typedef {{ id: string, roomName: string, roomCode: string, joinedAt: number }} RecentRoom
 */

export async function getRecentStudyRooms(userId) {
  try {
    const raw = await AsyncStorage.getItem(storageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * @param {RecentRoom} entry
 * @param {string} [userId]
 */
export async function pushRecentStudyRoom(entry, userId) {
  if (!entry?.id) return;
  try {
    const prev = await getRecentStudyRooms(userId);
    const next = [
      { ...entry, joinedAt: entry.joinedAt || Date.now() },
      ...prev.filter((r) => r.id !== entry.id),
    ].slice(0, MAX);
    await AsyncStorage.setItem(storageKey(userId), JSON.stringify(next));
  } catch (e) {
    console.warn('pushRecentStudyRoom', e);
  }
}
