import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';

/**
 * Floating Action Button — gold primary, positioned bottom-right.
 * @param {object} props
 * @param {function} props.onPress
 * @param {string} [props.icon]
 * @param {object} [props.style]
 */
export default function FAB({ onPress, icon = 'add', style }) {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[
        styles.fab,
        {
          backgroundColor: colors.primary,
          shadowColor: colors.primary,
        },
        style,
      ]}
    >
      <Ionicons name={icon} size={28} color="#000" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 100,
  },
});
