import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';

const LEVELS = [1, 2, 3, 4, 5];
const LABELS = ['Forgot', 'Hard', 'Okay', 'Good', 'Easy'];

/**
 * Confidence rating selector (1-5 scale).
 * @param {object} props
 * @param {number} props.value — Current confidence (1-5)
 * @param {function} props.onChange — Called with new value
 * @param {object} [props.style]
 */
export default function ConfidenceSelector({ value, onChange, style }) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, style]}>
      <Text style={[styles.title, { color: colors.textSecondary }]}>How confident are you?</Text>
      <View style={styles.row}>
        {LEVELS.map((level, i) => {
          const active = value === level;
          const tint = getConfidenceColor(level, colors);

          return (
            <TouchableOpacity
              key={level}
              activeOpacity={0.8}
              onPress={() => onChange(level)}
              style={[
                styles.btn,
                {
                  backgroundColor: active ? `${tint}28` : colors.shimmer,
                  borderColor: active ? `${tint}60` : colors.glassBorder,
                },
              ]}
            >
              <Text style={[styles.number, { color: active ? tint : colors.textSecondary }]}>
                {level}
              </Text>
              <Text style={[styles.label, { color: active ? tint : colors.textTertiary }]}>
                {LABELS[i]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function getConfidenceColor(level, colors) {
  if (level <= 1) return colors.danger;
  if (level <= 2) return '#FF9800';
  if (level <= 3) return colors.primary;
  if (level <= 4) return '#8BC34A';
  return colors.greenAccent;
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  btn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  number: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
  },
});
