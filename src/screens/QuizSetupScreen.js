import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Modal, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useUser } from '../context/UserContext';
import HexagonBackground from '../components/HexagonBackground';
import SubjectPicker from '../components/SubjectPicker';
import AILoadingOverlay from '../components/AILoadingOverlay';
import { createQuiz } from '../firebase/services/quizService';
import { getNotes } from '../firebase/services/notesService';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { generateContent } from '../services/aiService';
import { topicQuizPrompt, contentQuizPrompt, QUIZ_TYPES } from '../services/prompts/quizPrompts';
import { QUIZ_QUESTION_COUNTS, QUIZ_DIFFICULTIES } from '../constants/studyDefaults';
import { getNoteContentString } from '../utils/noteUtils';

const TYPE_OPTIONS = [
  { key: QUIZ_TYPES.mcq, label: 'MCQ', icon: 'list-outline' },
  { key: QUIZ_TYPES.trueFalse, label: 'True/False', icon: 'swap-horizontal-outline' },
  { key: QUIZ_TYPES.shortAnswer, label: 'Short Answer', icon: 'create-outline' },
  { key: QUIZ_TYPES.mixed, label: 'Mixed', icon: 'shuffle-outline' },
];

export default function QuizSetupScreen({ navigation, route }) {
  const { colors, Typography } = useTheme();
  const { userId, showMessage } = useUser();

  const [source, setSource] = useState(route.params?.content ? 'paste' : 'topic');
  const [topicInput, setTopicInput] = useState('');
  const [pasteInput, setPasteInput] = useState(route.params?.content || '');
  const [quizType, setQuizType] = useState(QUIZ_TYPES.mcq);
  const [count, setCount] = useState(10);
  const [difficulty, setDifficulty] = useState('mixed');
  const [subject, setSubject] = useState(route.params?.subject || '');
  const [topic, setTopic] = useState(route.params?.topic || '');
  const [generating, setGenerating] = useState(false);
  const [showSubjectPicker, setShowSubjectPicker] = useState(false);
  const [existingNotes, setExistingNotes] = useState([]);
  const [selectedNote, setSelectedNote] = useState(null);
  const [showNotePicker, setShowNotePicker] = useState(false);

  useEffect(() => {
    if (userId) {
      getNotes(userId).then(setExistingNotes);
    }
  }, [userId]);

  const handleGenerate = async () => {
    let input = '';
    if (source === 'topic') {
      input = topicInput.trim();
      if (!input) { Alert.alert('Missing', 'Enter a topic.'); return; }
    } else if (source === 'paste') {
      input = pasteInput.trim();
      if (!input) { Alert.alert('Missing', 'Paste content.'); return; }
    } else {
      // notes
      if (!selectedNote) { Alert.alert('Missing', 'Select an existing study note.'); return; }
      input = getNoteContentString(selectedNote);
      if (!input) { Alert.alert('Empty Note', 'This note does not contain any content.'); return; }
    }

    setGenerating(true);
    try {
      // Caching check
      let cachedQuizId = null;
      const targetTopic = topic || (source === 'topic' ? topicInput.trim() : (source === 'notes' ? selectedNote?.topic : ''));

      if (targetTopic) {
        try {
          const quizzesRef = collection(db, 'users', userId, 'quizzes');
          const q = query(
            quizzesRef,
            where('topic', '==', targetTopic),
            where('quizType', '==', quizType)
          );
          const snap = await getDocs(q);
          if (!snap.empty) {
            cachedQuizId = snap.docs[0].id;
          }
        } catch (cacheErr) {
          console.warn('Quiz cache check failed:', cacheErr);
        }
      }

      if (cachedQuizId) {
        showMessage('Loaded cached quiz from Firebase!');
        setGenerating(false);
        navigation.replace('QuizTaking', { quizId: cachedQuizId });
        return;
      }

      const prompt = source === 'topic'
        ? topicQuizPrompt(topicInput.trim(), quizType, count, difficulty)
        : contentQuizPrompt(input, quizType, count, difficulty);
      const result = await generateContent(prompt);
      if (!result.success) { Alert.alert('AI Error', result.error); return; }

      let questions = [];
      let title = `Quiz: ${input.substring(0, 40)}`;

      if (Array.isArray(result.data)) {
        questions = result.data;
      } else if (result.data) {
        questions = result.data.questions || [];
        if (result.data.title) {
          title = result.data.title;
        }
      }

      if (!questions || questions.length === 0) {
        Alert.alert('AI Error', 'The AI generated 0 questions. Please refine your input and try again.');
        return;
      }

      const quizData = {
        title,
        quizType,
        subject,
        topic: topic || (source === 'topic' ? input : ''),
        sourceType: source === 'topic' ? 'topic' : 'upload',
        questions,
      };

      const saveResult = await createQuiz(userId, quizData);
      if (saveResult.success) {
        showMessage('Quiz generated!');
        navigation.replace('QuizTaking', { quizId: saveResult.id });
      } else {
        Alert.alert('Save Error', saveResult.error || 'Failed to save the generated quiz.');
      }
    } catch (e) { Alert.alert('Error', e.message); }
    finally { setGenerating(false); }
  };

  const styles = getStyles(colors);

  return (
    <SafeAreaView style={styles.container}>
      <HexagonBackground />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[Typography.h2, { color: colors.text }]}>New Quiz</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {/* Source */}
        <View style={styles.row}>
          {['topic', 'paste', 'notes'].map((s) => (
            <TouchableOpacity key={s} onPress={() => setSource(s)}
              style={[styles.chip, { flex: 1, backgroundColor: source === s ? `${colors.primary}24` : colors.shimmer, borderColor: source === s ? `${colors.primary}55` : colors.glassBorder }]}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: source === s ? colors.primary : colors.textSecondary }}>
                {s === 'paste' ? 'Paste Content' : s === 'notes' ? 'From Note' : 'Topic Name'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {source === 'topic' ? (
          <TextInput value={topicInput} onChangeText={setTopicInput} placeholder="e.g. Cell Biology" placeholderTextColor={colors.textTertiary}
            style={[styles.input, { color: colors.text, borderColor: colors.glassBorder, backgroundColor: colors.shimmer }]} />
        ) : source === 'paste' ? (
          <TextInput value={pasteInput} onChangeText={setPasteInput} placeholder="Paste study content..." placeholderTextColor={colors.textTertiary}
            style={[styles.textArea, { color: colors.text, borderColor: colors.glassBorder, backgroundColor: colors.shimmer }]} multiline textAlignVertical="top" />
        ) : (
          <TouchableOpacity onPress={() => setShowNotePicker(true)}
            style={[styles.metaBtn, { marginTop: 0, borderColor: colors.primary, backgroundColor: `${colors.primary}0D` }]}>
            <Ionicons name="document-text-outline" size={18} color={colors.primary} />
            <Text style={{ flex: 1, fontSize: 14, color: colors.text, fontWeight: '700' }}>
              {selectedNote ? `Note: ${selectedNote.title}` : 'Choose from existing notes'}
            </Text>
            <Ionicons name="chevron-down" size={16} color={colors.primary} />
          </TouchableOpacity>
        )}

        <Text style={[styles.label, { color: colors.textSecondary }]}>QUIZ TYPE</Text>
        <View style={styles.typeGrid}>
          {TYPE_OPTIONS.map((t) => (
            <TouchableOpacity key={t.key} onPress={() => setQuizType(t.key)}
              style={[styles.typeCard, { backgroundColor: quizType === t.key ? `${colors.purpleAccent}18` : colors.shimmer, borderColor: quizType === t.key ? `${colors.purpleAccent}55` : colors.glassBorder }]}>
              <Ionicons name={t.icon} size={22} color={quizType === t.key ? colors.purpleAccent : colors.textSecondary} />
              <Text style={{ fontSize: 13, fontWeight: '700', color: quizType === t.key ? colors.purpleAccent : colors.text }}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.label, { color: colors.textSecondary }]}>QUESTIONS</Text>
        <View style={styles.row}>
          {QUIZ_QUESTION_COUNTS.map((c) => (
            <TouchableOpacity key={c} onPress={() => setCount(c)}
              style={[styles.countChip, { backgroundColor: count === c ? `${colors.primary}24` : colors.shimmer, borderColor: count === c ? `${colors.primary}55` : colors.glassBorder }]}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: count === c ? colors.primary : colors.textSecondary }}>{c}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.label, { color: colors.textSecondary }]}>DIFFICULTY</Text>
        <View style={styles.row}>
          {QUIZ_DIFFICULTIES.map((d) => (
            <TouchableOpacity key={d} onPress={() => setDifficulty(d)}
              style={[styles.countChip, { backgroundColor: difficulty === d ? `${colors.primary}24` : colors.shimmer, borderColor: difficulty === d ? `${colors.primary}55` : colors.glassBorder }]}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: difficulty === d ? colors.primary : colors.textSecondary, textTransform: 'capitalize' }}>{d}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity onPress={() => setShowSubjectPicker(true)}
          style={[styles.metaBtn, { borderColor: colors.glassBorder, backgroundColor: colors.shimmer }]}>
          <Ionicons name="folder-outline" size={18} color={colors.textSecondary} />
          <Text style={{ flex: 1, fontSize: 14, color: subject ? colors.text : colors.textTertiary }}>
            {subject ? `${subject}${topic ? ` / ${topic}` : ''}` : 'Subject & topic (optional)'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleGenerate} disabled={generating}
          style={[styles.genBtn, { backgroundColor: colors.purpleAccent }]}>
          <Ionicons name="sparkles" size={20} color="#FFF" />
          <Text style={styles.genBtnText}>Generate Quiz</Text>
        </TouchableOpacity>
      </ScrollView>

      <AILoadingOverlay visible={generating} message="Generating your quiz..." />
      <SubjectPicker visible={showSubjectPicker} onClose={() => setShowSubjectPicker(false)}
        onSelect={({ subject: s, topic: t }) => { setSubject(s); setTopic(t); }} initialSubject={subject} initialTopic={topic} />

      {/* Modal: Note Picker */}
      <Modal visible={showNotePicker} animationType="slide" transparent>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowNotePicker(false)}>
          <View style={[styles.notesModal, { backgroundColor: colors.surface, borderColor: colors.glassBorder }]}>
            <View style={styles.modalHeader}>
              <Text style={[Typography.h3, { color: colors.text }]}>Select Study Note</Text>
              <TouchableOpacity onPress={() => setShowNotePicker(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            {existingNotes.length === 0 ? (
              <Text style={{ textAlign: 'center', marginVertical: 30, color: colors.textSecondary }}>No notes available yet.</Text>
            ) : (
              <FlatList
                data={existingNotes}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ paddingBottom: 20 }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.noteSelectItem, { borderColor: colors.glassBorder, backgroundColor: colors.shimmer }]}
                    onPress={() => {
                      setSelectedNote(item);
                      setSubject(item.subject || '');
                      setTopic(item.topic || '');
                      setShowNotePicker(false);
                    }}
                  >
                    <Ionicons name="document-text" size={20} color={colors.primary} />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={{ color: colors.text, fontSize: 15, fontWeight: '700' }}>{item.title}</Text>
                      <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>
                        {item.subject ? item.subject : 'No Subject'} {item.topic ? `· ${item.topic}` : ''}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const getStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  row: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  chip: { paddingVertical: 12, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  input: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, marginBottom: 6 },
  textArea: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, minHeight: 100, marginBottom: 6 },
  label: { fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: 10, marginTop: 12 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  typeCard: { width: '48%', borderRadius: 14, borderWidth: 1, padding: 16, alignItems: 'center', gap: 6 },
  countChip: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  metaBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginTop: 16 },
  genBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16, borderRadius: 14, marginTop: 24 },
  genBtnText: { fontSize: 16, fontWeight: '800', color: '#FFF' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  notesModal: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, borderBottomWidth: 0, padding: 24, height: '70%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  noteSelectItem: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 10 },
});
