import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography } from '../theme/colors';
import GlassCard from '../components/GlassCard';
import HexagonBackground from '../components/HexagonBackground';
import { Ionicons } from '@expo/vector-icons';

export default function PlannerScreen() {
  const plans = [
    { subject: 'Data Structures', topic: 'Binary Search Trees', duration: '45 min', difficulty: 'Medium', color: Colors.primary },
    { subject: 'Algorithms', topic: 'Sorting & Searching', duration: '60 min', difficulty: 'Hard', color: Colors.danger },
    { subject: 'System Design', topic: 'Load Balancing', duration: '30 min', difficulty: 'Easy', color: Colors.greenAccent },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <HexagonBackground />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View>
            <Text style={Typography.h1}>✨ AI Study Planner 🐝</Text>
            <Text style={[Typography.body, { marginTop: 4 }]}>Your personalized study route is ready</Text>
          </View>
          <TouchableOpacity style={styles.newButton}>
            <Text style={styles.newButtonText}>+ New Plan</Text>
          </TouchableOpacity>
        </View>

        {plans.map((plan, index) => (
          <GlassCard key={index} style={styles.taskCard}>
            <View style={styles.taskHeader}>
              <View style={styles.subjectBadge}>
                <Text style={styles.subjectText}>{plan.subject}</Text>
              </View>
              <Text style={Typography.caption}>Today</Text>
            </View>
            <Text style={styles.topicTitle}>{plan.topic}</Text>
            <View style={styles.taskFooter}>
              <View style={styles.footerItem}>
                <Ionicons name="time-outline" size={14} color={Colors.textSecondary} />
                <Text style={styles.footerText}>{plan.duration}</Text>
              </View>
              <View style={[styles.difficultyBadge, { borderColor: plan.color, backgroundColor: plan.color + '1A' }]}>
                <Text style={[styles.difficultyText, { color: plan.color }]}>{plan.difficulty}</Text>
              </View>
            </View>
          </GlassCard>
        ))}

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, height: '100%' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 20, flexGrow: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  newButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  newButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 14,
  },
  taskCard: {
    padding: 20,
    marginBottom: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  subjectBadge: {
    backgroundColor: Colors.surfaceHighlight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  subjectText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: 'bold',
  },
  topicTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 16,
  },
  taskFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    paddingTop: 16,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  difficultyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  difficultyText: {
    fontSize: 12,
    fontWeight: 'bold',
  }
});
