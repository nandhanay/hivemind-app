import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useUser } from '../context/UserContext';
import HexagonBackground from '../components/HexagonBackground';
import GlassCard from '../components/GlassCard';
import ProgressBar from '../components/ProgressBar';
import { getQuiz, submitQuiz } from '../firebase/services/quizService';
import { detectWeakTopicsFromQuiz } from '../firebase/services/weakTopicService';

export default function QuizTakingScreen({ navigation, route }) {
  const { colors, Typography } = useTheme();
  const { userId, showMessage } = useUser();
  const { quizId } = route.params;

  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const styles = getStyles(colors);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const q = await getQuiz(userId, quizId);
      setQuiz(q);
      setLoading(false);
    })();
  }, [userId, quizId]);

  if (loading || !quiz) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  const questions = quiz.questions || [];
  const currentQ = questions[index];
  const total = questions.length;
  const answered = Object.keys(answers).length;

  const selectAnswer = (ans) => {
    setAnswers({ ...answers, [index]: ans });
  };

  const handleSubmit = async () => {
    if (answered < total) {
      Alert.alert('Incomplete', `You've answered ${answered}/${total} questions. Submit anyway?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Submit', onPress: doSubmit },
      ]);
    } else {
      doSubmit();
    }
  };

  const doSubmit = async () => {
    setSubmitting(true);
    try {
      const ansArray = Object.entries(answers).map(([qi, ans]) => ({
        questionIndex: parseInt(qi), userAnswer: ans,
      }));
      const result = await submitQuiz(userId, quizId, ansArray);
      if (result.success) {
        // Auto-detect weak topics
        await detectWeakTopicsFromQuiz(userId, {
          subject: quiz.subject, weakTopicsDetected: result.weakTopicsDetected,
        });
        showMessage(`Score: ${result.percentage}%`);
        navigation.replace('QuizResult', { quizId });
      }
    } catch (e) { Alert.alert('Error', e.message); }
    finally { setSubmitting(false); }
  };

  return (
    <SafeAreaView style={styles.container}>
      <HexagonBackground />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[Typography.body, { color: colors.textSecondary }]}>Q{index + 1}/{total}</Text>
        <TouchableOpacity onPress={handleSubmit} disabled={submitting}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.primary }}>Submit</Text>
        </TouchableOpacity>
      </View>

      <ProgressBar progress={(index + 1) / total} height={4} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Question */}
        <GlassCard style={[styles.qCard, { borderColor: `${colors.purpleAccent}33` }]}>
          <Text style={[styles.qType, { color: colors.textTertiary }]}>{currentQ?.type?.replace('_', '/') || 'MCQ'}</Text>
          <Text style={[styles.qText, { color: colors.text }]}>{currentQ?.question}</Text>
        </GlassCard>

        {/* Options (MCQ or True/False) */}
        {currentQ?.options?.length > 0 && currentQ.options.map((opt, i) => {
          const selected = answers[index] === opt;
          return (
            <TouchableOpacity key={i} activeOpacity={0.8} onPress={() => selectAnswer(opt)}
              style={[
                styles.option,
                {
                  backgroundColor: selected ? `${colors.primary}24` : colors.shimmer,
                  borderColor: selected ? colors.primary : colors.glassBorder,
                },
              ]}>
              <View style={[styles.optionRadio, { borderColor: selected ? colors.primary : colors.textTertiary }]}>
                {selected && <View style={[styles.optionDot, { backgroundColor: colors.primary }]} />}
              </View>
              <Text style={[styles.optionText, { color: selected ? colors.primary : colors.text }]}>{opt}</Text>
            </TouchableOpacity>
          );
        })}

        {/* Short answer */}
        {currentQ?.type === 'short_answer' && (
          <TextInput value={answers[index] || ''} onChangeText={(t) => selectAnswer(t)}
            placeholder="Type your answer..." placeholderTextColor={colors.textTertiary}
            style={[styles.shortInput, { color: colors.text, borderColor: colors.glassBorder, backgroundColor: colors.shimmer }]}
            multiline />
        )}

        {/* Navigation */}
        <View style={styles.navRow}>
          <TouchableOpacity onPress={() => setIndex(Math.max(0, index - 1))} disabled={index === 0}
            style={[styles.navBtn, { backgroundColor: colors.shimmer, opacity: index === 0 ? 0.4 : 1 }]}>
            <Ionicons name="chevron-back" size={20} color={colors.text} />
            <Text style={[styles.navText, { color: colors.text }]}>Prev</Text>
          </TouchableOpacity>

          {index < total - 1 ? (
            <TouchableOpacity onPress={() => setIndex(index + 1)}
              style={[styles.navBtn, { backgroundColor: colors.primary }]}>
              <Text style={[styles.navText, { color: '#000' }]}>Next</Text>
              <Ionicons name="chevron-forward" size={20} color="#000" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={handleSubmit} disabled={submitting}
              style={[styles.navBtn, { backgroundColor: colors.greenAccent }]}>
              <Ionicons name="checkmark-circle" size={20} color="#FFF" />
              <Text style={[styles.navText, { color: '#FFF' }]}>Submit</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Question dots */}
        <View style={styles.dotRow}>
          {questions.map((_, i) => (
            <TouchableOpacity key={i} onPress={() => setIndex(i)}
              style={[styles.dot, {
                backgroundColor: answers[i] ? colors.primary : i === index ? `${colors.primary}44` : colors.shimmer,
                borderColor: i === index ? colors.primary : 'transparent',
              }]} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  qCard: { marginBottom: 20, borderWidth: 1 },
  qType: { fontSize: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 },
  qText: { fontSize: 18, fontWeight: '600', lineHeight: 28 },
  option: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 14, padding: 16, marginBottom: 10 },
  optionRadio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, marginRight: 14, alignItems: 'center', justifyContent: 'center' },
  optionDot: { width: 12, height: 12, borderRadius: 6 },
  optionText: { fontSize: 15, flex: 1, lineHeight: 22 },
  shortInput: { borderWidth: 1, borderRadius: 14, padding: 16, fontSize: 15, minHeight: 80, textAlignVertical: 'top' },
  navRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 24, gap: 12 },
  navBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14 },
  navText: { fontSize: 15, fontWeight: '700' },
  dotRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 24 },
  dot: { width: 12, height: 12, borderRadius: 6, borderWidth: 1.5 },
});
