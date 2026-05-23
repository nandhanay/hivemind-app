import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { useTheme } from '../theme/ThemeContext';
import { useUser } from '../context/UserContext';
import HexagonBackground from '../components/HexagonBackground';
import GlassCard from '../components/GlassCard';
import SubjectPicker from '../components/SubjectPicker';
import AILoadingOverlay from '../components/AILoadingOverlay';
import { addNote } from '../firebase/services/notesService';
import { generateContent } from '../services/aiService';
import { topicNotesPrompt, contentNotesPrompt, NOTE_TYPES } from '../services/prompts/notesPrompts';

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
  const [showSubjectPicker, setShowSubjectPicker] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  const handlePickFile = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (res.canceled || !res.assets || res.assets.length === 0) {
        return;
      }

      setSelectedFile(res.assets[0]);
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to pick file: ' + e.message);
    }
  };

  const handleGenerate = async () => {
    let input = '';
    let fileOption = null;

    if (source === 'topic') {
      input = topicInput.trim();
      if (!input) {
        Alert.alert('Missing Input', 'Enter a topic name.');
        return;
      }
    } else if (source === 'paste') {
      input = pasteInput.trim();
      if (!input) {
        Alert.alert('Missing Input', 'Paste some content.');
        return;
      }
    } else {
      // upload
      if (!selectedFile) {
        Alert.alert('Missing Input', 'Please choose a file to upload.');
        return;
      }
      input = selectedFile.name;
    }

    setGenerating(true);
    try {
      let prompt = '';
      if (source === 'topic') {
        prompt = topicNotesPrompt(input, noteType);
      } else if (source === 'paste') {
        prompt = contentNotesPrompt(input, noteType);
      } else {
        // Read file contents
        if (selectedFile.mimeType?.includes('text') || selectedFile.name?.endsWith('.txt')) {
          const text = await FileSystem.readAsStringAsync(selectedFile.uri);
          prompt = contentNotesPrompt(text, noteType);
        } else {
          // Image or PDF
          const base64Data = await FileSystem.readAsStringAsync(selectedFile.uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          prompt = contentNotesPrompt(`Analyze and extract highly detailed study notes from the attached document/file. Create detailed notes based on this content. Note Type request: ${noteType}`, noteType);
          fileOption = {
            mimeType: selectedFile.mimeType || (selectedFile.name?.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'),
            data: base64Data,
          };
        }
      }

      const result = await generateContent(prompt, {
        json: true,
        file: fileOption, // Pass base64 data to multimodal endpoint
      });

      if (!result.success) {
        Alert.alert('AI Error', result.error || 'Failed to generate notes.');
        return;
      }

      const aiData = result.data;
      const contentType = `ai_${noteType === NOTE_TYPES.flowchart ? 'flowchart' :
        noteType === NOTE_TYPES.summary ? 'summary' :
        noteType === NOTE_TYPES.detailed ? 'detailed' :
        noteType === NOTE_TYPES.bullets ? 'bullets' :
        noteType === NOTE_TYPES.formula ? 'formula' : 'visual'}`;

      const noteData = {
        title: aiData.title || `AI Notes: ${input.substring(0, 50)}`,
        content: aiData.sections?.map((s) => `## ${s.heading}\n${s.content || s.items?.map((item) => `${item.label}: ${item.value}`).join('\n') || ''}`).join('\n\n') || aiData.summary || '',
        contentType,
        subject: subject || '',
        topic: topic || (source === 'topic' ? input : ''),
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
        navigation.replace('NoteView', { noteId: saveResult.id });
      } else {
        Alert.alert('Save Error', saveResult.error);
      }
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setGenerating(false);
    }
  };

  const styles = getStyles(colors);

  return (
    <SafeAreaView style={styles.container}>
      <HexagonBackground />

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
              {selectedFile ? selectedFile.name : 'Choose PDF, Image, or Text file'}
            </Text>
            {selectedFile && (
              <Text style={[styles.uploadSubtext, { color: colors.textSecondary, marginTop: 4 }]}>
                {Math.round((selectedFile.size || 0) / 1024)} KB · {selectedFile.mimeType || 'unknown'}
              </Text>
            )}
          </TouchableOpacity>
        )}

        {/* Note Type */}
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
          <Text style={styles.generateText}>Generate Notes</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      <AILoadingOverlay visible={generating} message="Generating your notes..." />
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
