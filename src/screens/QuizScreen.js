import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useUser } from '../context/UserContext';
import HexagonBackground from '../components/HexagonBackground';
import GlassCard from '../components/GlassCard';
import QuizCard from '../components/QuizCard';
import FAB from '../components/FAB';
import EmptyState from '../components/EmptyState';
import { getQuizzes, getQuizAnalytics } from '../firebase/services/quizService';

export default function QuizScreen({ navigation, route }) {
  const { colors, Typography } = useTheme();
  const { userId } = useUser();

  const [quizzes, setQuizzes] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [q, a] = await Promise.all([getQuizzes(userId), getQuizAnalytics(userId)]);
      setQuizzes(q);
      setAnalytics(a);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [userId]);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => { const u = navigation.addListener('focus', loadData); return u; }, [navigation, loadData]);

  const routeSubject = route.params?.subject;
  const filteredQuizzes = routeSubject
    ? quizzes.filter((q) => q.subject?.toLowerCase() === routeSubject.toLowerCase())
    : quizzes;

  const styles = getStyles(colors);

  return (
    <SafeAreaView style={styles.container}>
      <HexagonBackground />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[Typography.h2, { color: colors.text }]}>Quizzes</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Analytics */}
      {!loading && analytics && (
        <View style={styles.statsRow}>
          <GlassCard style={[styles.stat, { borderColor: `${colors.purpleAccent}33` }]}>
            <Text style={[styles.statVal, { color: colors.purpleAccent }]}>{analytics.totalQuizzes || 0}</Text>
            <Text style={[styles.statLbl, { color: colors.textSecondary }]}>Total</Text>
          </GlassCard>
          <GlassCard style={[styles.stat, { borderColor: `${colors.greenAccent}33` }]}>
            <Text style={[styles.statVal, { color: colors.greenAccent }]}>{analytics.averageScore || 0}%</Text>
            <Text style={[styles.statLbl, { color: colors.textSecondary }]}>Avg Score</Text>
          </GlassCard>
          <GlassCard style={[styles.stat, { borderColor: `${colors.danger}33` }]}>
            <Text style={[styles.statVal, { color: colors.danger }]}>{analytics.weakSubjects?.length || 0}</Text>
            <Text style={[styles.statLbl, { color: colors.textSecondary }]}>Weak</Text>
          </GlassCard>
        </View>
      )}

      {/* Quiz List */}
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ flex: 1 }} />
      ) : filteredQuizzes.length === 0 ? (
        <EmptyState icon="help-circle-outline" title={routeSubject ? `No quizzes for ${routeSubject}` : "No quizzes yet"}
          subtitle={routeSubject ? "Generate a quiz from note or start a new quiz" : "Tap + to generate your first AI-powered quiz"} colors={colors} />
      ) : (
        <FlatList data={filteredQuizzes} keyExtractor={(item) => item.id} contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={<Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>QUIZ HISTORY</Text>}
          renderItem={({ item }) => (
            <QuizCard quiz={item}
              onPress={() => item.status === 'completed'
                ? navigation.navigate('QuizResult', { quizId: item.id })
                : navigation.navigate('QuizTaking', { quizId: item.id })
              } />
          )} />
      )}

      <FAB onPress={() => navigation.navigate('QuizSetup')} />
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
  sectionTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: 12 },
  list: { paddingHorizontal: 20, paddingBottom: 100 },
});
