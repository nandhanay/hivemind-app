import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@hivemind_recent_study_rooms';
const MAX = 12;

/**
 * @typedef {{ id: string, roomName: string, roomCode: string, joinedAt: number }} RecentRoom
 */

export async function getRecentStudyRooms() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * @param {RecentRoom} entry
 */
export async function pushRecentStudyRoom(entry) {
  if (!entry?.id) return;
  try {
    const prev = await getRecentStudyRooms();
    const next = [
      { ...entry, joinedAt: entry.joinedAt || Date.now() },
      ...prev.filter((r) => r.id !== entry.id),
    ].slice(0, MAX);
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
  } catch (e) {
    console.warn('pushRecentStudyRoom', e);
  }
}
