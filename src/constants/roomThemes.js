/**
 * Central study-room theme → ambience / imagery config (Mixkit SFX + Kevin MacLeod / incompetech).
 * Mixkit: https://mixkit.co/license/#sfxFree · incompetech: https://incompetech.com/music/royalty-free/
 */

/** @typedef {{ primary: string, secondary?: string, secondaryVolume?: number }} AmbienceLayers */

/** Mixkit SFX preview MP3 (stable CDN; loops in-app). */
function mixkitSfx(id) {
  return `https://assets.mixkit.co/active_storage/sfx/${id}/${id}-preview.mp3`;
}

/** Default rain + thunder loop if a theme URL fails to load. */
export const FALLBACK_AMBIENCE_LAYERS = {
  primary: mixkitSfx(2390),
};

const INCOMPETECH_BASE = 'https://incompetech.com/music/royalty-free/mp3-royaltyfree';

/** @type {ReadonlyArray<{ id: string, displayName: string, backgroundImage: string, ambienceAudioUrl: string, musicLabel?: string, ambienceLayers?: AmbienceLayers }>} */
export const ROOM_THEMES_CONFIG = [
  {
    id: 'rainy-night',
    displayName: 'Rainy Night',
    backgroundImage:
      'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?w=1200&q=80&auto=format&fit=crop',
    ambienceAudioUrl: mixkitSfx(2393),
    musicLabel: 'Rain ambience',
    ambienceLayers: {
      primary: mixkitSfx(2393),
      secondary: mixkitSfx(2395),
      secondaryVolume: 0.11,
    },
  },
  {
    id: 'cozy-cafe',
    displayName: 'Cozy Cafe',
    backgroundImage:
      'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=1200&q=80&auto=format&fit=crop',
    ambienceAudioUrl: mixkitSfx(444),
    musicLabel: 'Cafe focus',
    ambienceLayers: {
      primary: mixkitSfx(444),
      secondary: mixkitSfx(452),
      secondaryVolume: 0.18,
    },
  },
  {
    id: 'deep-focus',
    displayName: 'Deep Focus',
    backgroundImage:
      'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?w=1200&q=80&auto=format&fit=crop',
    ambienceAudioUrl: `${INCOMPETECH_BASE}/Garden%20Music.mp3`,
    musicLabel: 'Soft focus music',
    ambienceLayers: {
      primary: `${INCOMPETECH_BASE}/Garden%20Music.mp3`,
    },
  },
  {
    id: 'sunset-lofi',
    displayName: 'Sunset Lo-fi',
    backgroundImage:
      'https://images.unsplash.com/photo-1495616811223-94d346f9d00b?w=1200&q=80&auto=format&fit=crop',
    ambienceAudioUrl: `${INCOMPETECH_BASE}/Night%20on%20the%20Docks%20-%20Sax.mp3`,
    musicLabel: 'Lo-fi beats',
    ambienceLayers: {
      primary: `${INCOMPETECH_BASE}/Night%20on%20the%20Docks%20-%20Sax.mp3`,
    },
  },
  {
    id: 'forest',
    displayName: 'Forest',
    backgroundImage:
      'https://images.unsplash.com/photo-1448375240586-882707db888b?w=1200&q=80&auto=format&fit=crop',
    ambienceAudioUrl: mixkitSfx(1210),
    musicLabel: 'Forest calm',
    ambienceLayers: {
      primary: mixkitSfx(1210),
      secondary: mixkitSfx(1213),
      secondaryVolume: 0.2,
    },
  },
  {
    id: 'late-night-library',
    displayName: 'Late Night Library',
    backgroundImage:
      'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=1200&q=80&auto=format&fit=crop',
    ambienceAudioUrl: mixkitSfx(447),
    musicLabel: 'Library hush',
    ambienceLayers: {
      primary: mixkitSfx(447),
      secondary: mixkitSfx(1099),
      secondaryVolume: 0.14,
    },
  },
];

/** Firestore / UI theme ids from studyRoomPresets → canonical roomThemes ids */
const LEGACY_THEME_TO_CANONICAL = {
  rainy_library: 'rainy-night',
  cafe: 'cozy-cafe',
  honeycomb: 'deep-focus',
  lofi_hive: 'sunset-lofi',
  forest: 'forest',
  night_study: 'late-night-library',
};

export const CANONICAL_THEME_IDS = ROOM_THEMES_CONFIG.map((t) => t.id);

/**
 * @param {string | undefined | null} themeId
 * @returns {string}
 */
export function resolveCanonicalThemeId(themeId) {
  if (!themeId) return 'rainy-night';
  if (CANONICAL_THEME_IDS.includes(themeId)) return themeId;
  return LEGACY_THEME_TO_CANONICAL[themeId] || 'rainy-night';
}

/**
 * @param {string | undefined | null} themeId
 * @returns {(typeof ROOM_THEMES_CONFIG)[number] | undefined}
 */
export function getRoomThemeConfig(themeId) {
  const id = resolveCanonicalThemeId(themeId);
  return ROOM_THEMES_CONFIG.find((t) => t.id === id);
}

/**
 * @param {string | undefined | null} themeId
 * @returns {AmbienceLayers}
 */
export function getThemeAmbienceLayers(themeId) {
  const row = getRoomThemeConfig(themeId);
  if (!row) return { ...FALLBACK_AMBIENCE_LAYERS };
  const layers = row.ambienceLayers || { primary: row.ambienceAudioUrl };
  if (!layers?.primary) return { ...FALLBACK_AMBIENCE_LAYERS };
  return { ...layers };
}

/**
 * Short line for under the room title (HiveMind tone).
 * @param {string | undefined | null} themeId
 */
export function getThemeAudioSubtitle(themeId) {
  const row = getRoomThemeConfig(themeId);
  return row?.musicLabel || row?.displayName || 'Hive ambience';
}
