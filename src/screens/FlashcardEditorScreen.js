import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useUser } from '../context/UserContext';
import HexagonBackground from '../components/HexagonBackground';
import SubjectPicker from '../components/SubjectPicker';
import { addFlashcard, getFlashcard, updateFlashcard } from '../firebase/services/flashcardService';
import { FLASHCARD_TYPE_LABELS, DIFFICULTY_COLORS } from '../constants/studyDefaults';

const TYPES = Object.keys(FLASHCARD_TYPE_LABELS);
const DIFFICULTIES = ['easy', 'medium', 'hard'];

export default function FlashcardEditorScreen({ navigation, route }) {
  const { colors, Typography } = useTheme();
  const { userId, showMessage } = useUser();
  const cardId = route.params?.cardId;
  const isEditing = Boolean(cardId);

  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [type, setType] = useState('recall');
  const [difficulty, setDifficulty] = useState('medium');
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [saving, setSaving] = useState(false);
  const [showSubjectPicker, setShowSubjectPicker] = useState(false);

  useEffect(() => {
    if (isEditing) {
      (async () => {
        const card = await getFlashcard(userId, cardId);
        if (card) {
          setQuestion(card.question || '');
          setAnswer(card.answer || '');
          setType(card.type || 'recall');
          setDifficulty(card.difficulty || 'medium');
          setSubject(card.subject || '');
          setTopic(card.topic || '');
        }
      })();
    }
  }, [userId, cardId, isEditing]);

  const handleSave = async () => {
    if (!question.trim() || !answer.trim()) {
      Alert.alert('Required', 'Please enter both question and answer.');
      return;
    }
    setSaving(true);
    try {
      const data = { question: question.trim(), answer: answer.trim(), type, difficulty, subject, topic };
      if (isEditing) {
        await updateFlashcard(userId, cardId, data);
        showMessage('Flashcard updated');
      } else {
        await addFlashcard(userId, data);
        showMessage('Flashcard created');
      }
      navigation.goBack();
    } catch (e) { Alert.alert('Error', e.message); }
    finally { setSaving(false); }
  };

  const styles = getStyles(colors);

  return (
    <SafeAreaView style={styles.container}>
      <HexagonBackground />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[Typography.h3, { color: colors.text }]}>{isEditing ? 'Edit Card' : 'New Card'}</Text>
          <TouchableOpacity onPress={handleSave} disabled={saving}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: saving ? colors.textTertiary : colors.primary }}>
              {saving ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <TextInput value={question} onChangeText={setQuestion} placeholder="Question..." placeholderTextColor={colors.textTertiary}
            style={[styles.input, { color: colors.text, borderColor: colors.glassBorder, backgroundColor: colors.shimmer }]} multiline />
          <TextInput value={answer} onChangeText={setAnswer} placeholder="Answer..." placeholderTextColor={colors.textTertiary}
            style={[styles.input, { color: colors.text, borderColor: colors.glassBorder, backgroundColor: colors.shimmer }]} multiline />

          <Text style={[styles.label, { color: colors.textSecondary }]}>TYPE</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {TYPES.map((t) => {
              const info = FLASHCARD_TYPE_LABELS[t];
              const active = type === t;
              return (
                <TouchableOpacity key={t} onPress={() => setType(t)}
                  style={[styles.chip, { backgroundColor: active ? `${info.color}24` : colors.shimmer, borderColor: active ? `${info.color}55` : colors.glassBorder }]}>
                  <Ionicons name={info.icon} size={14} color={active ? info.color : colors.textSecondary} />
                  <Text style={[styles.chipText, { color: active ? info.color : colors.textSecondary }]}>{info.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <Text style={[styles.label, { color: colors.textSecondary }]}>DIFFICULTY</Text>
          <View style={styles.diffRow}>
            {DIFFICULTIES.map((d) => {
              const active = difficulty === d;
              const dc = DIFFICULTY_COLORS[d];
              return (
                <TouchableOpacity key={d} onPress={() => setDifficulty(d)}
                  style={[styles.diffChip, { backgroundColor: active ? `${dc}24` : colors.shimmer, borderColor: active ? `${dc}55` : colors.glassBorder }]}>
                  <Text style={[styles.chipText, { color: active ? dc : colors.textSecondary, textTransform: 'capitalize' }]}>{d}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity onPress={() => setShowSubjectPicker(true)}
            style={[styles.metaBtn, { borderColor: colors.glassBorder, backgroundColor: colors.shimmer }]}>
            <Ionicons name="folder-outline" size={18} color={colors.textSecondary} />
            <Text style={{ flex: 1, fontSize: 14, color: subject ? colors.text : colors.textTertiary }}>
              {subject ? `${subject}${topic ? ` / ${topic}` : ''}` : 'Select subject & topic'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
      <SubjectPicker visible={showSubjectPicker} onClose={() => setShowSubjectPicker(false)}
        onSelect={({ subject: s, topic: t }) => { setSubject(s); setTopic(t); }} initialSubject={subject} initialTopic={topic} />
    </SafeAreaView>
  );
}

const getStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  input: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, marginBottom: 12, minHeight: 70, textAlignVertical: 'top' },
  label: { fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: 10, marginTop: 10 },
  chipRow: { gap: 8, paddingBottom: 4 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  chipText: { fontSize: 13, fontWeight: '600' },
  diffRow: { flexDirection: 'row', gap: 10 },
  diffChip: { flex: 1, paddingVertical: 10, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  metaBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginTop: 16 },
});
