import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

export default function HoneyButton({ title, onPress, icon, style, variant = 'primary', disabled = false }) {
  const { colors } = useTheme();
  const isPrimary = variant === 'primary';

  return (
    <TouchableOpacity
      style={[
        styles.button,
        isPrimary
          ? { backgroundColor: colors.primary, shadowColor: colors.primary }
          : { backgroundColor: colors.surfaceHighlight, borderWidth: 1, borderColor: colors.primary },
        disabled && { opacity: 0.5 },
        style,
      ]}
      onPress={onPress}
      activeOpacity={0.8}
      disabled={disabled}
    >
      {icon && (
        <Ionicons
          name={icon}
          size={20}
          color={isPrimary ? '#000' : colors.primary}
          style={styles.icon}
        />
      )}
      <Text style={[styles.text, isPrimary ? styles.primaryText : { color: colors.primary }]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 30,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  icon: {
    marginRight: 8,
  },
  text: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  primaryText: {
    color: '#000',
  },
});
