import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useUser } from '../context/UserContext';
import GlassCard from '../components/GlassCard';
import HexagonBackground from '../components/HexagonBackground';
import { Ionicons } from '@expo/vector-icons';
import { getSessions, getStreak, getTotalStudyTime } from '../firebase/services/sessionService';

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

function getHeatColor(value, colors) {
  if (value >= 0.8) return colors.primary;
  if (value >= 0.6) return colors.primaryDark;
  if (value >= 0.4) return `${colors.primary}70`;
  if (value >= 0.22) return `${colors.primary}47`;
  return colors.shimmer;
}

export default function ProfileScreen({ navigation }) {
  const { colors, Typography } = useTheme();
  const { userId, userName } = useUser();
  const styles = getStyles(colors, Typography);

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalTime: '0h',
    sessionCount: 0,
    streak: 0,
    topicsCount: 0,
  });
  const [weeklyProgress, setWeeklyProgress] = useState([
    { day: 'Mon', value: 0 },
    { day: 'Tue', value: 0 },
    { day: 'Wed', value: 0 },
    { day: 'Thu', value: 0 },
    { day: 'Fri', value: 0 },
    { day: 'Sat', value: 0 },
    { day: 'Sun', value: 0 },
  ]);
  const [heatmapRows, setHeatmapRows] = useState([]);

  const loadProfileData = useCallback(async () => {
    try {
      setLoading(true);

      const [sessions, streak, totalSeconds] = await Promise.all([
        getSessions(userId),
        getStreak(userId),
        getTotalStudyTime(userId),
      ]);

      // Format total time
      const totalHours = Math.floor(totalSeconds / 3600);
      const totalMins = Math.floor((totalSeconds % 3600) / 60);
      const totalTimeStr = totalHours > 0 ? `${totalHours}h ${totalMins}m` : `${totalMins}m`;

      setStats({
        totalTime: totalTimeStr,
        sessionCount: sessions.length,
        streak,
        topicsCount: new Set(sessions.map(s => s.subject).filter(Boolean)).size,
      });

      // Build weekly progress from last 7 days
      const now = new Date();
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const weekData = [];
      let maxDayDuration = 1;

      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        const dayKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

        const daySessions = sessions.filter(s => {
          const sd = s.date instanceof Date ? s.date : new Date(s.date);
          const sk = `${sd.getFullYear()}-${String(sd.getMonth() + 1).padStart(2, '0')}-${String(sd.getDate()).padStart(2, '0')}`;
          return sk === dayKey;
        });

        const dayTotal = daySessions.reduce((sum, s) => sum + (s.duration || 0), 0);
        if (dayTotal > maxDayDuration) maxDayDuration = dayTotal;

        weekData.push({
          day: dayNames[d.getDay()],
          totalSeconds: dayTotal,
        });
      }

      setWeeklyProgress(weekData.map(w => ({
        day: w.day,
        value: Math.min(w.totalSeconds / maxDayDuration, 1),
      })));

      // Build heatmap from last 8 weeks
      const rows = [];
      for (let row = 0; row < 4; row++) {
        const rowData = [];
        for (let col = 0; col < 14; col++) {
          const daysAgo = (3 - row) * 14 + (13 - col);
          const d = new Date(now);
          d.setDate(now.getDate() - daysAgo);
          const dayKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

          const daySessions = sessions.filter(s => {
            const sd = s.date instanceof Date ? s.date : new Date(s.date);
            const sk = `${sd.getFullYear()}-${String(sd.getMonth() + 1).padStart(2, '0')}-${String(sd.getDate()).padStart(2, '0')}`;
            return sk === dayKey;
          });

          const dayTotal = daySessions.reduce((sum, s) => sum + (s.duration || 0), 0);
          // Normalize: 2+ hours = 1.0
          rowData.push(Math.min(dayTotal / 7200, 1));
        }
        rows.push(rowData);
      }
      setHeatmapRows(rows);

    } catch (error) {
      console.error('Profile load error:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadProfileData();
  }, [loadProfileData]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadProfileData();
    });
    return unsubscribe;
  }, [navigation, loadProfileData]);

  function StatCard({ icon, label, value }) {
    return (
      <GlassCard style={styles.smallStatCard}>
        <View style={[styles.statIconWrap, { backgroundColor: `${colors.primary}1A` }]}>
          <Ionicons name={icon} size={16} color={colors.primary} />
        </View>
        <View style={styles.statTextWrap}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
          <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
        </View>
      </GlassCard>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <HexagonBackground />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <Text style={[Typography.h1, { color: colors.text }]}>Profile</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={styles.settingsButton}>
            <Ionicons name="settings-outline" size={22} color={colors.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.profileInfo}>
          <Image
            source={require('../assets/bee_mascot.png')}
            style={[styles.avatar, { borderColor: colors.primary, backgroundColor: colors.surfaceHighlight }]}
          />
          <Text style={[Typography.h2, { color: colors.text, marginTop: 14 }]}>{userName}</Text>

          <View style={[styles.proBadge, { borderColor: `${colors.primary}73`, backgroundColor: `${colors.primary}24` }]}>
            <Text style={[styles.proText, { color: colors.primary }]}>Pro Member</Text>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ paddingVertical: 30 }} />
        ) : (
          <>
            <View style={styles.statsGrid}>
              <StatCard icon="trophy-outline" label="Study Time" value={stats.totalTime} />
              <StatCard icon="checkmark-circle-outline" label="Sessions" value={String(stats.sessionCount)} />
              <StatCard icon="flame-outline" label="Day Streak" value={`${stats.streak}`} />
              <StatCard icon="star-outline" label="Topics" value={String(stats.topicsCount)} />
            </View>

            {/* Weekly Progress */}
            <GlassCard style={styles.progressCard}>
              <Text style={[styles.progressTitle, { color: colors.text }]}>This Week's Progress</Text>

              <View style={styles.barRow}>
                {weeklyProgress.map((item) => (
                  <View key={item.day} style={styles.barItem}>
                    <View style={[styles.barTrack, { backgroundColor: colors.shimmer, borderColor: colors.glassBorder }]}>
                      <View
                        style={[
                          styles.barFill,
                          {
                            height: `${Math.max(item.value * 100, 18)}%`,
                            backgroundColor: colors.primary,
                          },
                        ]}
                      />
                    </View>
                    <Text style={[styles.dayLabel, { color: colors.textSecondary }]}>{item.day}</Text>
                  </View>
                ))}
              </View>
            </GlassCard>

            {/* Heatmap */}
            {heatmapRows.length > 0 && (
              <GlassCard style={styles.heatmapCard}>
                <Text style={[Typography.h3, { color: colors.text, marginBottom: 14 }]}>Your Progress</Text>

                <View style={styles.heatmapWrap}>
                  {heatmapRows.map((row, rowIndex) => (
                    <View key={`row-${rowIndex}`} style={styles.heatmapRow}>
                      {row.map((cell, cellIndex) => (
                        <View
                          key={`cell-${rowIndex}-${cellIndex}`}
                          style={[
                            styles.hexCell,
                            {
                              backgroundColor: getHeatColor(cell, colors),
                              borderColor: cell >= 0.4 ? `${colors.primary}40` : colors.glassBorder,
                            },
                          ]}
                        />
                      ))}
                    </View>
                  ))}
                </View>
              </GlassCard>
            )}
          </>
        )}

        {/* Achievements */}
        <View style={styles.section}>
          <Text style={[Typography.h3, { color: colors.text, marginBottom: 14 }]}>Achievements</Text>

          {achievements.map((item, index) => (
            <GlassCard
              key={item.title}
              style={[
                styles.achievementCard,
                index !== achievements.length - 1 && styles.achievementSpacing,
              ]}
            >
              <View style={[styles.achievementIcon, { backgroundColor: colors.surfaceHighlight }]}>
                <Text style={styles.achievementEmoji}>{item.emoji}</Text>
              </View>

              <View style={styles.achievementText}>
                <Text style={[Typography.h3, { color: colors.text, marginBottom: 2 }]}>{item.title}</Text>
                <Text style={[Typography.caption, { color: colors.textSecondary }]}>{item.subtitle}</Text>
              </View>
            </GlassCard>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (colors, Typography) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
  settingsButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.shimmer,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  profileInfo: {
    alignItems: 'center',
    marginBottom: 28,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
  },
  proBadge: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
  },
  proText: {
    fontSize: 12,
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
    borderColor: `${colors.primary}38`,
    backgroundColor: `${colors.primary}0A`,
  },
  statIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  statTextWrap: {
    flex: 1,
  },
  statLabel: {
    ...Typography.caption,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
  },
  progressCard: {
    paddingHorizontal: 16,
    paddingVertical: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  progressTitle: {
    ...Typography.body,
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
    borderWidth: 1,
    marginBottom: 6,
  },
  barFill: {
    width: '100%',
    borderRadius: 5,
  },
  dayLabel: {
    fontSize: 12,
  },
  heatmapCard: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: colors.glassBorder,
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
  section: {
    marginBottom: 10,
  },
  achievementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  achievementSpacing: {
    marginBottom: 12,
  },
  achievementIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
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
});