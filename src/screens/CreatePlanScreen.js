import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Alert, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useUser } from '../context/UserContext';
import HoneyButton from '../components/HoneyButton';
import GlassCard from '../components/GlassCard';
import HexagonBackground from '../components/HexagonBackground';
import AILoadingOverlay from '../components/AILoadingOverlay';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { addTask } from '../firebase/services/taskService';
import { generateContent } from '../services/aiService';
import { plannerPrompt } from '../services/prompts/plannerPrompts';

const getDurationFromTimes = (startTime, endTime) => {
  const startParts = startTime.split(':').map(Number);
  const endParts = endTime.split(':').map(Number);
  if (startParts.length !== 2 || endParts.length !== 2 || startParts.some(isNaN) || endParts.some(isNaN)) {
    return '45 min';
  }
  const startMinutes = startParts[0] * 60 + startParts[1];
  const endMinutes = endParts[0] * 60 + endParts[1];
  const diff = endMinutes - startMinutes;
  if (diff <= 0) return '45 min';
  return `${diff} min`;
};

export default function CreatePlanScreen({ navigation }) {
  const { colors, Typography } = useTheme();
  const { userId, showMessage } = useUser();
  const styles = getStyles(colors, Typography);

  const [subject, setSubject] = useState('');
  const [mode, setMode] = useState('Exam Prep');
  const [generating, setGenerating] = useState(false);

  const handleGeneratePlan = async () => {
    const sub = subject.trim();
    if (!sub) {
      Alert.alert('Missing Input', 'Please enter a subject to generate a study plan.');
      return;
    }

    setGenerating(true);
    try {
      // Get today's date formatted as YYYY-MM-DD
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const dateKey = `${year}-${month}-${day}`;

      // Caching check: Query tasks in Firestore for this subject on today's date
      let cachedTasksCount = 0;
      try {
        const tasksRef = collection(db, 'users', userId, 'tasks');
        const q = query(
          tasksRef,
          where('date', '==', dateKey),
          where('subject', '==', sub)
        );
        const snap = await getDocs(q);
        cachedTasksCount = snap.size;
      } catch (cacheErr) {
        console.warn('Planner cache check failed:', cacheErr);
      }

      if (cachedTasksCount > 0) {
        showMessage('Loaded cached study plan from Firebase!');
        setGenerating(false);
        navigation.goBack();
        return;
      }

      // Generate plan using llama-3.3-70b-versatile
      const prompt = plannerPrompt(sub, mode);
      const result = await generateContent(prompt, {
        json: true,
        model: 'llama-3.3-70b-versatile'
      });

      if (!result.success) {
        Alert.alert('AI Error', result.error || 'Failed to generate plan.');
        setGenerating(false);
        return;
      }

      const tasks = result.data?.tasks || [];
      if (tasks.length === 0) {
        Alert.alert('AI Error', 'The AI did not generate any tasks. Please try again.');
        setGenerating(false);
        return;
      }

      // Batch-save tasks to Firebase
      for (const task of tasks) {
        const durationParts = (task.startTime && task.endTime)
          ? getDurationFromTimes(task.startTime, task.endTime)
          : '45 min';
        await addTask(userId, {
          subject: task.subject || sub,
          topic: task.topic || 'Review',
          startTime: task.startTime || '09:00',
          endTime: task.endTime || '09:45',
          duration: durationParts || '45 min',
          difficulty: task.difficulty || 'Medium',
          status: task.status || 'Upcoming',
          date: dateKey,
        });
      }

      showMessage('Generated daily study plan!');
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <HexagonBackground />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Ionicons name="arrow-back" size={28} color={colors.text} onPress={() => navigation.goBack()} />
          <Text style={[Typography.h2, { color: colors.text }]}>Create Today's Plan</Text>
          <View style={{ width: 28 }} />
        </View>

        <GlassCard style={styles.card}>
          <Text style={[Typography.h3, { color: colors.text }]}>What are we studying today?</Text>
          <View style={[styles.inputContainer, { backgroundColor: colors.surfaceHighlight, borderColor: colors.border }]}>
            <Ionicons name="book" size={20} color={colors.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="E.g. Biology, Math, History..."
              placeholderTextColor={colors.textSecondary}
              value={subject}
              onChangeText={setSubject}
            />
          </View>
        </GlassCard>

        <View style={styles.modesContainer}>
          <Text style={[Typography.h2, { color: colors.text, marginBottom: 16 }]}>Quick Start</Text>
          <View style={styles.modeRow}>
            <TouchableOpacity
              style={{ flex: 1 }}
              onPress={() => setMode('Exam Prep')}
              activeOpacity={0.8}
            >
              <GlassCard style={[styles.modeCard, mode === 'Exam Prep' && { borderColor: colors.primary, borderWidth: 1.5 }]}>
                <Ionicons name="school" size={32} color={colors.primary} />
                <Text style={[Typography.h3, { color: colors.text, marginTop: 12 }]}>Exam Prep</Text>
                <Text style={[Typography.caption, { marginTop: 4, color: colors.textSecondary }]}>Intense focus mode</Text>
              </GlassCard>
            </TouchableOpacity>

            <TouchableOpacity
              style={{ flex: 1 }}
              onPress={() => setMode('Revision')}
              activeOpacity={0.8}
            >
              <GlassCard style={[styles.modeCard, mode === 'Revision' && { borderColor: colors.blueAccent, borderWidth: 1.5 }]}>
                <Ionicons name="refresh-circle" size={32} color={colors.blueAccent} />
                <Text style={[Typography.h3, { color: colors.text, marginTop: 12 }]}>Revision</Text>
                <Text style={[Typography.caption, { marginTop: 4, color: colors.textSecondary }]}>Active recall & flashcards</Text>
              </GlassCard>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
      <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.surface }]}>
        <HoneyButton title="Generate Plan with Honey" icon="sparkles" onPress={handleGeneratePlan} />
      </View>
      <AILoadingOverlay visible={generating} message="Creating study plan..." />
    </SafeAreaView>
  );
}

const getStyles = (colors, Typography) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  card: {
    marginBottom: 24,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    marginTop: 16,
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    ...Typography.body,
  },
  modesContainer: {
    marginTop: 10,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 16,
  },
  modeCard: {
    alignItems: 'center',
    padding: 20,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
  },
});
