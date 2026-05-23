import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';

/**
 * Tag chip pill — can be removable or display-only.
 * @param {object} props
 * @param {string} props.label
 * @param {function} [props.onRemove]
 * @param {string} [props.color] — custom tint color
 * @param {boolean} [props.selected]
 * @param {function} [props.onPress]
 * @param {object} [props.style]
 */
export default function TagChip({ label, onRemove, color, selected, onPress, style }) {
  const { colors } = useTheme();
  const tint = color || colors.primary;

  const Wrapper = onPress ? TouchableOpacity : View;

  return (
    <Wrapper
      activeOpacity={0.8}
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? `${tint}28` : `${tint}14`,
          borderColor: selected ? `${tint}60` : `${tint}30`,
        },
        style,
      ]}
    >
      <Text style={[styles.label, { color: tint }]}>{label}</Text>
      {onRemove && (
        <TouchableOpacity onPress={onRemove} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
          <Ionicons name="close" size={14} color={tint} style={styles.removeIcon} />
        </TouchableOpacity>
      )}
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
    marginBottom: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
  removeIcon: {
    marginLeft: 6,
  },
});
