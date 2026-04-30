import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography } from '../theme/colors';
import GlassCard from '../components/GlassCard';
import HexagonBackground from '../components/HexagonBackground';
import { Ionicons } from '@expo/vector-icons';

export default function DashboardScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <HexagonBackground />
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={Typography.h1}>Good Evening, Nandhana 🐝</Text>
            <Text style={[Typography.body, { marginTop: 4 }]}>Let's make today productive 🚀</Text>
          </View>
          <Image source={require('../assets/bee_mascot.png')} style={styles.avatar} />
        </View>

        {/* Today's Plan Card */}
        <GlassCard style={styles.planCard}>
          <View style={styles.planHeader}>
            <Text style={styles.planSubtitle}>Subject</Text>
            <Text style={styles.planTime}>🕒 45 min</Text>
          </View>
          <Text style={styles.planTitle}>Data Structures</Text>
          <Text style={styles.planTopic}>Binary Search Trees</Text>
          <TouchableOpacity 
            style={styles.focusButton}
            onPress={() => navigation.navigate('Focus')}
          >
            <Text style={styles.focusButtonText}>Start Focus Session</Text>
          </TouchableOpacity>
        </GlassCard>

        {/* Quick Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Ionicons name="time" size={20} color={Colors.primary} />
            <Text style={styles.statValue}>2h 15m</Text>
            <Text style={styles.statLabel}>Study Time</Text>
          </View>
          <View style={styles.statBox}>
            <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
            <Text style={styles.statValue}>3</Text>
            <Text style={styles.statLabel}>Sessions</Text>
          </View>
          <View style={styles.statBox}>
            <Ionicons name="flame" size={20} color={Colors.greenAccent} />
            <Text style={styles.statValue}>6 days</Text>
            <Text style={styles.statLabel}>Streak</Text>
          </View>
        </View>

        {/* Quick Access Grid */}
        <Text style={[Typography.h2, styles.sectionTitle]}>Quick Access</Text>
        <View style={styles.grid}>
          <TouchableOpacity style={styles.gridItem}>
            <GlassCard style={[styles.gridCard, { borderLeftColor: Colors.primary, borderLeftWidth: 4 }]}>
              <Text style={styles.gridIcon}>🧠</Text>
              <Text style={styles.gridTitle}>AI Quiz</Text>
              <Text style={styles.gridSub}>Test your knowledge</Text>
            </GlassCard>
          </TouchableOpacity>

          <TouchableOpacity style={styles.gridItem}>
            <GlassCard style={[styles.gridCard, { borderLeftColor: Colors.purpleAccent, borderLeftWidth: 4 }]}>
              <Text style={styles.gridIcon}>📚</Text>
              <Text style={styles.gridTitle}>Library Mode</Text>
              <Text style={styles.gridSub}>128 users studying</Text>
            </GlassCard>
          </TouchableOpacity>

          <TouchableOpacity style={styles.gridItem}>
            <GlassCard style={[styles.gridCard, { borderLeftColor: Colors.greenAccent, borderLeftWidth: 4 }]}>
              <Text style={styles.gridIcon}>🏆</Text>
              <Text style={styles.gridTitle}>Leaderboard</Text>
              <Text style={styles.gridSub}>See your rank</Text>
            </GlassCard>
          </TouchableOpacity>

          <TouchableOpacity style={styles.gridItem}>
            <GlassCard style={[styles.gridCard, { borderLeftColor: Colors.blueAccent, borderLeftWidth: 4 }]}>
              <Text style={styles.gridIcon}>🤝</Text>
              <Text style={styles.gridTitle}>Study Partner</Text>
              <Text style={styles.gridSub}>Connect & compete</Text>
            </GlassCard>
          </TouchableOpacity>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: Colors.background,
    height: '100%',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: { 
    padding: 20,
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  planCard: {
    padding: 24,
    marginBottom: 24,
    backgroundColor: 'rgba(251, 192, 45, 0.08)',
    borderColor: 'rgba(251, 192, 45, 0.3)',
    borderWidth: 1,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  planSubtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  planTime: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: 'bold',
  },
  planTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: 12,
  },
  planTopic: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginBottom: 24,
  },
  focusButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  focusButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
    paddingHorizontal: 4,
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    ...Typography.h3,
    marginTop: 8,
    color: Colors.text,
  },
  statLabel: {
    ...Typography.small,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  sectionTitle: {
    marginBottom: 16,
    fontSize: 20,
    fontWeight: 'bold',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gridItem: {
    width: '48%',
  },
  gridCard: {
    padding: 16,
    height: 120,
    justifyContent: 'center',
  },
  gridIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  gridTitle: {
    ...Typography.h3,
    fontSize: 16,
  },
  gridSub: {
    ...Typography.small,
    color: Colors.textSecondary,
    marginTop: 4,
  }
});
