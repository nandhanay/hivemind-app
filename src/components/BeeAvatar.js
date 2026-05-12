import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';

/**
 * Honey bee avatar for study room presence. Queen gets crown ribbon + glow.
 */
export default function BeeAvatar({
  size = 52,
  isQueen = false,
  isStudying = false,
  avatarHue = 48,
  float = true,
  beeStatus = 'idle',
  needsHelp = false,
  isExplaining = false,
  themeId = '',
}) {
  const { colors } = useTheme();
  const bob = useRef(new Animated.Value(0)).current;
  const slowFloat = themeId === 'lofi_hive';

  useEffect(() => {
    if (!float) return undefined;
    const base = slowFloat ? 3200 : 2200;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, {
          toValue: 1,
          duration: base + (avatarHue % 5) * 120,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(bob, {
          toValue: 0,
          duration: base + (avatarHue % 5) * 120,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [bob, float, avatarHue, slowFloat]);

  const translateY = bob.interpolate({
    inputRange: [0, 1],
    outputRange: [0, slowFloat ? -4 : -6],
  });

  const ringColor = isQueen ? colors.primary : `hsla(${avatarHue}, 70%, 55%, 0.55)`;
  const glow = isQueen ? `${colors.primary}55` : `${colors.surfaceHighlight}`;

  const activeStudy = isStudying || beeStatus === 'studying' || beeStatus === 'solving';

  return (
    <Animated.View style={{ alignItems: 'center', transform: [{ translateY }] }}>
      {needsHelp && (
        <View style={[styles.bubble, { borderColor: colors.primary, backgroundColor: colors.surface }]}>
          <Text style={{ fontSize: 9, fontWeight: '800', color: colors.primary }}>?</Text>
        </View>
      )}
      {isExplaining && !needsHelp && (
        <View style={[styles.bubble, { borderColor: colors.greenAccent, backgroundColor: colors.surface }]}>
          <Ionicons name="chatbubbles-outline" size={10} color={colors.greenAccent} />
        </View>
      )}
      {isQueen && (
        <View style={[styles.crownRow, { marginBottom: 2 }]}>
          <Ionicons name="ribbon" size={16} color={colors.primary} />
        </View>
      )}
      <View
        style={[
          styles.avatarRing,
          {
            width: size + 8,
            height: size + 8,
            borderRadius: (size + 8) / 2,
            borderColor: needsHelp ? colors.primary : ringColor,
            shadowColor: isQueen ? colors.primary : colors.text,
            backgroundColor: colors.surface,
          },
          isQueen && styles.queenGlow,
        ]}
      >
        <View
          style={[
            styles.inner,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: glow,
              borderWidth: activeStudy ? 2 : 1,
              borderColor: activeStudy ? colors.greenAccent : colors.glassBorder,
            },
          ]}
        >
          <Text style={{ fontSize: size * 0.42 }} accessibilityLabel="Bee avatar">
            🐝
          </Text>
        </View>
      </View>
      {activeStudy && <View style={[styles.dot, { backgroundColor: colors.greenAccent }]} />}
      {beeStatus === 'helping' && (
        <View style={[styles.statusPill, { borderColor: colors.greenAccent, backgroundColor: colors.shimmer }]}>
          <Ionicons name="hand-left-outline" size={10} color={colors.greenAccent} />
        </View>
      )}
      {beeStatus === 'break' && (
        <View style={[styles.statusPill, { borderColor: colors.primary, backgroundColor: colors.shimmer }]}>
          <Ionicons name="cafe-outline" size={10} color={colors.primary} />
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  crownRow: {
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarRing: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  queenGlow: {
    shadowOpacity: 0.55,
    shadowRadius: 14,
  },
  inner: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  dot: {
    marginTop: 4,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  bubble: {
    position: 'absolute',
    top: -4,
    zIndex: 2,
    minWidth: 22,
    minHeight: 22,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  statusPill: {
    marginTop: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
  },
});
