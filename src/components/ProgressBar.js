import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors } from '../theme/colors';

export default function ProgressBar({ progress, color = Colors.primary, height = 8 }) {
  return (
    <View style={[styles.container, { height }]}>
      <View style={[styles.fill, { width: `${Math.max(0, Math.min(100, progress * 100))}%`, backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: Colors.surfaceHighlight,
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  }
});
