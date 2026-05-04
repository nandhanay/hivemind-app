import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export default function ProgressBar({ progress, color, height = 8 }) {
  const { colors } = useTheme();
  const fillColor = color || colors.primary;

  return (
    <View style={[styles.container, { height, backgroundColor: colors.surfaceHighlight }]}>
      <View style={[styles.fill, { width: `${Math.max(0, Math.min(100, progress * 100))}%`, backgroundColor: fillColor }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
});
