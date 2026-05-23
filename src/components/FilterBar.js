import React from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';

/**
 * Horizontal scrollable filter/sort bar.
 * @param {object} props
 * @param {Array<{ key: string, label: string, icon?: string }>} props.filters
 * @param {string} props.activeFilter
 * @param {function} props.onFilterChange
 * @param {object} [props.style]
 */
export default function FilterBar({ filters, activeFilter, onFilterChange, style }) {
  const { colors } = useTheme();

  return (
    <View style={[styles.wrapper, style]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {filters.map((f) => {
          const active = activeFilter === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              activeOpacity={0.8}
              onPress={() => onFilterChange(f.key)}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? `${colors.primary}24` : colors.shimmer,
                  borderColor: active ? `${colors.primary}55` : colors.glassBorder,
                },
              ]}
            >
              {f.icon && (
                <Ionicons
                  name={f.icon}
                  size={14}
                  color={active ? colors.primary : colors.textSecondary}
                  style={styles.chipIcon}
                />
              )}
              <Text
                style={[
                  styles.chipText,
                  { color: active ? colors.primary : colors.textSecondary },
                ]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 12,
  },
  scrollContent: {
    paddingHorizontal: 2,
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipIcon: {
    marginRight: 6,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
