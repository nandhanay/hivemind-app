/**
 * Study room themes & ambience — Expo RN only.
 * Audio: Google-hosted OGG loops (replace with bundled assets for offline).
 */

/** @typedef {{ id: string, label: string, tint: string, bannerSeed: string, gradients: [string, string, string], glow: string, particle: string, rain?: boolean, neonPulse?: boolean, cafeWarm?: boolean }} ThemePreset */

export const ROOM_THEMES = [
  {
    id: 'rainy_library',
    label: 'Rainy Library',
    tint: 'rgba(65, 105, 225, 0.22)',
    bannerSeed: 'hive-theme-rain',
    gradients: ['rgba(25, 35, 55, 0.92)', 'rgba(40, 55, 90, 0.55)', 'rgba(13, 13, 13, 0.3)'],
    glow: 'rgba(100, 149, 237, 0.35)',
    particle: 'rgba(147, 197, 255, 0.15)',
    rain: true,
  },
  {
    id: 'forest',
    label: 'Forest Focus',
    tint: 'rgba(56, 142, 60, 0.2)',
    bannerSeed: 'hive-theme-forest',
    gradients: ['rgba(20, 40, 28, 0.9)', 'rgba(30, 70, 45, 0.5)', 'rgba(13, 13, 13, 0.25)'],
    glow: 'rgba(129, 199, 132, 0.35)',
    particle: 'rgba(165, 214, 167, 0.12)',
  },
  {
    id: 'night_study',
    label: 'Night Owl',
    tint: 'rgba(81, 45, 168, 0.22)',
    bannerSeed: 'hive-theme-night',
    gradients: ['rgba(28, 18, 48, 0.92)', 'rgba(45, 30, 78, 0.55)', 'rgba(13, 13, 20, 0.35)'],
    glow: 'rgba(171, 71, 188, 0.4)',
    particle: 'rgba(206, 147, 216, 0.12)',
  },
  {
    id: 'cafe',
    label: 'Cafe Focus',
    tint: 'rgba(183, 129, 66, 0.2)',
    bannerSeed: 'hive-theme-cafe',
    gradients: ['rgba(45, 32, 22, 0.88)', 'rgba(75, 48, 28, 0.45)', 'rgba(13, 11, 9, 0.3)'],
    glow: 'rgba(251, 192, 45, 0.28)',
    particle: 'rgba(255, 213, 128, 0.1)',
    cafeWarm: true,
  },
  {
    id: 'honeycomb',
    label: 'Honeycomb Focus',
    tint: 'rgba(251, 192, 45, 0.18)',
    bannerSeed: 'hive-theme-honey',
    gradients: ['rgba(38, 32, 14, 0.9)', 'rgba(62, 52, 18, 0.5)', 'rgba(13, 13, 13, 0.28)'],
    glow: 'rgba(251, 192, 45, 0.45)',
    particle: 'rgba(255, 241, 118, 0.14)',
  },
  {
    id: 'lofi_hive',
    label: 'Lo-fi Hive',
    tint: 'rgba(156, 39, 176, 0.18)',
    bannerSeed: 'hive-theme-lofi',
    gradients: ['rgba(40, 22, 52, 0.9)', 'rgba(88, 28, 92, 0.45)', 'rgba(13, 10, 18, 0.35)'],
    glow: 'rgba(236, 64, 122, 0.35)',
    particle: 'rgba(255, 128, 200, 0.12)',
    neonPulse: true,
  },
];

export const ROOM_AMBIENCE = [
  { id: 'rain', label: 'Rainy window', icon: 'rainy-outline' },
  { id: 'forest', label: 'Forest & birds', icon: 'leaf-outline' },
  { id: 'cafe', label: 'Cafe chatter', icon: 'cafe-outline' },
  { id: 'white_noise', label: 'White noise', icon: 'radio-outline' },
  { id: 'night', label: 'Night synth', icon: 'moon-outline' },
  { id: 'lofi', label: 'Lo-fi study', icon: 'musical-notes-outline' },
  { id: 'none', label: 'Silent hive', icon: 'volume-mute-outline' },
];

const G = 'https://actions.google.com/sounds/v1';

/** Per-ambience primary (+ optional subtle secondary) loops */
export const AMBIENCE_LAYERS = {
  rain: {
    primary: `${G}/weather/rain_heavy_loud.ogg`,
    secondary: `${G}/weather/thunder_rumble_very_close.ogg`,
    secondaryVolume: 0.1,
  },
  forest: {
    primary: `${G}/water/river_slow.ogg`,
  },
  cafe: { primary: `${G}/human_groups/coffee_shop_busy.ogg` },
  white_noise: { primary: `${G}/science_fiction/airlock.ogg` },
  night: {
    primary: `${G}/animals/cricket_chirp.ogg`,
  },
  /** Replace URL with your licensed lo-fi loop for production */
  lofi: {
    primary: 'https://cdn.pixabay.com/download/audio/2022/03/24/audio_8e7b1b3b0c.mp3?filename=lofi-study-beat-112777.mp3',
  },
  none: null,
};

/** Backward compat map */
export const AMBIENCE_AUDIO_URLS = {
  rain: AMBIENCE_LAYERS.rain?.primary,
  forest: AMBIENCE_LAYERS.forest?.primary,
  cafe: AMBIENCE_LAYERS.cafe?.primary,
  white_noise: AMBIENCE_LAYERS.white_noise?.primary,
  night: AMBIENCE_LAYERS.night?.primary,
  lofi: AMBIENCE_LAYERS.lofi?.primary,
  none: null,
};

export function getAmbienceLayers(ambienceId) {
  return AMBIENCE_LAYERS[ambienceId] || AMBIENCE_LAYERS.none;
}

export const DEFAULT_FOCUS_SECONDS = 25 * 60;

export const BEE_STATUSES = [
  { id: 'idle', label: 'Idle', icon: 'ellipse-outline' },
  { id: 'studying', label: 'Studying', icon: 'book-outline' },
  { id: 'solving', label: 'Solving', icon: 'bulb-outline' },
  { id: 'helping', label: 'Helping', icon: 'hand-left-outline' },
  { id: 'break', label: 'Break', icon: 'cafe-outline' },
];

export const ROOM_QUOTES = [
  'Small steps in the hive add up to big wins.',
  'Focus is contagious — keep buzzing.',
  'Deep work is the honey of the mind.',
  'Together we hold the silence sacred.',
];

export function bannerUrlFromSeed(seed, w = 800, h = 360) {
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/${w}/${h}`;
}

export function getThemePreset(id) {
  return ROOM_THEMES.find((t) => t.id === id) || ROOM_THEMES[0];
}

export function getAmbiencePreset(id) {
  return ROOM_AMBIENCE.find((a) => a.id === id) || ROOM_AMBIENCE[0];
}
