import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import BeeAvatar from './BeeAvatar';
import { useTheme } from '../theme/ThemeContext';

/**
 * Horizontal hive strip of member bees (collaborative room).
 */
export default function FloatingBeesRow({ members = [], themeId = '' }) {
  const { colors, Typography } = useTheme();

  if (!members.length) {
    return (
      <View style={[styles.empty, { borderColor: colors.glassBorder, backgroundColor: colors.shimmer }]}>
        <Text style={[Typography.caption, { color: colors.textSecondary }]}>
          Waiting for bees to land…
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {members.map((m) => (
        <View key={m.uid} style={styles.cell}>
          <BeeAvatar
            size={48}
            isQueen={Boolean(m.isQueen)}
            isStudying={Boolean(m.isStudying)}
            avatarHue={typeof m.avatarHue === 'number' ? m.avatarHue : 42}
            beeStatus={m.beeStatus || 'idle'}
            needsHelp={Boolean(m.needsHelp)}
            isExplaining={Boolean(m.isExplaining)}
            themeId={themeId}
          />
          <Text numberOfLines={1} style={[styles.name, { color: colors.text }]}>
            {m.displayName || 'Bee'}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingVertical: 8,
    paddingRight: 12,
    gap: 4,
  },
  cell: {
    width: 88,
    alignItems: 'center',
    marginHorizontal: 6,
  },
  name: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    maxWidth: 84,
  },
  empty: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
});
