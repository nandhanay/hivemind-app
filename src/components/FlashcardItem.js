import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { FLASHCARD_TYPE_LABELS, DIFFICULTY_COLORS } from '../constants/studyDefaults';

/**
 * Compact flashcard list item.
 */
export default function FlashcardItem({ card, onPress, onLongPress, style }) {
  const { colors } = useTheme();
  const typeInfo = FLASHCARD_TYPE_LABELS[card.type] || FLASHCARD_TYPE_LABELS.recall;
  const diffColor = DIFFICULTY_COLORS[card.difficulty] || DIFFICULTY_COLORS.medium;

  const isDue = card.nextReviewDate?.toMillis
    ? card.nextReviewDate.toMillis() <= Date.now()
    : true;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      onLongPress={onLongPress}
      style={[
        styles.container,
        {
          backgroundColor: colors.shimmer,
          borderColor: isDue ? `${colors.primary}44` : colors.glassBorder,
        },
        style,
      ]}
    >
      <View style={styles.row}>
        <View style={[styles.typeIcon, { backgroundColor: `${typeInfo.color}1A` }]}>
          <Ionicons name={typeInfo.icon} size={18} color={typeInfo.color} />
        </View>

        <View style={styles.content}>
          <Text style={[styles.question, { color: colors.text }]} numberOfLines={2}>
            {card.question}
          </Text>
          <View style={styles.metaRow}>
            {card.subject ? (
              <View style={[styles.tag, { backgroundColor: `${colors.blueAccent}14` }]}>
                <Text style={[styles.tagText, { color: colors.blueAccent }]}>{card.subject}</Text>
              </View>
            ) : null}
            <View style={[styles.tag, { backgroundColor: `${diffColor}14` }]}>
              <Text style={[styles.tagText, { color: diffColor }]}>{card.difficulty}</Text>
            </View>
            {isDue && (
              <View style={[styles.tag, { backgroundColor: `${colors.primary}14` }]}>
                <Text style={[styles.tagText, { color: colors.primary }]}>Due</Text>
              </View>
            )}
          </View>
        </View>

        <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
    marginRight: 8,
  },
  question: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 6,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
