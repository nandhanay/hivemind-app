import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useUser } from '../context/UserContext';
import HexagonBackground from '../components/HexagonBackground';
import GlassCard from '../components/GlassCard';
import WeakTopicCard from '../components/WeakTopicCard';
import EmptyState from '../components/EmptyState';
import { getWeakTopics } from '../firebase/services/weakTopicService';

export default function WeakTopicsScreen({ navigation }) {
  const { colors, Typography } = useTheme();
  const { userId } = useUser();

  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getWeakTopics(userId);
      setTopics(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [userId]);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => { const u = navigation.addListener('focus', loadData); return u; }, [navigation, loadData]);

  const avgMastery = topics.length > 0
    ? Math.round(topics.reduce((s, t) => s + (t.masteryProgress || 0), 0) / topics.length)
    : 0;

  const critical = topics.filter((t) => (t.weaknessScore || 0) >= 70).length;

  const styles = getStyles(colors);

  return (
    <SafeAreaView style={styles.container}>
      <HexagonBackground />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[Typography.h2, { color: colors.text }]}>Weak Topics</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Summary Stats */}
      {!loading && topics.length > 0 && (
        <View style={styles.statsRow}>
          <GlassCard style={[styles.stat, { borderColor: `${colors.danger}33` }]}>
            <Text style={[styles.statVal, { color: colors.danger }]}>{topics.length}</Text>
            <Text style={[styles.statLbl, { color: colors.textSecondary }]}>Total</Text>
          </GlassCard>
          <GlassCard style={[styles.stat, { borderColor: `${colors.danger}33` }]}>
            <Text style={[styles.statVal, { color: critical > 0 ? colors.danger : colors.textSecondary }]}>{critical}</Text>
            <Text style={[styles.statLbl, { color: colors.textSecondary }]}>Critical</Text>
          </GlassCard>
          <GlassCard style={[styles.stat, { borderColor: `${colors.greenAccent}33` }]}>
            <Text style={[styles.statVal, { color: avgMastery >= 50 ? colors.greenAccent : '#FF9800' }]}>{avgMastery}%</Text>
            <Text style={[styles.statLbl, { color: colors.textSecondary }]}>Avg Mastery</Text>
          </GlassCard>
        </View>
      )}

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ flex: 1 }} />
      ) : topics.length === 0 ? (
        <EmptyState icon="analytics-outline" title="No weak topics"
          subtitle="Take quizzes and study flashcards — weak areas will be tracked here automatically" colors={colors} />
      ) : (
        <FlatList data={topics} keyExtractor={(item) => item.id} contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <WeakTopicCard topic={item}
              onPress={() => navigation.navigate('WeakTopicDetail', { topicId: item.id })} />
          )} />
      )}
    </SafeAreaView>
  );
}

const getStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  backBtn: { padding: 4 },
  statsRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginBottom: 14 },
  stat: { flex: 1, alignItems: 'center', paddingVertical: 12, borderWidth: 1 },
  statVal: { fontSize: 24, fontWeight: '800' },
  statLbl: { fontSize: 12, marginTop: 2 },
  list: { paddingHorizontal: 20, paddingBottom: 40 },
});
