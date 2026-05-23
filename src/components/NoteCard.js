import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { NOTE_TYPE_LABELS } from '../constants/studyDefaults';

/**
 * Note list card showing title, preview, subject tag, pinned icon, timestamp.
 */
export default function NoteCard({ note, onPress, onLongPress, style }) {
  const { colors, Typography } = useTheme();
  const typeInfo = NOTE_TYPE_LABELS[note.contentType] || NOTE_TYPE_LABELS.manual;

  const preview = note.content
    ? note.content.substring(0, 100) + (note.content.length > 100 ? '…' : '')
    : note.sections?.length
      ? note.sections[0]?.content?.substring(0, 100) + '…'
      : 'No content';

  const timeAgo = note.updatedAt?.toDate
    ? formatTimeAgo(note.updatedAt.toDate())
    : '';

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      onLongPress={onLongPress}
      style={[
        styles.container,
        {
          backgroundColor: colors.shimmer,
          borderColor: note.isPinned ? `${colors.primary}55` : `${colors.primary}22`,
        },
        style,
      ]}
    >
      <View style={styles.topRow}>
        <View style={styles.titleRow}>
          {note.isPinned && (
            <Ionicons name="pin" size={14} color={colors.primary} style={styles.pinIcon} />
          )}
          <Text
            style={[styles.title, { color: colors.text }]}
            numberOfLines={1}
          >
            {note.title || 'Untitled'}
          </Text>
        </View>
        {note.createdByAI && (
          <View style={[styles.aiBadge, { backgroundColor: `${colors.primary}1A` }]}>
            <Text style={[styles.aiBadgeText, { color: colors.primary }]}>AI</Text>
          </View>
        )}
      </View>

      <Text
        style={[styles.preview, { color: colors.textSecondary }]}
        numberOfLines={2}
      >
        {preview}
      </Text>

      <View style={styles.bottomRow}>
        <View style={styles.metaRow}>
          {note.subject ? (
            <View style={[styles.subjectTag, { backgroundColor: `${colors.blueAccent}1A` }]}>
              <Text style={[styles.subjectText, { color: colors.blueAccent }]}>{note.subject}</Text>
            </View>
          ) : null}

          <View style={[styles.typeTag, { backgroundColor: `${colors.textTertiary}1A` }]}>
            <Ionicons name={typeInfo.icon} size={12} color={colors.textSecondary} />
            <Text style={[styles.typeText, { color: colors.textSecondary }]}>{typeInfo.label}</Text>
          </View>
        </View>

        {timeAgo ? (
          <Text style={[styles.time, { color: colors.textTertiary }]}>{timeAgo}</Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

function formatTimeAgo(date) {
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return date.toLocaleDateString();
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
    marginBottom: 6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  pinIcon: {
    marginRight: 6,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  aiBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  aiBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  preview: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 10,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  subjectTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  subjectText: {
    fontSize: 11,
    fontWeight: '600',
  },
  typeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  typeText: {
    fontSize: 11,
    fontWeight: '500',
  },
  time: {
    fontSize: 11,
  },
});
