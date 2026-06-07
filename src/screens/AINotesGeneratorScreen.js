import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useTheme } from '../theme/ThemeContext';
import { useUser } from '../context/UserContext';
import HexagonBackground from '../components/HexagonBackground';
import SubjectPicker from '../components/SubjectPicker';
import AILoadingOverlay from '../components/AILoadingOverlay';
import { addNote } from '../firebase/services/notesService';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { generateContent } from '../services/aiService';
import { topicNotesPrompt, contentNotesPrompt, NOTE_TYPES } from '../services/prompts/notesPrompts';
import PDFExtractorWebView from '../components/PDFTextExtractor';
import { processDocument } from '../services/documentProcessor';

const NOTE_TYPE_OPTIONS = [
  { key: NOTE_TYPES.summary, label: 'Concise Summary', icon: 'flash-outline', desc: '3-5 key points' },
  { key: NOTE_TYPES.detailed, label: 'Detailed Notes', icon: 'document-text-outline', desc: 'Full sections & examples' },
  { key: NOTE_TYPES.bullets, label: 'Bullet Points', icon: 'list-outline', desc: 'Quick revision list' },
  { key: NOTE_TYPES.formula, label: 'Formula Sheet', icon: 'calculator-outline', desc: 'Formulas & key terms' },
  { key: NOTE_TYPES.flowchart, label: 'Flowchart', icon: 'git-network-outline', desc: 'Visual diagram' },
  { key: NOTE_TYPES.visual, label: 'Visual Revision', icon: 'eye-outline', desc: 'Structured with memory aids' },
];

const SOURCE_OPTIONS = [
  { key: 'topic', label: 'From Topic', icon: 'bulb-outline' },
  { key: 'paste', label: 'From Paste', icon: 'clipboard-outline' },
  { key: 'upload', label: 'From File', icon: 'document-attach-outline' },
];

const DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

export default function AINotesGeneratorScreen({ navigation }) {
  const { colors, Typography } = useTheme();
  const { userId, showMessage } = useUser();

  const [source, setSource] = useState('topic');
  const [topicInput, setTopicInput] = useState('');
  const [pasteInput, setPasteInput] = useState('');
  const [noteType, setNoteType] = useState(NOTE_TYPES.summary);
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [generating, setGenerating] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Generating your notes...');
  const [showSubjectPicker, setShowSubjectPicker] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  // Ref for the always-mounted PDF extractor WebView
  const pdfExtractorRef = useRef(null);

  // ─── File Picker ──────────────────────────────────────

  const handlePickFile = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: DOCUMENT_MIME_TYPES,
        copyToCacheDirectory: true,
      });

      if (res.canceled || !res.assets || res.assets.length === 0) {
        return;
      }

      const file = res.assets[0];
      console.log('[DOC_PIPELINE] File picked:', JSON.stringify({
        uri: file.uri,
        name: file.name,
        mimeType: file.mimeType,
        size: file.size,
      }));
      setSelectedFile(file);
    } catch (e) {
      console.error('[DOC_PIPELINE] File picker error:', e);
      Alert.alert('Error', 'Failed to pick file: ' + e.message);
    }
  };

  // ─── Generate Handler ─────────────────────────────────

  const handleGenerate = async () => {
    if (source === 'topic') {
      const input = topicInput.trim();
      if (!input) {
        Alert.alert('Missing Input', 'Enter a topic name.');
        return;
      }
      await handleTopicGenerate(input);
    } else if (source === 'paste') {
      const input = pasteInput.trim();
      if (!input) {
        Alert.alert('Missing Input', 'Paste some content.');
        return;
      }
      await handlePasteGenerate(input);
    } else {
      // Upload source
      if (!selectedFile) {
        Alert.alert('Missing Input', 'Please choose a file to upload.');
        return;
      }
      if (selectedFile.size && selectedFile.size > 15 * 1024 * 1024) {
        Alert.alert('File Too Large', 'Please upload a file smaller than 15MB.');
        return;
      }
      await handleDocumentUpload();
    }
  };

  // ─── Topic-based Generation ───────────────────────────

  const handleTopicGenerate = async (input) => {
    setGenerating(true);
    setLoadingMessage('Generating your notes...');
    try {
      // Cache check
      const cachedId = await checkNoteCache(input, 'topic');
      if (cachedId) {
        showMessage('Loaded cached notes!');
        setGenerating(false);
        navigation.replace('NoteView', { noteId: cachedId });
        return;
      }

      const prompt = topicNotesPrompt(input, noteType);
      const result = await generateContent(prompt, { json: true });
      await handleAIResultSave(result, input);
    } catch (e) {
      console.error('Generation error:', e);
      Alert.alert('Error', e.message);
      setGenerating(false);
    }
  };

  // ─── Paste-based Generation ───────────────────────────

  const handlePasteGenerate = async (input) => {
    setGenerating(true);
    setLoadingMessage('Generating your notes...');
    try {
      const prompt = contentNotesPrompt(input, noteType);
      const result = await generateContent(prompt, { json: true });
      await handleAIResultSave(result, input);
    } catch (e) {
      console.error('Generation error:', e);
      Alert.alert('Error', e.message);
      setGenerating(false);
    }
  };

  // ─── Document Upload — NEW PIPELINE ───────────────────

  const handleDocumentUpload = async () => {
    setGenerating(true);
    setLoadingMessage('Processing document...');

    try {
      const result = await processDocument(userId, selectedFile, {
        subject,
        topic,
        pdfExtractorRef,
        onProgress: (msg) => setLoadingMessage(msg),
      });

      if (result.success) {
        if (result.warning) {
          showMessage('Document saved. ' + result.warning);
        } else {
          showMessage('Document processed & study suite generated!');
        }
        setGenerating(false);
        navigation.replace('NoteView', { noteId: result.noteId });
      } else {
        console.error('[DOC_PIPELINE] Pipeline failed at step:', result.step, 'Error:', result.error);
        Alert.alert(
          'Processing Failed',
          `${result.error}\n\n(Step: ${result.step || 'unknown'})`,
        );
        setGenerating(false);
      }
    } catch (e) {
      console.error('[DOC_PIPELINE] Unexpected error:', e);
      Alert.alert('Error', e.message);
      setGenerating(false);
    }
  };

  // ─── Cache Check ──────────────────────────────────────

  const checkNoteCache = async (input, sourceType) => {
    try {
      const notesRef = collection(db, 'users', userId, 'notes');
      const contentType = `ai_${noteType === NOTE_TYPES.flowchart ? 'flowchart' :
        noteType === NOTE_TYPES.summary ? 'summary' :
        noteType === NOTE_TYPES.detailed ? 'detailed' :
        noteType === NOTE_TYPES.bullets ? 'bullets' :
        noteType === NOTE_TYPES.formula ? 'formula' : 'visual'}`;

      const q = query(
        notesRef,
        where('topic', '==', input),
        where('contentType', '==', contentType),
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        return snap.docs[0].id;
      }
    } catch (err) {
      console.warn('Cache check failed:', err);
    }
    return null;
  };

  // ─── Save AI Result (for topic/paste) ─────────────────

  const handleAIResultSave = async (result, originalInputName) => {
    if (!result.success) {
      Alert.alert('AI Error', result.error || 'Failed to generate notes.');
      setGenerating(false);
      return;
    }

    const aiData = result.data;
    const contentType = `ai_${noteType === NOTE_TYPES.flowchart ? 'flowchart' :
      noteType === NOTE_TYPES.summary ? 'summary' :
      noteType === NOTE_TYPES.detailed ? 'detailed' :
      noteType === NOTE_TYPES.bullets ? 'bullets' :
      noteType === NOTE_TYPES.formula ? 'formula' : 'visual'}`;

    const noteData = {
      title: aiData.title || `AI Notes: ${originalInputName.substring(0, 50)}`,
      content: aiData.sections?.map((s) => `## ${s.heading}\n${s.content || s.items?.map((item) => `${item.label}: ${item.value}`).join('\n') || ''}`).join('\n\n') || aiData.summary || '',
      contentType,
      subject: subject || '',
      topic: topic || (source === 'topic' ? originalInputName : ''),
      sourceType: source,
      createdByAI: true,
      aiPromptUsed: noteType,
      sections: aiData.sections || [],
      keyTakeaways: aiData.keyTakeaways || [],
      mermaidCode: aiData.mermaidCode || '',
    };

    const saveResult = await addNote(userId, noteData);
    if (saveResult.success) {
      showMessage('AI notes generated!');
      setGenerating(false);
      navigation.replace('NoteView', { noteId: saveResult.id });
    } else {
      Alert.alert('Save Error', saveResult.error);
      setGenerating(false);
    }
  };

  const styles = getStyles(colors);

  return (
    <SafeAreaView style={styles.container}>
      <HexagonBackground />

      {/* Always-mounted PDF extractor WebView (hidden, zero size) */}
      <PDFExtractorWebView
        ref={pdfExtractorRef}
        onProgress={(msg) => setLoadingMessage(msg)}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[Typography.h2, { color: colors.text }]}>AI Notes</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Source Selection */}
        <Text style={[styles.label, { color: colors.textSecondary }]}>SOURCE</Text>
        <View style={styles.sourceRow}>
          {SOURCE_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.key}
              onPress={() => setSource(opt.key)}
              style={[
                styles.sourceChip,
                {
                  backgroundColor: source === opt.key ? `${colors.primary}24` : colors.shimmer,
                  borderColor: source === opt.key ? `${colors.primary}55` : colors.glassBorder,
                },
              ]}
            >
              <Ionicons name={opt.icon} size={16} color={source === opt.key ? colors.primary : colors.textSecondary} />
              <Text style={[styles.sourceText, { color: source === opt.key ? colors.primary : colors.textSecondary }]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Input */}
        {source === 'topic' ? (
          <TextInput
            value={topicInput}
            onChangeText={setTopicInput}
            placeholder="e.g. Newton's Laws of Motion"
            placeholderTextColor={colors.textTertiary}
            style={[styles.input, { color: colors.text, borderColor: colors.glassBorder, backgroundColor: colors.shimmer }]}
          />
        ) : source === 'paste' ? (
          <TextInput
            value={pasteInput}
            onChangeText={setPasteInput}
            placeholder="Paste your study content here..."
            placeholderTextColor={colors.textTertiary}
            style={[styles.textArea, { color: colors.text, borderColor: colors.glassBorder, backgroundColor: colors.shimmer }]}
            multiline
            textAlignVertical="top"
          />
        ) : (
          <TouchableOpacity
            onPress={handlePickFile}
            style={[styles.uploadBox, { borderColor: colors.primary, backgroundColor: `${colors.primary}0D` }]}
          >
            <Ionicons name="document-attach" size={32} color={colors.primary} />
            <Text style={[styles.uploadText, { color: colors.text, marginTop: 8 }]} numberOfLines={1}>
              {selectedFile ? selectedFile.name : 'Choose PDF, PPTX, PPT, DOCX, or DOC document'}
            </Text>
            {selectedFile && (
              <Text style={[styles.uploadSubtext, { color: colors.textSecondary, marginTop: 4 }]}>
                {Math.round((selectedFile.size || 0) / 1024)} KB · {selectedFile.mimeType || 'document file'}
              </Text>
            )}
          </TouchableOpacity>
        )}

        {/* Note Type (hidden for uploads) */}
        {source !== 'upload' && (
          <>
            <Text style={[styles.label, { color: colors.textSecondary }]}>NOTE TYPE</Text>
            <View style={styles.typeGrid}>
              {NOTE_TYPE_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.key}
                  onPress={() => setNoteType(opt.key)}
                  style={[
                    styles.typeCard,
                    {
                      backgroundColor: noteType === opt.key ? `${colors.primary}18` : colors.shimmer,
                      borderColor: noteType === opt.key ? `${colors.primary}55` : colors.glassBorder,
                    },
                  ]}
                >
                  <Ionicons name={opt.icon} size={22} color={noteType === opt.key ? colors.primary : colors.textSecondary} />
                  <Text style={[styles.typeLabel, { color: noteType === opt.key ? colors.primary : colors.text }]}>
                    {opt.label}
                  </Text>
                  <Text style={[styles.typeDesc, { color: colors.textTertiary }]}>{opt.desc}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* Subject/Topic */}
        <Text style={[styles.label, { color: colors.textSecondary }]}>ORGANIZE</Text>
        <TouchableOpacity
          onPress={() => setShowSubjectPicker(true)}
          style={[styles.metaBtn, { borderColor: colors.glassBorder, backgroundColor: colors.shimmer }]}
        >
          <Ionicons name="folder-outline" size={18} color={colors.textSecondary} />
          <Text style={[styles.metaBtnText, { color: subject ? colors.text : colors.textTertiary }]}>
            {subject ? `${subject}${topic ? ` / ${topic}` : ''}` : 'Select subject & topic (optional)'}
          </Text>
        </TouchableOpacity>

        {/* Generate Button */}
        <TouchableOpacity
          onPress={handleGenerate}
          disabled={generating}
          style={[styles.generateBtn, { backgroundColor: colors.primary }]}
        >
          <Ionicons name="sparkles" size={20} color="#000" />
          <Text style={styles.generateText}>
            {source === 'upload' ? 'Process Document' : 'Generate Notes'}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      <AILoadingOverlay visible={generating} message={loadingMessage} />
      <SubjectPicker
        visible={showSubjectPicker}
        onClose={() => setShowSubjectPicker(false)}
        onSelect={({ subject: s, topic: t }) => { setSubject(s); setTopic(t); }}
        initialSubject={subject}
        initialTopic={topic}
      />
    </SafeAreaView>
  );
}

const getStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
  },
  backBtn: { padding: 4 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  label: { fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: 10, marginTop: 20 },
  sourceRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  sourceChip: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 12, borderRadius: 12, borderWidth: 1,
  },
  sourceText: { fontSize: 13, fontWeight: '600' },
  input: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, marginBottom: 6 },
  textArea: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, minHeight: 120, marginBottom: 6 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  typeCard: {
    width: '48%', borderRadius: 14, borderWidth: 1, padding: 14, alignItems: 'center', gap: 6,
  },
  typeLabel: { fontSize: 13, fontWeight: '700', textAlign: 'center' },
  typeDesc: { fontSize: 11, textAlign: 'center' },
  metaBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
  },
  metaBtnText: { fontSize: 14, flex: 1 },
  generateBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, paddingVertical: 16, borderRadius: 14, marginTop: 24,
  },
  generateText: { fontSize: 16, fontWeight: '800', color: '#000' },
  uploadBox: {
    borderWidth: 2, borderStyle: 'dashed', borderRadius: 14,
    padding: 24, alignItems: 'center', justifyContent: 'center',
    marginBottom: 6, minHeight: 120,
  },
  uploadText: { fontSize: 14, fontWeight: '700', textAlign: 'center', paddingHorizontal: 12 },
  uploadSubtext: { fontSize: 11 },
});
