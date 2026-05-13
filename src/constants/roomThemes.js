/**
 * Central study-room theme → ambience / imagery config.
 *
 * Audio sources:
 *   • Google Actions Sound Library (OGG, public CDN):
 *     https://actions.google.com/sounds/v1/{category}/{filename}.ogg
 *   • Pixabay Content License (royalty-free MP3):
 *     https://cdn.pixabay.com/download/audio/...
 *
 * All URLs are publicly accessible, royalty-free, and loopable.
 */

/** @typedef {{ primary: string, secondary?: string, secondaryVolume?: number }} AmbienceLayers */

const G = 'https://actions.google.com/sounds/v1';

/**
 * Default rain + thunder fallback if any theme URL fails to load.
 * Uses Google's reliable CDN — same source that powers "rainy-night".
 */
export const FALLBACK_AMBIENCE_LAYERS = {
  primary: `${G}/weather/rain_heavy_loud.ogg`,
};

/**
 * @type {ReadonlyArray<{
 *   id: string,
 *   displayName: string,
 *   backgroundImage: string,
 *   ambienceAudioUrl: string,
 *   musicLabel: string,
 *   ambienceLayers: AmbienceLayers
 * }>}
 */
export const ROOM_THEMES_CONFIG = [
  /* ── Rainy Night ─────────────────────────────────────────────────── */
  {
    id: 'rainy-night',
    displayName: 'Rainy Night',
    backgroundImage:
      'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?w=1200&q=80&auto=format&fit=crop',
    ambienceAudioUrl: `${G}/weather/rain_heavy_loud.ogg`,
    musicLabel: 'Rain ambience',
    ambienceLayers: {
      primary: `${G}/weather/rain_heavy_loud.ogg`,
      secondary: `${G}/weather/thunder_crack.ogg`,
      secondaryVolume: 0.09,
    },
  },

  /* ── Cozy Cafe ───────────────────────────────────────────────────── */
  {
    id: 'cozy-cafe',
    displayName: 'Cozy Cafe',
    backgroundImage:
      'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=1200&q=80&auto=format&fit=crop',
    ambienceAudioUrl: `${G}/ambiences/coffee_shop.ogg`,
    musicLabel: 'Cafe focus',
    ambienceLayers: {
      primary: `${G}/ambiences/coffee_shop.ogg`,
    },
  },

  /* ── Deep Focus ──────────────────────────────────────────────────── */
  {
    id: 'deep-focus',
    displayName: 'Deep Focus',
    backgroundImage:
      'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?w=1200&q=80&auto=format&fit=crop',
    ambienceAudioUrl:
      'https://cdn.pixabay.com/download/audio/2022/02/23/audio_ea70ad08e0.mp3?filename=reflected-light-147979.mp3',
    musicLabel: 'Soft focus music',
    ambienceLayers: {
      primary:
        'https://cdn.pixabay.com/download/audio/2022/02/23/audio_ea70ad08e0.mp3?filename=reflected-light-147979.mp3',
    },
  },

  /* ── Sunset Lo-fi ────────────────────────────────────────────────── */
  {
    id: 'sunset-lofi',
    displayName: 'Sunset Lo-fi',
    backgroundImage:
      'https://images.unsplash.com/photo-1495616811223-94d346f9d00b?w=1200&q=80&auto=format&fit=crop',
    ambienceAudioUrl:
      'https://cdn.pixabay.com/download/audio/2022/03/24/audio_8e7b1b3b0c.mp3?filename=lofi-study-beat-112777.mp3',
    musicLabel: 'Lo-fi beats',
    ambienceLayers: {
      primary:
        'https://cdn.pixabay.com/download/audio/2022/03/24/audio_8e7b1b3b0c.mp3?filename=lofi-study-beat-112777.mp3',
    },
  },

  /* ── Forest ──────────────────────────────────────────────────────── */
  {
    id: 'forest',
    displayName: 'Forest',
    backgroundImage:
      'https://images.unsplash.com/photo-1448375240586-882707db888b?w=1200&q=80&auto=format&fit=crop',
    ambienceAudioUrl: `${G}/ambiences/forest_with_birds.ogg`,
    musicLabel: 'Forest calm',
    ambienceLayers: {
      primary: `${G}/ambiences/forest_with_birds.ogg`,
      secondary: `${G}/water/small_stream_in_forest.ogg`,
      secondaryVolume: 0.18,
    },
  },

  /* ── Late Night Library ──────────────────────────────────────────── */
  {
    id: 'late-night-library',
    displayName: 'Late Night Library',
    backgroundImage:
      'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=1200&q=80&auto=format&fit=crop',
    ambienceAudioUrl: `${G}/foley/book_page_turn.ogg`,
    musicLabel: 'Library hush',
    ambienceLayers: {
      primary: `${G}/ambiences/quiet_restaurant.ogg`,
      secondary: `${G}/foley/book_page_turn.ogg`,
      secondaryVolume: 0.12,
    },
  },
];

/* ─── Legacy theme-id mapping (studyRoomPresets → canonical) ────── */

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
