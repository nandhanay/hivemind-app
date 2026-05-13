import { useCallback, useEffect, useRef } from 'react';
import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';
import { FALLBACK_AMBIENCE_LAYERS, getThemeAmbienceLayers } from '../constants/roomThemes';
import { getAmbienceLayers } from '../constants/studyRoomPresets';

const FADE_MS = 900;
const FADE_STEPS = 16;

async function fadeVolume(sound, from, to, steps = FADE_STEPS) {
  if (!sound) return;
  const d = (to - from) / steps;
  for (let i = 1; i <= steps; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await new Promise((r) => setTimeout(r, FADE_MS / steps));
    try {
      // eslint-disable-next-line no-await-in-loop
      await sound.setStatusAsync({ volume: Math.max(0, Math.min(1, from + d * i)) });
    } catch {
      break;
    }
  }
}

async function unloadSafe(sound) {
  if (!sound) return;
  try {
    await sound.stopAsync();
  } catch {
    /* */
  }
  try {
    await sound.unloadAsync();
  } catch {
    /* */
  }
}

/**
 * Resolve which audio layers to play.
 * Priority: ambience picker selection → theme default → fallback rain.
 *
 * @param {string|null|undefined} ambienceId  — the "Hive ambience" picker value (rain, cafe, forest, lofi, none …)
 * @param {string|null|undefined} themeId     — the room visual theme (rainy_library, cafe, forest …)
 * @returns {import('../constants/roomThemes').AmbienceLayers | null}
 */
function resolveActiveLayers(ambienceId, themeId) {
  // 1) If ambience is explicitly "none" → silence
  if (ambienceId === 'none') return null;

  // 2) If user picked a specific ambience, use its audio layers
  if (ambienceId) {
    const ambienceLayers = getAmbienceLayers(ambienceId);
    if (ambienceLayers && ambienceLayers.primary) {
      return ambienceLayers;
    }
  }

  // 3) Fall back to theme-based audio
  return getThemeAmbienceLayers(themeId);
}

/**
 * Theme + ambience-based audio: preload, crossfade, unload, fallback rain on error.
 * Respects master mute, user pause, "silent hive" (no ambience), and screen focus.
 *
 * The ambience picker (room.ambience) determines WHICH audio plays.
 * The theme (room.theme) provides a fallback if no ambience is selected.
 */
export function useRoomAmbience({
  firestoreThemeId,
  firestoreAmbienceId,
  ambienceEnabled,
  masterMuted,
  userPaused,
  volume,
  isScreenFocused = true,
}) {
  const primaryRef = useRef(null);
  const secondaryRef = useRef(null);
  const genRef = useRef(0);
  const audioModeReadyRef = useRef(false);
  const prevMediaKeyRef = useRef(null);

  const effectivePaused = userPaused || masterMuted || !isScreenFocused;
  const vol = Math.max(0, Math.min(1, volume));

  // Build a media key that changes whenever theme OR ambience changes
  const mediaKey = !ambienceEnabled
    ? 'silent'
    : `a:${firestoreAmbienceId || ''}/t:${firestoreThemeId || ''}`;

  const getActiveLayers = useCallback(
    () => resolveActiveLayers(firestoreAmbienceId, firestoreThemeId),
    [firestoreAmbienceId, firestoreThemeId]
  );

  const applyEffectiveVolume = useCallback(
    async (layers) => {
      const p = primaryRef.current;
      const s = secondaryRef.current;
      const v = effectivePaused ? 0 : vol;
      try {
        if (p) await p.setStatusAsync({ volume: v });
        if (s && layers?.secondaryVolume != null) {
          await s.setStatusAsync({ volume: v * layers.secondaryVolume });
        } else if (s) {
          await s.setStatusAsync({ volume: v * 0.15 });
        }
      } catch {
        /* noop */
      }
    },
    [effectivePaused, vol]
  );

  // Set audio mode once
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (audioModeReadyRef.current || cancelled) return;
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          interruptionModeIOS: InterruptionModeIOS.MixWithOthers,
          interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
        audioModeReadyRef.current = true;
      } catch {
        /* silent */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Volume sync when paused/vol changes (no audio swap)
  useEffect(() => {
    applyEffectiveVolume(getActiveLayers());
  }, [applyEffectiveVolume, getActiveLayers, effectivePaused, vol]);

  // Main audio swap effect — triggers when mediaKey changes (theme or ambience change)
  useEffect(() => {
    let cancelled = false;
    const myGen = ++genRef.current;

    async function fadeOutSound(sound) {
      if (!sound) return;
      let from = vol;
      try {
        const st = await sound.getStatusAsync();
        if (st.isLoaded && typeof st.volume === 'number') from = st.volume;
      } catch {
        /* */
      }
      await fadeVolume(sound, from, 0);
    }

    /**
     * Create a looped sound from a URI.
     * Returns null silently if the URI fails to load (no crash).
     */
    async function tryCreate(uri) {
      try {
        const { sound } = await Audio.Sound.createAsync(
          { uri },
          { shouldPlay: false, isLooping: true, volume: 0 }
        );
        return sound;
      } catch {
        return null;
      }
    }

    /**
     * Try primary URI → if it fails, try FALLBACK rain ambience.
     * Returns null if both fail (graceful degradation, no crash).
     */
    async function loadWithFallback(uri) {
      const s = await tryCreate(uri);
      if (s) return s;
      // Primary failed — try fallback rain ambience
      if (uri !== FALLBACK_AMBIENCE_LAYERS.primary) {
        console.warn(`[useRoomAmbience] Primary audio failed, falling back to rain: ${uri}`);
        return tryCreate(FALLBACK_AMBIENCE_LAYERS.primary);
      }
      return null;
    }

    async function swap() {
      const activeLayers = getActiveLayers();
      let layers =
        mediaKey === 'silent'
          ? null
          : activeLayers
            ? {
                primary: activeLayers.primary,
                secondary: activeLayers.secondary,
                secondaryVolume: activeLayers.secondaryVolume,
              }
            : null;

      const oldP = primaryRef.current;
      const oldS = secondaryRef.current;

      if (!layers?.primary) {
        await fadeOutSound(oldP);
        await fadeOutSound(oldS);
        await unloadSafe(oldP);
        await unloadSafe(oldS);
        primaryRef.current = null;
        secondaryRef.current = null;
        prevMediaKeyRef.current = mediaKey;
        return;
      }

      // Load primary (with fallback)
      let newP = await loadWithFallback(layers.primary);

      if (cancelled || myGen !== genRef.current) {
        await unloadSafe(newP);
        return;
      }

      if (!newP) {
        prevMediaKeyRef.current = mediaKey;
        return;
      }

      const targetVol = effectivePaused ? 0 : vol;

      // Fade out old sounds before swapping
      if (oldP && prevMediaKeyRef.current != null && prevMediaKeyRef.current !== mediaKey) {
        await fadeOutSound(oldP);
      }
      if (oldS && prevMediaKeyRef.current != null && prevMediaKeyRef.current !== mediaKey) {
        await fadeOutSound(oldS);
      }

      await unloadSafe(oldP);
      await unloadSafe(oldS);
      primaryRef.current = null;
      secondaryRef.current = null;

      if (cancelled || myGen !== genRef.current) {
        await unloadSafe(newP);
        return;
      }

      primaryRef.current = newP;
      try {
        await newP.setStatusAsync({ shouldPlay: !effectivePaused, volume: 0 });
      } catch {
        /* */
      }

      // Load optional secondary layer (no fallback — it's decorative)
      let newS = null;
      if (layers.secondary) {
        newS = await tryCreate(layers.secondary);
        if (cancelled || myGen !== genRef.current) {
          await unloadSafe(newS);
          await unloadSafe(newP);
          primaryRef.current = null;
          return;
        }
        if (newS) {
          secondaryRef.current = newS;
          try {
            await newS.setStatusAsync({
              shouldPlay: !effectivePaused,
              isLooping: true,
              volume: effectivePaused ? 0 : vol * (layers.secondaryVolume ?? 0.15),
            });
          } catch {
            await unloadSafe(newS);
            secondaryRef.current = null;
          }
        }
      }

      // Fade in primary
      await fadeVolume(newP, 0, targetVol);
      // Fade in secondary
      if (secondaryRef.current) {
        const sv = effectivePaused ? 0 : vol * (layers.secondaryVolume ?? 0.15);
        await fadeVolume(secondaryRef.current, 0, sv);
      }

      prevMediaKeyRef.current = mediaKey;
    }

    swap().catch(() => {
      /* silent */
    });

    return () => {
      cancelled = true;
    };
  }, [mediaKey, firestoreAmbienceId, firestoreThemeId]);

  // Cleanup on unmount
  useEffect(
    () => () => {
      genRef.current += 1;
      const p = primaryRef.current;
      const s = secondaryRef.current;
      primaryRef.current = null;
      secondaryRef.current = null;
      unloadSafe(p);
      unloadSafe(s);
    },
    []
  );

  // Sync play/pause state and volume
  useEffect(() => {
    const layers = getActiveLayers();
    const sync = async () => {
      const p = primaryRef.current;
      const s = secondaryRef.current;
      if (!p) return;
      try {
        if (effectivePaused) {
          await p.pauseAsync();
          if (s) await s.pauseAsync();
        } else {
          await p.playAsync();
          if (s) await s.playAsync();
        }
        await applyEffectiveVolume(layers);
      } catch {
        /* */
      }
    };
    sync();
  }, [effectivePaused, applyEffectiveVolume, getActiveLayers, mediaKey]);
}
