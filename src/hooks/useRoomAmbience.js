import { useCallback, useEffect, useRef } from 'react';
import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';
import { FALLBACK_AMBIENCE_LAYERS, getThemeAmbienceLayers } from '../constants/roomThemes';

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
 * Theme-based ambience: preload, crossfade, unload, fallback rain on error.
 * Respects master mute, user pause, "silent hive" (no ambience), and screen focus.
 */
export function useRoomAmbience({
  firestoreThemeId,
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

  const mediaKey = !ambienceEnabled ? 'silent' : `t:${firestoreThemeId || ''}`;

  useEffect(() => {
    applyEffectiveVolume(getThemeAmbienceLayers(firestoreThemeId));
  }, [applyEffectiveVolume, firestoreThemeId, effectivePaused, vol]);

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

    async function swap() {
      const layersSource = getThemeAmbienceLayers(firestoreThemeId);
      let layers =
        mediaKey === 'silent'
          ? null
          : {
              primary: layersSource.primary,
              secondary: layersSource.secondary,
              secondaryVolume: layersSource.secondaryVolume,
            };

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

      async function tryCreate(uri) {
        const { sound } = await Audio.Sound.createAsync(
          { uri },
          { shouldPlay: false, isLooping: true, volume: 0 }
        );
        return sound;
      }

      async function loadPrimary(uri) {
        try {
          return await tryCreate(uri);
        } catch {
          try {
            return await tryCreate(FALLBACK_AMBIENCE_LAYERS.primary);
          } catch {
            return null;
          }
        }
      }

      let newP = null;
      let newS = null;
      try {
        newP = await loadPrimary(layers.primary);
      } catch {
        newP = null;
      }

      if (cancelled || myGen !== genRef.current) {
        await unloadSafe(newP);
        return;
      }

      if (!newP) {
        prevMediaKeyRef.current = mediaKey;
        return;
      }

      const targetVol = effectivePaused ? 0 : vol;

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

      if (layers.secondary) {
        try {
          newS = await tryCreate(layers.secondary);
        } catch {
          newS = null;
        }
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

      await fadeVolume(newP, 0, targetVol);
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
  }, [mediaKey, firestoreThemeId]);

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

  useEffect(() => {
    const layers = getThemeAmbienceLayers(firestoreThemeId);
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
  }, [effectivePaused, applyEffectiveVolume, firestoreThemeId, mediaKey]);
}
