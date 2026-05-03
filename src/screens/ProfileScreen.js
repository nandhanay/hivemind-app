import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography } from '../theme/colors';
import GlassCard from '../components/GlassCard';
import HexagonBackground from '../components/HexagonBackground';
import { Ionicons } from '@expo/vector-icons';

const weeklyProgress = [
  { day: 'Mon', value: 0.35 },
  { day: 'Tue', value: 0.85 },
  { day: 'Wed', value: 0.58 },
  { day: 'Thu', value: 0.72 },
  { day: 'Fri', value: 0.92 },
  { day: 'Sat', value: 0.42 },
  { day: 'Sun', value: 0.48 },
];

const heatmapRows = [
  [0.15, 0.22, 0.38, 0.18, 0.52, 0.25, 0.18, 0.35, 0.62, 0.82, 0.45, 0.28, 0.18, 0.22],
  [0.18, 0.55, 0.72, 0.22, 0.35, 0.18, 0.42, 0.75, 0.92, 0.52, 0.32, 0.22, 0.48, 0.18],
  [0.2, 0.28, 0.32, 0.18, 0.48, 0.22, 0.35, 0.58, 0.72, 0.3, 0.18, 0.25, 0.82, 0.24],
  [0.14, 0.2, 0.26, 0.16, 0.32, 0.18, 0.28, 0.42, 0.55, 0.22, 0.18, 0.2, 0.28, 0.16],
];

const achievements = [
  {
    title: 'Early Bird',
    subtitle: 'Studied before 8 AM for 5 days',
    emoji: '🌅',
  },
  {
    title: 'Deep Focus',
    subtitle: 'Completed a 2-hour session',
    emoji: '🎯',
  },
  {
    title: 'Knowledge Seeker',
    subtitle: 'Mastered 3 new topics this week',
    emoji: '📚',
  },
];

function getHeatColor(value) {
  if (value >= 0.8) return '#F6C453';
  if (value >= 0.6) return '#D9A63A';
  if (value >= 0.4) return '#A17B2B';
  if (value >= 0.22) return 'rgba(251, 192, 45, 0.28)';
  return 'rgba(255,255,255,0.08)';
}

function StatCard({ icon, label, value }) {
  return (
    <GlassCard style={styles.smallStatCard}>
      <View style={styles.statIconWrap}>
        <Ionicons name={icon} size={16} color={Colors.primary} />
      </View>
      <View style={styles.statTextWrap}>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={styles.statValue}>{value}</Text>
      </View>
    </GlassCard>
  );
}

function WeekBarCard() {
  return (
    <GlassCard style={styles.progressCard}>
      

      <Text style={styles.progressTitle}>Today&apos;s Progress</Text>

      <View style={styles.barRow}>
        {weeklyProgress.map((item) => (
          <View key={item.day} style={styles.barItem}>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  {
                    height: `${Math.max(item.value * 100, 18)}%`,
                  },
                ]}
              />
            </View>
            <Text style={styles.dayLabel}>{item.day}</Text>
          </View>
        ))}
      </View>
    </GlassCard>
  );
}

function HeatmapCard() {
  return (
    <GlassCard style={styles.heatmapCard}>
      <Text style={styles.sectionTitle}>Your Progress:</Text>

      <View style={styles.heatmapWrap}>
        {heatmapRows.map((row, rowIndex) => (
          <View key={`row-${rowIndex}`} style={styles.heatmapRow}>
            {row.map((cell, cellIndex) => (
              <View
                key={`cell-${rowIndex}-${cellIndex}`}
                style={[
                  styles.hexCell,
                  {
                    backgroundColor: getHeatColor(cell),
                    borderColor: cell >= 0.4 ? 'rgba(251,192,45,0.25)' : 'rgba(255,255,255,0.05)',
                  },
                ]}
              />
            ))}
          </View>
        ))}
      </View>
    </GlassCard>
  );
}

export default function ProfileScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <HexagonBackground />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Profile</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={styles.settingsButton}>
            <Ionicons name="settings-outline" size={22} color={Colors.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.profileInfo}>
          <Image
            source={require('../assets/bee_mascot.png')}
            style={styles.avatar}
          />
          <Text style={styles.nameText}>Nandhana</Text>

          <View style={styles.proBadge}>
            <Text style={styles.proText}>Pro Member</Text>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <StatCard icon="trophy-outline" label="Hive Score" value="2450" />
          <StatCard icon="checkmark-circle-outline" label="Quizzes Passed" value="182" />
          <StatCard icon="book-outline" label="Total Revision" value="145h" />
          <StatCard icon="star-outline" label="Topics Mastered" value="12" />
        </View>

        <WeekBarCard />

        <HeatmapCard />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Achievements</Text>

          {achievements.map((item, index) => (
            <GlassCard
              key={item.title}
              style={[
                styles.achievementCard,
                index !== achievements.length - 1 && styles.achievementSpacing,
              ]}
            >
              <View style={styles.achievementIcon}>
                <Text style={styles.achievementEmoji}>{item.emoji}</Text>
              </View>

              <View style={styles.achievementText}>
                <Text style={styles.achievementTitle}>{item.title}</Text>
                <Text style={styles.achievementSubtitle}>{item.subtitle}</Text>
              </View>
            </GlassCard>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 110,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  headerTitle: {
    ...Typography.h1,
    color: Colors.text,
  },
  settingsButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  profileInfo: {
    alignItems: 'center',
    marginBottom: 28,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.surfaceHighlight,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  nameText: {
    ...Typography.h2,
    color: Colors.text,
    marginTop: 14,
  },
  proBadge: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(251, 192, 45, 0.45)',
    backgroundColor: 'rgba(251, 192, 45, 0.14)',
  },
  proText: {
    ...Typography.small,
    color: Colors.primary,
    fontWeight: '700',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 22,
  },
  smallStatCard: {
    width: '48.2%',
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(251, 192, 45, 0.22)',
    backgroundColor: 'rgba(251, 192, 45, 0.04)',
  },
  statIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(251, 192, 45, 0.10)',
    marginRight: 10,
  },
  statTextWrap: {
    flex: 1,
  },
  statLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  statValue: {
    color: Colors.text,
    fontSize: 24,
    fontWeight: '800',
  },
  progressCard: {
    paddingHorizontal: 16,
    paddingVertical: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  honeyJarImage: {
    width: 120,
    height: 120,
    alignSelf: 'center',
    marginBottom: 8,
  },
  progressTitle: {
    ...Typography.body,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 14,
    fontWeight: '600',
  },
  barRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  barItem: {
    alignItems: 'center',
    width: 34,
  },
  barTrack: {
    width: 22,
    height: 52,
    borderRadius: 7,
    justifyContent: 'flex-end',
    padding: 2,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    marginBottom: 6,
  },
  barFill: {
    width: '100%',
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  dayLabel: {
    ...Typography.small,
    color: Colors.textSecondary,
  },
  heatmapCard: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  section: {
    marginBottom: 10,
  },
  sectionTitle: {
    ...Typography.h3,
    color: Colors.text,
    marginBottom: 14,
  },
  heatmapWrap: {
    marginTop: 4,
  },
  heatmapRow: {
    flexDirection: 'row',
    marginBottom: 7,
  },
  hexCell: {
    width: 18,
    height: 18,
    marginRight: 4,
    borderRadius: 6,
    transform: [{ rotate: '45deg' }],
    borderWidth: 1,
  },
  achievementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  achievementSpacing: {
    marginBottom: 12,
  },
  achievementIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.surfaceHighlight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  achievementEmoji: {
    fontSize: 22,
  },
  achievementText: {
    flex: 1,
  },
  achievementTitle: {
    ...Typography.h3,
    color: Colors.text,
    marginBottom: 2,
  },
  achievementSubtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
});