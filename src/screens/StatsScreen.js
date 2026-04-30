import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography } from '../theme/colors';
import GlassCard from '../components/GlassCard';
import HexagonBackground from '../components/HexagonBackground';
import Svg, { Polygon } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';

export default function StatsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <HexagonBackground />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={Typography.h1}>Your Progress</Text>
          <Text style={[Typography.body, { marginTop: 4 }]}>You're doing great, Nandhana! 🚀</Text>
        </View>

        <View style={styles.streakRow}>
          <GlassCard style={styles.streakCard}>
            <Text style={{ fontSize: 48, marginBottom: 8 }}>🔥</Text>
            <Text style={styles.streakValue}>6 days</Text>
            <Text style={styles.streakLabel}>Honey Streak</Text>
          </GlassCard>
          
          <View style={styles.metricsCol}>
            <GlassCard style={styles.metricSmall}>
              <Text style={styles.metricLabel}>Efficiency</Text>
              <Text style={[styles.metricValue, { color: Colors.greenAccent }]}>94%</Text>
            </GlassCard>
            <GlassCard style={styles.metricSmall}>
              <Text style={styles.metricLabel}>Rank</Text>
              <Text style={[styles.metricValue, { color: Colors.primary }]}>Top 5%</Text>
            </GlassCard>
          </View>
        </View>

        <Text style={[Typography.h3, { marginBottom: 16, marginTop: 24 }]}>Study Activity</Text>
        <GlassCard style={styles.activityCard}>
          <View style={styles.grid}>
            {Array.from({ length: 35 }).map((_, i) => (
              <Svg height="24" width="28" style={styles.activityCell} key={i}>
                <Polygon 
                  points="14,0 28,7 28,17 14,24 0,17 0,7" 
                  fill={i % 6 === 0 ? Colors.primary : Colors.surfaceHighlight} 
                />
              </Svg>
            ))}
          </View>
          <View style={styles.activityFooter}>
            <Ionicons name="time-outline" size={16} color={Colors.textSecondary} />
            <Text style={styles.totalTime}>Total Time: 42h 30m</Text>
          </View>
        </GlassCard>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, height: '100%' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 20, flexGrow: 1 },
  header: { marginBottom: 32 },
  streakRow: {
    flexDirection: 'row',
    gap: 16,
    height: 180,
  },
  streakCard: {
    flex: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(251, 192, 45, 0.3)',
    backgroundColor: 'rgba(251, 192, 45, 0.05)',
  },
  streakValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.text,
  },
  streakLabel: {
    ...Typography.caption,
    color: Colors.primary,
    marginTop: 4,
    fontWeight: 'bold',
  },
  metricsCol: {
    flex: 1,
    gap: 16,
  },
  metricSmall: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
  },
  metricLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  activityCard: {
    padding: 24,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center'
  },
  activityCell: {
    margin: 2,
  },
  activityFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    gap: 8,
  },
  totalTime: {
    ...Typography.body,
    color: Colors.textSecondary,
    fontWeight: '500',
  }
});
