import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function SessionCompleteModal({
  visible,
  duration,
  mode,
  subject,
  onSave,
  onDismiss,
  colors,
}) {
  const c = colors || {};
  const bgColor = c.background || '#0D0D0D';
  const surfaceColor = c.surface || '#1A1A1A';
  const primaryColor = c.primary || '#FBC02D';
  const textColor = c.text || '#FFFFFF';
  const subColor = c.textSecondary || '#A0A0A0';
  const overlayColor = c.overlay || 'rgba(0,0,0,0.45)';

  const formatDuration = (secs) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    if (mins >= 60) {
      const hrs = Math.floor(mins / 60);
      const remainMins = mins % 60;
      return `${hrs}h ${remainMins}m`;
    }
    return s > 0 ? `${mins}m ${s}s` : `${mins}m`;
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={[styles.overlay, { backgroundColor: overlayColor }]}>
        <View style={[styles.card, { backgroundColor: surfaceColor, borderColor: `${primaryColor}33` }]}>
          {/* Celebration Icon */}
          <View style={[styles.iconCircle, { backgroundColor: `${primaryColor}1A` }]}>
            <Text style={styles.emoji}>🎉</Text>
          </View>

          <Text style={[styles.title, { color: textColor }]}>Session Complete!</Text>

          {subject ? (
            <Text style={[styles.subject, { color: primaryColor }]}>{subject}</Text>
          ) : null}

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="time-outline" size={18} color={primaryColor} />
              <Text style={[styles.statValue, { color: textColor }]}>
                {formatDuration(duration || 0)}
              </Text>
              <Text style={[styles.statLabel, { color: subColor }]}>Duration</Text>
            </View>

            <View style={[styles.divider, { backgroundColor: `${textColor}15` }]} />

            <View style={styles.statItem}>
              <Ionicons name="flash-outline" size={18} color={primaryColor} />
              <Text style={[styles.statValue, { color: textColor }]}>
                {mode || 'Focus'}
              </Text>
              <Text style={[styles.statLabel, { color: subColor }]}>Mode</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: primaryColor }]}
            onPress={onSave}
            activeOpacity={0.8}
          >
            <Ionicons name="checkmark-circle" size={20} color="#000" />
            <Text style={styles.saveButtonText}>Save & Continue</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.dismissButton}
            onPress={onDismiss}
            activeOpacity={0.7}
          >
            <Text style={[styles.dismissText, { color: subColor }]}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  card: {
    width: '100%',
    borderRadius: 24,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  emoji: {
    fontSize: 36,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  subject: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
    gap: 24,
  },
  statItem: {
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
  },
  divider: {
    width: 1,
    height: 40,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 30,
    width: '100%',
    gap: 8,
    marginBottom: 12,
  },
  saveButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  dismissButton: {
    paddingVertical: 8,
  },
  dismissText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
