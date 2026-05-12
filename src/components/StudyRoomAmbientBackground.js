import React, { useEffect, useMemo, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getThemePreset } from '../constants/studyRoomPresets';

const PARTICLE_COUNT = 10;

function RainStripes({ color, speed = 1 }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(anim, {
        toValue: 1,
        duration: 2200 / speed,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [anim, speed]);

  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 28],
  });

  const stripes = useMemo(() => Array.from({ length: 18 }, (_, i) => i), []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {stripes.map((i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            left: `${(i * 5.5) % 100}%`,
            top: -40 + (i % 3) * 12,
            width: 1,
            height: 48,
            backgroundColor: color,
            opacity: 0.12 + (i % 4) * 0.03,
            transform: [{ translateY }],
          }}
        />
      ))}
    </View>
  );
}

function Particles({ color }) {
  const nodes = useMemo(() => Array.from({ length: PARTICLE_COUNT }, (_, i) => i), []);
  const anims = useRef(nodes.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const loops = anims.map((a, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(a, {
            toValue: 1,
            duration: 4000 + i * 220,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(a, {
            toValue: 0,
            duration: 4000 + i * 220,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ])
      )
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [anims, nodes]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {nodes.map((i) => {
        const ty = anims[i].interpolate({
          inputRange: [0, 1],
          outputRange: [0, -10],
        });
        const op = anims[i].interpolate({
          inputRange: [0, 1],
          outputRange: [0.08, 0.22],
        });
        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              width: 4 + (i % 3) * 2,
              height: 4 + (i % 3) * 2,
              borderRadius: 4,
              left: `${8 + i * 9}%`,
              top: `${12 + (i * 7) % 55}%`,
              backgroundColor: color,
              opacity: op,
              transform: [{ translateY: ty }],
            }}
          />
        );
      })}
    </View>
  );
}

/**
 * Subtle immersive layer behind scroll content (fixed to parent flex area).
 */
export default function StudyRoomAmbientBackground({ themeId, ambienceId }) {
  const preset = useMemo(() => getThemePreset(themeId), [themeId]);
  const drift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, {
          toValue: 1,
          duration: preset.neonPulse ? 5200 : 8000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(drift, {
          toValue: 0,
          duration: preset.neonPulse ? 5200 : 8000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [drift, preset.neonPulse]);

  const shift = drift.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 18],
  });

  const g = preset.gradients || ['rgba(0,0,0,0.85)', 'rgba(0,0,0,0.4)', 'transparent'];

  return (
    <View style={styles.wrap} pointerEvents="none">
      <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateX: shift }] }]}>
        <LinearGradient colors={g} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      </Animated.View>
      <Particles color={preset.particle || 'rgba(251,192,45,0.15)'} />
      {preset.rain || ambienceId === 'rain' ? (
        <RainStripes color="rgba(180, 200, 255, 0.35)" speed={preset.rain ? 1.1 : 0.85} />
      ) : null}
      {preset.cafeWarm ? (
        <LinearGradient
          colors={['rgba(251, 192, 45, 0.06)', 'transparent', 'rgba(80, 50, 20, 0.12)']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.2, y: 1 }}
          end={{ x: 0.9, y: 0 }}
        />
      ) : null}
      {preset.neonPulse ? (
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              opacity: drift.interpolate({ inputRange: [0, 1], outputRange: [0.04, 0.1] }),
              backgroundColor: preset.glow,
            },
          ]}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
    overflow: 'hidden',
  },
});
