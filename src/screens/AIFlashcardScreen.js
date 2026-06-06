import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, FlatList, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useUser } from '../context/UserContext';
import HexagonBackground from '../components/HexagonBackground';
import SubjectPicker from '../components/SubjectPicker';
import AILoadingOverlay from '../components/AILoadingOverlay';
import GlassCard from '../components/GlassCard';
import { addFlashcards } from '../firebase/services/flashcardService';
import { getNotes } from '../firebase/services/notesService';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { generateContent } from '../services/aiService';
import { topicFlashcardsPrompt, contentFlashcardsPrompt, FLASHCARD_TYPES } from '../services/prompts/flashcardPrompts';
import { getNoteContentString } from '../utils/noteUtils';

const TYPE_OPTIONS = [
  { key: FLASHCARD_TYPES.recall, label: 'Recall', icon: 'bulb-outline' },
  { key: FLASHCARD_TYPES.mcq, label: 'MCQ', icon: 'list-outline' },
  { key: FLASHCARD_TYPES.formula, label: 'Formula', icon: 'calculator-outline' },
  { key: FLASHCARD_TYPES.definition, label: 'Definition', icon: 'book-outline' },
  { key: FLASHCARD_TYPES.viva, label: 'Viva', icon: 'chatbubbles-outline' },
];
const COUNTS = [5, 10, 15, 20];

export default function AIFlashcardScreen({ navigation, route }) {
  const { colors, Typography } = useTheme();
  const { userId, showMessage } = useUser();

  const [source, setSource] = useState(route.params?.content ? 'paste' : 'topic');
  const [topicInput, setTopicInput] = useState('');
  const [pasteInput, setPasteInput] = useState(route.params?.content || '');
  const [cardType, setCardType] = useState(FLASHCARD_TYPES.recall);
  const [count, setCount] = useState(10);
  const [subject, setSubject] = useState(route.params?.subject || '');
  const [topic, setTopic] = useState(route.params?.topic || '');
  const [generating, setGenerating] = useState(false);
  const [preview, setPreview] = useState(null); // Generated cards preview
  const [isCached, setIsCached] = useState(false);
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
    setIsCached(false);
    try {
      // Caching check
      let cachedCards = [];
      const targetTopic = topic || (source === 'topic' ? topicInput.trim() : (source === 'notes' ? selectedNote?.topic : ''));

      if (targetTopic) {
        try {
          const cardsRef = collection(db, 'users', userId, 'flashcards');
          const q = query(
            cardsRef,
            where('topic', '==', targetTopic),
            where('type', '==', cardType)
          );
          const snap = await getDocs(q);
          if (!snap.empty) {
            cachedCards = snap.docs.map((d) => ({
              id: d.id,
              ...d.data(),
            }));
          }
        } catch (cacheErr) {
          console.warn('Flashcards cache check failed:', cacheErr);
        }
      }

      if (cachedCards.length > 0) {
        showMessage('Loaded cached flashcards from Firebase!');
        setIsCached(true);
        setPreview(cachedCards);
        setGenerating(false);
        return;
      }

      const prompt = source === 'topic'
        ? topicFlashcardsPrompt(topicInput.trim(), cardType, count)
        : contentFlashcardsPrompt(input, cardType, count);
      const result = await generateContent(prompt);
      if (!result.success) { Alert.alert('AI Error', result.error); return; }

      let generatedCards = [];
      if (Array.isArray(result.data)) {
        generatedCards = result.data;
      } else if (result.data) {
        generatedCards = result.data.flashcards || [];
      }

      if (generatedCards.length === 0) {
        Alert.alert('AI Error', 'The AI generated 0 flashcards. Please refine your input and try again.');
        return;
      }

      setPreview(generatedCards);
    } catch (e) { Alert.alert('Error', e.message); }
    finally { setGenerating(false); }
  };

  const handleSaveAll = async () => {
    if (isCached) {
      navigation.goBack();
      return;
    }
    if (!preview?.length) return;
    const cards = preview.map((c) => ({
      question: c.question, answer: c.answer, type: cardType,
      difficulty: c.difficulty || 'medium', subject, topic: topic || (source === 'topic' ? topicInput : ''),
      createdByAI: true, options: c.options || [], correctIndex: c.correctIndex ?? -1, explanation: c.explanation || '',
    }));
    const result = await addFlashcards(userId, cards);
    if (result.success) {
      showMessage(`${result.count} flashcards created!`);
      navigation.goBack();
    }
  };

  const styles = getStyles(colors);

  // Preview mode
  if (preview) {
    return (
      <SafeAreaView style={styles.container}>
        <HexagonBackground />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setPreview(null)}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[Typography.h3, { color: colors.text }]}>Preview ({preview.length})</Text>
          <View style={{ width: 24 }} />
        </View>
        <FlatList data={preview} keyExtractor={(_, i) => String(i)} contentContainerStyle={styles.list}
          renderItem={({ item, index: i }) => (
            <GlassCard style={[styles.previewCard, { borderColor: colors.glassBorder }]}>
              <Text style={[styles.previewQ, { color: colors.primary }]}>Q{i + 1}: {item.question}</Text>
              <Text style={[styles.previewA, { color: colors.text }]}>A: {item.answer}</Text>
              {item.difficulty && <Text style={[styles.previewDiff, { color: colors.textTertiary }]}>{item.difficulty}</Text>}
            </GlassCard>
          )} />
        <View style={styles.previewActions}>
          <TouchableOpacity onPress={handleSaveAll} style={[styles.saveAllBtn, { backgroundColor: colors.primary }]}>
            <Ionicons name="checkmark-circle" size={20} color="#000" />
            <Text style={styles.saveAllText}>{isCached ? 'Done' : `Save All ${preview.length} Cards`}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <HexagonBackground />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[Typography.h2, { color: colors.text }]}>AI Flashcards</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {/* Source */}
        <View style={styles.sourceRow}>
          {['topic', 'paste', 'notes'].map((s) => (
            <TouchableOpacity key={s} onPress={() => setSource(s)}
              style={[styles.sourceChip, { backgroundColor: source === s ? `${colors.primary}24` : colors.shimmer, borderColor: source === s ? `${colors.primary}55` : colors.glassBorder }]}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: source === s ? colors.primary : colors.textSecondary, textTransform: 'capitalize' }}>
                {s === 'paste' ? 'Paste Text' : s === 'notes' ? 'From Note' : 'Topic Name'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {source === 'topic' ? (
          <TextInput value={topicInput} onChangeText={setTopicInput} placeholder="e.g. Photosynthesis" placeholderTextColor={colors.textTertiary}
            style={[styles.input, { color: colors.text, borderColor: colors.glassBorder, backgroundColor: colors.shimmer }]} />
        ) : source === 'paste' ? (
          <TextInput value={pasteInput} onChangeText={setPasteInput} placeholder="Paste content..." placeholderTextColor={colors.textTertiary}
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

        <Text style={[styles.label, { color: colors.textSecondary }]}>TYPE</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {TYPE_OPTIONS.map((t) => (
            <TouchableOpacity key={t.key} onPress={() => setCardType(t.key)}
              style={[styles.chip, { backgroundColor: cardType === t.key ? `${colors.primary}24` : colors.shimmer, borderColor: cardType === t.key ? `${colors.primary}55` : colors.glassBorder }]}>
              <Ionicons name={t.icon} size={14} color={cardType === t.key ? colors.primary : colors.textSecondary} />
              <Text style={{ fontSize: 13, fontWeight: '600', color: cardType === t.key ? colors.primary : colors.textSecondary }}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={[styles.label, { color: colors.textSecondary }]}>COUNT</Text>
        <View style={styles.countRow}>
          {COUNTS.map((c) => (
            <TouchableOpacity key={c} onPress={() => setCount(c)}
              style={[styles.countChip, { backgroundColor: count === c ? `${colors.primary}24` : colors.shimmer, borderColor: count === c ? `${colors.primary}55` : colors.glassBorder }]}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: count === c ? colors.primary : colors.textSecondary }}>{c}</Text>
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
          style={[styles.genBtn, { backgroundColor: colors.primary }]}>
          <Ionicons name="sparkles" size={20} color="#000" />
          <Text style={styles.genBtnText}>Generate Flashcards</Text>
        </TouchableOpacity>
      </ScrollView>

      <AILoadingOverlay visible={generating} message="Generating flashcards..." />
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
  list: { paddingHorizontal: 20, paddingBottom: 100 },
  sourceRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  sourceChip: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  input: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, marginBottom: 6 },
  textArea: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, minHeight: 100, marginBottom: 6 },
  label: { fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: 10, marginTop: 16 },
  chipRow: { gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  countRow: { flexDirection: 'row', gap: 10 },
  countChip: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  metaBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginTop: 16 },
  genBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16, borderRadius: 14, marginTop: 24 },
  genBtnText: { fontSize: 16, fontWeight: '800', color: '#000' },
  previewCard: { marginBottom: 12, borderWidth: 1 },
  previewQ: { fontSize: 15, fontWeight: '700', marginBottom: 6 },
  previewA: { fontSize: 14, lineHeight: 21 },
  previewDiff: { fontSize: 12, marginTop: 6, fontStyle: 'italic' },
  previewActions: { paddingHorizontal: 20, paddingBottom: 24 },
  saveAllBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 14 },
  saveAllText: { fontSize: 16, fontWeight: '700', color: '#000' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  notesModal: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, borderBottomWidth: 0, padding: 24, height: '70%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  noteSelectItem: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 10 },
});
