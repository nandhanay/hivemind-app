import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { SCORE_THRESHOLDS } from '../constants/studyDefaults';

/**
 * Quiz history card showing title, score badge, subject, date.
 */
export default function QuizCard({ quiz, onPress, style }) {
  const { colors } = useTheme();
  const isCompleted = quiz.status === 'completed';

  const scoreColor = !isCompleted
    ? colors.textTertiary
    : quiz.percentage >= SCORE_THRESHOLDS.excellent
      ? colors.greenAccent
      : quiz.percentage >= SCORE_THRESHOLDS.good
        ? '#FF9800'
        : colors.danger;

  const dateStr = quiz.createdAt?.toDate
    ? quiz.createdAt.toDate().toLocaleDateString()
    : '';

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[
        styles.container,
        {
          backgroundColor: colors.shimmer,
          borderColor: `${scoreColor}33`,
        },
        style,
      ]}
    >
      <View style={styles.row}>
        {/* Score Circle */}
        <View style={[styles.scoreCircle, { borderColor: scoreColor }]}>
          {isCompleted ? (
            <Text style={[styles.scoreText, { color: scoreColor }]}>{quiz.percentage}%</Text>
          ) : (
            <Ionicons name="hourglass-outline" size={20} color={colors.textTertiary} />
          )}
        </View>

        <View style={styles.content}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {quiz.title || 'Untitled Quiz'}
          </Text>
          <View style={styles.metaRow}>
            {quiz.subject ? (
              <View style={[styles.tag, { backgroundColor: `${colors.purpleAccent}14` }]}>
                <Text style={[styles.tagText, { color: colors.purpleAccent }]}>{quiz.subject}</Text>
              </View>
            ) : null}
            <Text style={[styles.meta, { color: colors.textTertiary }]}>
              {quiz.totalQuestions} Q{isCompleted ? ` · ${quiz.score}/${quiz.totalQuestions}` : ' · Pending'}
            </Text>
          </View>
        </View>

        {dateStr ? (
          <Text style={[styles.date, { color: colors.textTertiary }]}>{dateStr}</Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scoreCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  scoreText: {
    fontSize: 14,
    fontWeight: '800',
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  meta: {
    fontSize: 12,
  },
  date: {
    fontSize: 11,
  },
});
