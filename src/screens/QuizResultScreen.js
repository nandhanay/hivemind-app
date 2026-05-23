import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useUser } from '../context/UserContext';
import HexagonBackground from '../components/HexagonBackground';
import GlassCard from '../components/GlassCard';
import { getQuiz, convertMistakesToFlashcards } from '../firebase/services/quizService';

export default function QuizResultScreen({ navigation, route }) {
  const { colors, Typography } = useTheme();
  const { userId, showMessage } = useUser();
  const { quizId } = route.params;

  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [converting, setConverting] = useState(false);

  const styles = getStyles(colors);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const q = await getQuiz(userId, quizId);
      setQuiz(q);
      setLoading(false);
    })();
  }, [userId, quizId]);

  const handleConvertToFlashcards = async () => {
    setConverting(true);
    const result = await convertMistakesToFlashcards(userId, quizId);
    if (result.success) {
      showMessage(`${result.count} flashcards created from mistakes!`);
    }
    setConverting(false);
  };

  if (loading || !quiz) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  const scoreColor = quiz.percentage >= 80 ? colors.greenAccent : quiz.percentage >= 60 ? '#FF9800' : colors.danger;
  const wrongCount = (quiz.questions || []).filter((q) => q.isCorrect === false).length;

  return (
    <SafeAreaView style={styles.container}>
      <HexagonBackground />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[Typography.h3, { color: colors.text }]}>Results</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Score */}
        <View style={styles.scoreSection}>
          <View style={[styles.scoreCircle, { borderColor: scoreColor }]}>
            <Text style={[styles.scorePercent, { color: scoreColor }]}>{quiz.percentage}%</Text>
          </View>
          <Text style={[styles.scoreLabel, { color: colors.text }]}>
            {quiz.score}/{quiz.totalQuestions} correct
          </Text>
          <Text style={[styles.scoreMsg, { color: colors.textSecondary }]}>
            {quiz.percentage >= 80 ? 'Excellent work! 🎉' : quiz.percentage >= 60 ? 'Good effort! Keep practicing.' : 'Needs improvement. Review weak areas.'}
          </Text>
        </View>

        {/* Actions */}
        {wrongCount > 0 && (
          <View style={styles.actionRow}>
            <TouchableOpacity onPress={handleConvertToFlashcards} disabled={converting}
              style={[styles.actionBtn, { backgroundColor: `${colors.blueAccent}18`, borderColor: `${colors.blueAccent}44` }]}>
              <Ionicons name="layers-outline" size={18} color={colors.blueAccent} />
              <Text style={[styles.actionText, { color: colors.blueAccent }]}>
                {converting ? 'Creating...' : `${wrongCount} → Flashcards`}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('WeakTopics')}
              style={[styles.actionBtn, { backgroundColor: `${colors.danger}18`, borderColor: `${colors.danger}44` }]}>
              <Ionicons name="analytics-outline" size={18} color={colors.danger} />
              <Text style={[styles.actionText, { color: colors.danger }]}>Weak Topics</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Question Review */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>QUESTION REVIEW</Text>
        {quiz.questions.map((q, i) => (
          <GlassCard key={i} style={[styles.reviewCard, {
            borderColor: q.isCorrect ? `${colors.greenAccent}33` : q.isCorrect === false ? `${colors.danger}33` : colors.glassBorder,
          }]}>
            <View style={styles.reviewHeader}>
              <Text style={[styles.reviewNum, { color: colors.textTertiary }]}>Q{i + 1}</Text>
              {q.isCorrect != null && (
                <Ionicons name={q.isCorrect ? 'checkmark-circle' : 'close-circle'} size={20}
                  color={q.isCorrect ? colors.greenAccent : colors.danger} />
              )}
            </View>
            <Text style={[styles.reviewQ, { color: colors.text }]}>{q.question}</Text>
            {q.userAnswer && (
              <Text style={[styles.reviewAns, { color: q.isCorrect ? colors.greenAccent : colors.danger }]}>
                Your answer: {q.userAnswer}
              </Text>
            )}
            {!q.isCorrect && q.correctAnswer && (
              <Text style={[styles.reviewCorrect, { color: colors.greenAccent }]}>
                Correct: {q.correctAnswer}
              </Text>
            )}
            {q.explanation && (
              <Text style={[styles.reviewExpl, { color: colors.textSecondary }]}>{q.explanation}</Text>
            )}
          </GlassCard>
        ))}

        <TouchableOpacity onPress={() => navigation.navigate('QuizSetup')}
          style={[styles.retryBtn, { backgroundColor: colors.primary }]}>
          <Ionicons name="refresh" size={18} color="#000" />
          <Text style={styles.retryText}>New Quiz</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  scoreSection: { alignItems: 'center', marginBottom: 24 },
  scoreCircle: { width: 120, height: 120, borderRadius: 60, borderWidth: 4, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  scorePercent: { fontSize: 36, fontWeight: '800' },
  scoreLabel: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  scoreMsg: { fontSize: 14, textAlign: 'center' },
  actionRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
  actionText: { fontSize: 13, fontWeight: '700' },
  sectionTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: 12 },
  reviewCard: { marginBottom: 10, borderWidth: 1 },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  reviewNum: { fontSize: 12, fontWeight: '700' },
  reviewQ: { fontSize: 15, fontWeight: '600', marginBottom: 6, lineHeight: 22 },
  reviewAns: { fontSize: 13, marginBottom: 4 },
  reviewCorrect: { fontSize: 13, fontWeight: '600', marginBottom: 4 },
  reviewExpl: { fontSize: 13, fontStyle: 'italic', lineHeight: 19, marginTop: 4 },
  retryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 14, marginTop: 16 },
  retryText: { fontSize: 16, fontWeight: '700', color: '#000' },
});
