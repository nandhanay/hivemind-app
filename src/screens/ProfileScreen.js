import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography } from '../theme/colors';
import GlassCard from '../components/GlassCard';
import HexagonBackground from '../components/HexagonBackground';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Polygon } from 'react-native-svg';

export default function ProfileScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <HexagonBackground />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <Text style={Typography.h1}>Profile</Text>
          <TouchableOpacity onPress={() => navigation.navigate("Settings")}>
            <Ionicons name="settings-outline" size={24} color={Colors.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.profileInfo}>
          <Image
            source={require("../assets/bee_mascot.png")}
            style={styles.avatar}
          />
          <Text style={[Typography.h2, { marginTop: 16 }]}>Nandhana</Text>
          <View style={styles.proBadge}>
            <Text style={styles.proText}>Pro Member</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <GlassCard style={styles.statCard}>
            <Text style={Typography.h2}>342</Text>
            <Text style={Typography.caption}>Hive Score</Text>
          </GlassCard>
          <GlassCard style={styles.statCard}>
            <Text style={Typography.h2}>12</Text>
            <Text style={Typography.caption}>Day Streak</Text>
          </GlassCard>
        </View>

        <View style={styles.section}>
          <Text style={[Typography.h3, { marginBottom: 16 }]}>
            Achievements
          </Text>

          <GlassCard style={styles.achievementCard}>
            <View style={styles.achievementIcon}>
              <Text style={{ fontSize: 24 }}>🌅</Text>
            </View>
            <View style={styles.achievementText}>
              <Text style={Typography.h3}>Early Bird</Text>
              <Text style={Typography.caption}>
                Studied before 8 AM for 5 days
              </Text>
            </View>
          </GlassCard>

          <GlassCard style={styles.achievementCard}>
            <View style={styles.achievementIcon}>
              <Text style={{ fontSize: 24 }}>🎯</Text>
            </View>
            <View style={styles.achievementText}>
              <Text style={Typography.h3}>Deep Focus</Text>
              <Text style={Typography.caption}>Completed a 2-hour session</Text>
            </View>
          </GlassCard>

          <GlassCard style={styles.achievementCard}>
            <View style={styles.achievementIcon}>
              <Text style={{ fontSize: 24 }}>📚</Text>
            </View>
            <View style={styles.achievementText}>
              <Text style={Typography.h3}>Knowledge Seeker</Text>
              <Text style={Typography.caption}>
                Mastered 3 new topics this week
              </Text>
            </View>
          </GlassCard>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { padding: 20, flexGrow: 1, paddingBottom: 100 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  profileInfo: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.surfaceHighlight,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  proBadge: {
    backgroundColor: 'rgba(251, 192, 45, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.primary,
    marginTop: 8,
  },
  proText: {
    ...Typography.small,
    color: Colors.primary,
    fontWeight: 'bold',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 32,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  achievementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
  },
  achievementIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.surfaceHighlight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  achievementText: {
    flex: 1,
  }
});
