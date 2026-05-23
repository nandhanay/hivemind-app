import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import ProgressBar from './ProgressBar';

/**
 * Weak topic list card with weakness score, mastery progress, subject.
 */
export default function WeakTopicCard({ topic, onPress, style }) {
  const { colors } = useTheme();
  const score = topic.weaknessScore || 0;
  const mastery = topic.masteryProgress || 0;

  const severity = score >= 70 ? 'critical' : score >= 40 ? 'moderate' : 'mild';
  const severityColor = severity === 'critical'
    ? colors.danger
    : severity === 'moderate'
      ? '#FF9800'
      : colors.greenAccent;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[
        styles.container,
        {
          backgroundColor: colors.shimmer,
          borderColor: `${severityColor}33`,
          borderLeftColor: severityColor,
          borderLeftWidth: 3,
        },
        style,
      ]}
    >
      <View style={styles.topRow}>
        <View style={styles.titleRow}>
          <Ionicons
            name={severity === 'critical' ? 'alert-circle' : severity === 'moderate' ? 'warning' : 'checkmark-circle'}
            size={18}
            color={severityColor}
            style={styles.icon}
          />
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {topic.topicName}
          </Text>
        </View>
        <View style={[styles.scoreBadge, { backgroundColor: `${severityColor}1A` }]}>
          <Text style={[styles.scoreText, { color: severityColor }]}>{score}%</Text>
        </View>
      </View>

      {topic.subject ? (
        <View style={[styles.subjectTag, { backgroundColor: `${colors.blueAccent}14` }]}>
          <Text style={[styles.subjectText, { color: colors.blueAccent }]}>{topic.subject}</Text>
        </View>
      ) : null}

      <View style={styles.progressRow}>
        <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>Mastery</Text>
        <ProgressBar
          progress={mastery / 100}
          color={mastery >= 70 ? colors.greenAccent : mastery >= 40 ? '#FF9800' : colors.danger}
          height={6}
        />
        <Text style={[styles.progressText, { color: colors.textTertiary }]}>{mastery}%</Text>
      </View>

      <View style={styles.bottomRow}>
        <Text style={[styles.meta, { color: colors.textTertiary }]}>
          {topic.retryCount || 0} retries · {topic.linkedQuizMistakes?.length || 0} mistakes
        </Text>
        <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  icon: {
    marginRight: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  scoreBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  scoreText: {
    fontSize: 13,
    fontWeight: '700',
  },
  subjectTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: 10,
  },
  subjectText: {
    fontSize: 11,
    fontWeight: '600',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '600',
    width: 50,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    width: 30,
    textAlign: 'right',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  meta: {
    fontSize: 12,
  },
});
