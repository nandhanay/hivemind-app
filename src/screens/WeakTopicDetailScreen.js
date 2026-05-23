import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useUser } from '../context/UserContext';
import HexagonBackground from '../components/HexagonBackground';
import GlassCard from '../components/GlassCard';
import ProgressBar from '../components/ProgressBar';
import AILoadingOverlay from '../components/AILoadingOverlay';
import { getWeakTopic, removeWeakTopic, updateMasteryProgress } from '../firebase/services/weakTopicService';
import { addNote } from '../firebase/services/notesService';
import { createQuiz } from '../firebase/services/quizService';
import { generateContent } from '../services/aiService';
import { simplifiedExplanationPrompt, weakTopicMiniQuizPrompt, weakTopicRevisionPrompt } from '../services/prompts/weakTopicPrompts';

export default function WeakTopicDetailScreen({ navigation, route }) {
  const { colors, Typography } = useTheme();
  const { userId, showMessage } = useUser();
  const { topicId } = route.params;

  const [topic, setTopic] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [genMessage, setGenMessage] = useState('');

  useEffect(() => {
    loadTopic();
  }, []);

  const loadTopic = async () => {
    setLoading(true);
    const t = await getWeakTopic(userId, topicId);
    setTopic(t);
    setLoading(false);
  };

  const handleSimplify = async () => {
    setGenerating(true); setGenMessage('Creating simplified explanation...');
    try {
      const prompt = simplifiedExplanationPrompt(topic.topicName, topic.subject);
      const result = await generateContent(prompt);
      if (!result.success) { Alert.alert('Error', result.error); return; }
      const data = result.data;
      const saveResult = await addNote(userId, {
        title: data.title || `Understanding ${topic.topicName}`,
        content: data.sections?.map((s) => `## ${s.heading}\n${s.content}`).join('\n\n') || '',
        contentType: 'ai_detailed', subject: topic.subject, topic: topic.topicName,
        createdByAI: true, sections: data.sections || [], keyTakeaways: data.keyPoints || [],
      });
      if (saveResult.success) {
        await updateMasteryProgress(userId, topicId, Math.min(100, (topic.masteryProgress || 0) + 15));
        showMessage('Explanation saved as note!');
        navigation.navigate('NoteView', { noteId: saveResult.id });
      }
    } catch (e) { Alert.alert('Error', e.message); }
    finally { setGenerating(false); }
  };

  const handleMiniQuiz = async () => {
    setGenerating(true); setGenMessage('Generating mini quiz...');
    try {
      const prompt = weakTopicMiniQuizPrompt(topic.topicName, topic.subject, 5);
      const result = await generateContent(prompt);
      if (!result.success) { Alert.alert('Error', result.error); return; }
      const quizData = {
        title: result.data?.title || `Review: ${topic.topicName}`,
        quizType: 'mcq', subject: topic.subject, topic: topic.topicName,
        sourceType: 'topic', questions: result.data?.questions || [],
      };
      const saveResult = await createQuiz(userId, quizData);
      if (saveResult.success) {
        showMessage('Mini quiz ready!');
        navigation.navigate('QuizTaking', { quizId: saveResult.id });
      }
    } catch (e) { Alert.alert('Error', e.message); }
    finally { setGenerating(false); }
  };

  const handleRevisionNotes = async () => {
    setGenerating(true); setGenMessage('Generating revision notes...');
    try {
      const prompt = weakTopicRevisionPrompt(topic.topicName, topic.subject, topic.linkedQuizMistakes || []);
      const result = await generateContent(prompt);
      if (!result.success) { Alert.alert('Error', result.error); return; }
      const data = result.data;
      const saveResult = await addNote(userId, {
        title: data.title || `Revision: ${topic.topicName}`,
        content: data.sections?.map((s) => `## ${s.heading}\n${s.content}`).join('\n\n') || '',
        contentType: 'ai_bullets', subject: topic.subject, topic: topic.topicName,
        createdByAI: true, sections: data.sections || [],
        keyTakeaways: [...(data.commonMistakes || []), ...(data.keyTakeaways || [])],
      });
      if (saveResult.success) {
        await updateMasteryProgress(userId, topicId, Math.min(100, (topic.masteryProgress || 0) + 10));
        showMessage('Revision notes saved!');
        navigation.navigate('NoteView', { noteId: saveResult.id });
      }
    } catch (e) { Alert.alert('Error', e.message); }
    finally { setGenerating(false); }
  };

  const handleFlashcardReview = () => {
    navigation.navigate('FlashcardStudy', { topic: topic.topicName });
  };

  const handleRemove = () => {
    Alert.alert('Remove Weak Topic', 'Mark this topic as mastered?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', onPress: async () => { await removeWeakTopic(userId, topicId); navigation.goBack(); } },
    ]);
  };

  const styles = getStyles(colors);

  if (loading || !topic) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  const score = topic.weaknessScore || 0;
  const mastery = topic.masteryProgress || 0;
  const severity = score >= 70 ? 'critical' : score >= 40 ? 'moderate' : 'mild';
  const severityColor = severity === 'critical' ? colors.danger : severity === 'moderate' ? '#FF9800' : colors.greenAccent;

  return (
    <SafeAreaView style={styles.container}>
      <HexagonBackground />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleRemove}>
          <Ionicons name="checkmark-done-outline" size={24} color={colors.greenAccent} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Topic Header */}
        <Text style={[styles.title, { color: colors.text }]}>{topic.topicName}</Text>
        {topic.subject && <Text style={[styles.subject, { color: colors.blueAccent }]}>{topic.subject}</Text>}

        {/* Score Card */}
        <GlassCard style={[styles.scoreCard, { borderColor: `${severityColor}33` }]}>
          <View style={styles.scoreRow}>
            <View>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Weakness Score</Text>
              <Text style={[styles.scoreVal, { color: severityColor }]}>{score}%</Text>
            </View>
            <View>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Mastery</Text>
              <Text style={[styles.scoreVal, { color: mastery >= 70 ? colors.greenAccent : '#FF9800' }]}>{mastery}%</Text>
            </View>
          </View>
          <ProgressBar progress={mastery / 100} color={mastery >= 70 ? colors.greenAccent : mastery >= 40 ? '#FF9800' : colors.danger} height={8} />
        </GlassCard>

        {/* Actions */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>IMPROVE</Text>
        <View style={styles.actionGrid}>
          {[
            { label: 'Simplify', icon: 'bulb-outline', color: colors.primary, onPress: handleSimplify },
            { label: 'Mini Quiz', icon: 'help-circle-outline', color: colors.purpleAccent, onPress: handleMiniQuiz },
            { label: 'Revision Notes', icon: 'document-text-outline', color: colors.blueAccent, onPress: handleRevisionNotes },
            { label: 'Review Cards', icon: 'layers-outline', color: colors.greenAccent, onPress: handleFlashcardReview },
          ].map((a) => (
            <TouchableOpacity key={a.label} onPress={a.onPress}
              style={[styles.actionCard, { backgroundColor: `${a.color}14`, borderColor: `${a.color}33` }]}>
              <Ionicons name={a.icon} size={24} color={a.color} />
              <Text style={[styles.actionLabel, { color: colors.text }]}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Mistakes */}
        {topic.linkedQuizMistakes?.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>PAST MISTAKES</Text>
            {topic.linkedQuizMistakes.slice(-10).map((m, i) => (
              <GlassCard key={i} style={[styles.mistakeCard, { borderColor: `${colors.danger}22` }]}>
                <Text style={[styles.mistakeQ, { color: colors.text }]}>{m.question}</Text>
                <Text style={[styles.mistakeA, { color: colors.danger }]}>You: {m.userAnswer}</Text>
                <Text style={[styles.mistakeCorrect, { color: colors.greenAccent }]}>Correct: {m.correctAnswer}</Text>
              </GlassCard>
            ))}
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      <AILoadingOverlay visible={generating} message={genMessage} />
    </SafeAreaView>
  );
}

const getStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: '800', marginBottom: 4 },
  subject: { fontSize: 15, fontWeight: '600', marginBottom: 20 },
  scoreCard: { marginBottom: 24, borderWidth: 1 },
  scoreRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  label: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
  scoreVal: { fontSize: 28, fontWeight: '800' },
  sectionTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: 12, marginTop: 8 },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionCard: { width: '48%', borderRadius: 14, borderWidth: 1, padding: 16, alignItems: 'center', gap: 8 },
  actionLabel: { fontSize: 13, fontWeight: '700' },
  mistakeCard: { marginBottom: 8, borderWidth: 1 },
  mistakeQ: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  mistakeA: { fontSize: 13 },
  mistakeCorrect: { fontSize: 13, fontWeight: '600' },
});
