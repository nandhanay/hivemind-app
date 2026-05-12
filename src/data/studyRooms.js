/**
 * Mock study room catalog — offline “featured hives” (ideas from hivemind-studyroom).
 * Live collaborative rooms use Firestore via Create / Join flows.
 */

export const MOCK_ROOM_IDS = new Set([
  'deep-focus',
  'rainy-library',
  'night-owl',
  'coding-hive',
  'pomodoro-room',
]);

export const STUDY_ROOMS = [
  {
    id: 'deep-focus',
    title: 'Deep Focus Room',
    ambientTheme: 'Mystic Forest',
    activeUsers: 12,
    onlineUsersLabel: 24,
    bannerUrl: 'https://picsum.photos/seed/hive-deep-focus/800/420',
    quote: 'Silence is the soil where deep work grows.',
    focusPresetMinutes: 25,
    themeAccent: 'forest',
    initialTasks: [
      { id: 't1', text: 'Define today’s single priority', completed: false },
      { id: 't2', text: 'Remove distractions for 25 minutes', completed: false },
      { id: 't3', text: 'Review what you learned', completed: false },
    ],
  },
  {
    id: 'rainy-library',
    title: 'Rainy Library',
    ambientTheme: 'Rainy Sanctuary',
    activeUsers: 31,
    onlineUsersLabel: 42,
    bannerUrl: 'https://picsum.photos/seed/hive-rain-library/800/420',
    quote: 'Steady rain, steady mind — page by page.',
    focusPresetMinutes: 45,
    themeAccent: 'rain',
    initialTasks: [
      { id: 't1', text: 'Read one chapter slowly', completed: false },
      { id: 't2', text: 'Summarize key arguments', completed: false },
      { id: 't3', text: 'Note questions for later', completed: false },
    ],
  },
  {
    id: 'night-owl',
    title: 'Night Owl Room',
    ambientTheme: 'Midnight Cafe',
    activeUsers: 18,
    onlineUsersLabel: 31,
    bannerUrl: 'https://picsum.photos/seed/hive-night-owl/800/420',
    quote: 'The hive is quiet; your focus can roar.',
    focusPresetMinutes: 50,
    themeAccent: 'night',
    initialTasks: [
      { id: 't1', text: 'Warm up with a 5-minute outline', completed: false },
      { id: 't2', text: 'Deep block — no tabs', completed: false },
      { id: 't3', text: 'Quick recap before sleep', completed: false },
    ],
  },
  {
    id: 'coding-hive',
    title: 'Coding Hive',
    ambientTheme: 'Terminal Glow',
    activeUsers: 47,
    onlineUsersLabel: 63,
    bannerUrl: 'https://picsum.photos/seed/hive-coding/800/420',
    quote: 'Ship small, compile calm, iterate together.',
    focusPresetMinutes: 40,
    themeAccent: 'code',
    initialTasks: [
      { id: 't1', text: 'Pick one bug or feature', completed: false },
      { id: 't2', text: 'Write the smallest test first', completed: false },
      { id: 't3', text: 'Commit with a clear message', completed: false },
    ],
  },
  {
    id: 'pomodoro-room',
    title: 'Pomodoro Room',
    ambientTheme: 'Classic Pomodoro',
    activeUsers: 56,
    onlineUsersLabel: 72,
    bannerUrl: 'https://picsum.photos/seed/hive-pomodoro/800/420',
    quote: 'Twenty-five minutes of honesty beats hours of drift.',
    focusPresetMinutes: 25,
    themeAccent: 'pomodoro',
    initialTasks: [
      { id: 't1', text: 'Set intention for this sprint', completed: false },
      { id: 't2', text: 'Timer on — phones away', completed: false },
      { id: 't3', text: 'Break: stretch + water', completed: false },
    ],
  },
];

export function getStudyRoomById(id) {
  return STUDY_ROOMS.find((r) => r.id === id) ?? null;
}
