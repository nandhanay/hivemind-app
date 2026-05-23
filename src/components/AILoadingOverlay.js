import React from 'react';
import { View, Text, StyleSheet, Modal, ActivityIndicator, Animated } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

/**
 * Full-screen overlay shown while AI is generating content.
 * @param {object} props
 * @param {boolean} props.visible
 * @param {string} [props.message]
 */
export default function AILoadingOverlay({ visible, message = 'Generating with AI...' }) {
  const { colors } = useTheme();

  if (!visible) return null;

  return (
    <Modal transparent animationType="fade" visible={visible}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.glassBorder }]}>
          <View style={[styles.iconCircle, { backgroundColor: `${colors.primary}1A` }]}>
            <Text style={styles.beeEmoji}>🐝</Text>
          </View>
          <ActivityIndicator size="large" color={colors.primary} style={styles.spinner} />
          <Text style={[styles.message, { color: colors.text }]}>{message}</Text>
          <Text style={[styles.hint, { color: colors.textSecondary }]}>
            This may take a few seconds...
          </Text>
          {/* Animated dots */}
          <View style={styles.dotsRow}>
            {[0, 1, 2].map((i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  { backgroundColor: colors.primary, opacity: 0.3 + i * 0.25 },
                ]}
              />
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  card: {
    width: '100%',
    maxWidth: 300,
    borderRadius: 24,
    borderWidth: 1,
    padding: 32,
    alignItems: 'center',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  beeEmoji: {
    fontSize: 32,
  },
  spinner: {
    marginBottom: 16,
  },
  message: {
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  hint: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
