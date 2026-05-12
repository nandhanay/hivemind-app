import React from 'react';
import { StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '../theme/ThemeContext';

export default function GlassCard({ children, style, contentStyle, intensity = 20 }) {
  const { colors, isDarkMode } = useTheme();

  return (
    <View style={[
      styles.container,
      {
        backgroundColor: colors.cardBackground,
        borderColor: colors.glassBorder,
      },
      style,
    ]}>
      <BlurView
        intensity={intensity}
        tint={isDarkMode ? 'dark' : 'light'}
        style={[styles.blurView, contentStyle]}
      >
        {children}
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
  },
  blurView: {
    padding: 20,
  },
});
