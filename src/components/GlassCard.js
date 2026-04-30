import React from 'react';
import { StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { Colors } from '../theme/colors';

export default function GlassCard({ children, style, intensity = 20 }) {
  return (
    <View style={[styles.container, style]}>
      <BlurView intensity={intensity} tint="dark" style={styles.blurView}>
        {children}
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(30, 30, 30, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  blurView: {
    padding: 20,
  },
});
