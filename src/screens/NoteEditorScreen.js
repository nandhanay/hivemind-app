import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { useTheme } from '../theme/ThemeContext';
import { useUser } from '../context/UserContext';
import HexagonBackground from '../components/HexagonBackground';
import TagChip from '../components/TagChip';
import SubjectPicker from '../components/SubjectPicker';
import AILoadingOverlay from '../components/AILoadingOverlay';
import { addNote, getNote, updateNote } from '../firebase/services/notesService';
import { getUniqueSubjectNames } from '../firebase/services/workspaceService';
import { generateContent } from '../services/aiService';
import { storage } from '../firebase/config';
import PDFTextExtractor from '../components/PDFTextExtractor';

export default function NoteEditorScreen({ navigation, route }) {
  const { colors, Typography } = useTheme();
  const { userId, showMessage } = useUser();
  const noteId = route.params?.noteId;
  const isEditing = Boolean(noteId);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showSubjectPicker, setShowSubjectPicker] = useState(false);
  const [subjects, setSubjects] = useState([]);
  const [analyzingImage, setAnalyzingImage] = useState(false);

  // Document states
  const [pdfUrl, setPdfUrl] = useState('');
  const [pdfName, setPdfName] = useState('');
  const [contentType, setContentType] = useState('manual');
  const [sourceType, setSourceType] = useState('manual');

  // Extraction states
  const [pdfBase64, setPdfBase64] = useState('');
  const [fileType, setFileType] = useState('');
  const [loadingMessage, setLoadingMessage] = useState('Extracting document text...');

  useEffect(() => {
    if (isEditing) {
      (async () => {
        const note = await getNote(userId, noteId);
        if (note) {
          setTitle(note.title || '');
          setContent(note.content || '');
          setSubject(note.subject || '');
          setTopic(note.topic || '');
          setTags(note.tags || []);
          setIsPinned(note.isPinned || false);
          setPdfUrl(note.pdfUrl || '');
          setPdfName(note.pdfName || '');
          setContentType(note.contentType || 'manual');
          setSourceType(note.sourceType || 'manual');
        }
      })();
    }
    getUniqueSubjectNames(userId).then(setSubjects);
  }, [userId, noteId, isEditing]);

  const handleAddTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) {
      setTags([...tags, t]);
    }
    setTagInput('');
  };

  const handleSave = async () => {
    if (!title.trim() && !content.trim()) {
      Alert.alert('Empty Note', 'Please add a title or content.');
      return;
    }
    setSaving(true);
    try {
      const noteData = {
        title: title.trim() || 'Untitled Note',
        content,
        subject,
        topic,
        tags,
        isPinned,
        contentType,
        sourceType,
        pdfUrl,
        pdfName,
      };

      if (isEditing) {
        await updateNote(userId, noteId, noteData);
        showMessage('Note updated');
      } else {
        await addNote(userId, noteData);
        showMessage('Note created');
      }
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleScanImage = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: 'image/*',
        copyToCacheDirectory: true,
      });

      if (res.canceled || !res.assets || res.assets.length === 0) {
        return;
      }

      const asset = res.assets[0];

      // 1. Log the complete file object returned by the picker
      console.log("[DOC_EDITOR_IMAGE_PROCESSING] Picker returned file object:", JSON.stringify(asset, null, 2));

      // 2. Verify whether uri, name, mimeType, size, base64 exists
      const uriExists = typeof asset.uri !== 'undefined' && asset.uri !== null;
      const nameExists = typeof asset.name !== 'undefined' && asset.name !== null;
      const mimeTypeExists = typeof asset.mimeType !== 'undefined' && asset.mimeType !== null;
      const sizeExists = typeof asset.size !== 'undefined' && asset.size !== null;
      const base64Exists = typeof asset.base64 !== 'undefined' && asset.base64 !== null;

      console.log("[DOC_EDITOR_IMAGE_PROCESSING] Picker response fields verification:");
      console.log(`- uri exists: ${uriExists} (Value: ${asset.uri})`);
      console.log(`- name exists: ${nameExists} (Value: ${asset.name})`);
      console.log(`- mimeType exists: ${mimeTypeExists} (Value: ${asset.mimeType})`);
      console.log(`- size exists: ${sizeExists} (Value: ${asset.size})`);
      console.log(`- base64 exists: ${base64Exists} (Value: ${asset.base64 ? 'defined' : 'undefined'})`);

      // 3. Convert contents into base64 manually if undefined
      let base64Data = "";
      if (base64Exists && asset.base64) {
        console.log("[DOC_EDITOR_IMAGE_PROCESSING] Using base64 field from file picker object.");
        base64Data = asset.base64;
      } else {
        console.log("[DOC_EDITOR_IMAGE_PROCESSING] base64 is undefined or empty. Manually reading file as base64 from URI...");
        base64Data = await FileSystem.readAsStringAsync(asset.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
      }

      // 7. Verify that uploaded documents are actually converted to base64 before sending them to any extraction component
      if (!base64Data) {
        throw new Error("Base64 conversion failed: result is empty.");
      }
      console.log("[DOC_EDITOR_IMAGE_PROCESSING] Verification: Successfully converted image to base64. Data length:", base64Data.length);

      // 6. Before processing, log: filename, MIME type, file size, URI, base64 length
      console.log("[DOC_EDITOR_IMAGE_PROCESSING] Image details before processing:");
      console.log(`- filename: ${asset.name}`);
      console.log(`- MIME type: ${asset.mimeType}`);
      console.log(`- file size: ${asset.size}`);
      console.log(`- URI: ${asset.uri}`);
      console.log(`- base64 length: ${base64Data.length}`);

      setAnalyzingImage(true);
      setLoadingMessage('Analyzing study image...');

      const prompt = `Analyze this study image (which could contain handwritten notes, a textbook page, diagrams, or slides). Extract all readable text, outline key concepts, summarize diagrams, and format the output beautifully in Markdown. Do not include markdown code fences (like \`\`\`markdown) around the output. Make sure the output is structured and ready to study.`;

      const result = await generateContent(prompt, {
        json: false,
        file: {
          mimeType: asset.mimeType || 'image/jpeg',
          data: base64Data,
        },
        timeout: 60000,
      });

      if (result.success && result.text) {
        setContent((prev) => prev ? `${prev}\n\n${result.text}` : result.text);
        showMessage('Image analyzed & notes appended!');
      } else {
        Alert.alert('Analysis Failed', result.error || 'Could not analyze image.');
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to scan image: ' + e.message);
    } finally {
      setAnalyzingImage(false);
    }
  };

  // Pick Document (PDF, PPT, PPTX, DOC, DOCX) and perform extraction
  const handlePickDocFile = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (res.canceled || !res.assets || res.assets.length === 0) {
        return;
      }

      const file = res.assets[0];

      // 1. Log the complete file object returned by the picker
      console.log("[DOC_EDITOR_PROCESSING] Picker returned file object:", JSON.stringify(file, null, 2));

      // 2. Verify whether uri, name, mimeType, size, base64 exists
      const uriExists = typeof file.uri !== 'undefined' && file.uri !== null;
      const nameExists = typeof file.name !== 'undefined' && file.name !== null;
      const mimeTypeExists = typeof file.mimeType !== 'undefined' && file.mimeType !== null;
      const sizeExists = typeof file.size !== 'undefined' && file.size !== null;
      const base64Exists = typeof file.base64 !== 'undefined' && file.base64 !== null;

      console.log("[DOC_EDITOR_PROCESSING] Picker response fields verification:");
      console.log(`- uri exists: ${uriExists} (Value: ${file.uri})`);
      console.log(`- name exists: ${nameExists} (Value: ${file.name})`);
      console.log(`- mimeType exists: ${mimeTypeExists} (Value: ${file.mimeType})`);
      console.log(`- size exists: ${sizeExists} (Value: ${file.size})`);
      console.log(`- base64 exists: ${base64Exists} (Value: ${file.base64 ? 'defined' : 'undefined'})`);

      // 3. Convert contents into base64 manually if undefined
      let base64Data = "";
      if (base64Exists && file.base64) {
        console.log("[DOC_EDITOR_PROCESSING] Using base64 field from file picker object.");
        base64Data = file.base64;
      } else {
        console.log("[DOC_EDITOR_PROCESSING] base64 is undefined or empty. Manually reading file as base64 from URI...");
        base64Data = await FileSystem.readAsStringAsync(file.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
      }

      // 7. Verify that uploaded documents are actually converted to base64 before sending them to any extraction component
      if (!base64Data) {
        throw new Error("Base64 conversion failed: result is empty.");
      }
      console.log("[DOC_EDITOR_PROCESSING] Verification: Successfully converted file to base64. Data length:", base64Data.length);

      // 6. Before processing, log: filename, MIME type, file size, URI, base64 length
      console.log("[DOC_EDITOR_PROCESSING] Document details before processing:");
      console.log(`- filename: ${file.name}`);
      console.log(`- MIME type: ${file.mimeType}`);
      console.log(`- file size: ${file.size}`);
      console.log(`- URI: ${file.uri}`);
      console.log(`- base64 length: ${base64Data.length}`);

      const fileNameLower = file.name?.toLowerCase() || '';
      const mimeTypeLower = file.mimeType?.toLowerCase() || '';

      const isPDF = fileNameLower.endsWith('.pdf') || mimeTypeLower === 'application/pdf';
      const isPPTX = fileNameLower.endsWith('.pptx') || mimeTypeLower === 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
      const isPPT = fileNameLower.endsWith('.ppt') || mimeTypeLower === 'application/vnd.ms-powerpoint';
      const isDOCX = fileNameLower.endsWith('.docx') || mimeTypeLower === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      const isDOC = fileNameLower.endsWith('.doc') || mimeTypeLower === 'application/msword';

      if (!isPDF && !isPPTX && !isPPT && !isDOCX && !isDOC) {
        Alert.alert('Unsupported format', 'Please pick a PDF, PPTX, PPT, DOCX, or DOC document.');
        return;
      }

      setAnalyzingImage(true);
      setLoadingMessage('Extracting document text...');

      const type = isPDF ? 'pdf' : isPPTX ? 'pptx' : isPPT ? 'ppt' : isDOCX ? 'docx' : 'doc';
      setFileType(type);
      setPdfName(file.name);
      setPdfBase64(base64Data);

    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to pick document: ' + e.message);
    }
  };

  const handleExtractionSuccess = async (extractedText, metadata) => {
    console.log("[DOC_EDITOR_PROCESSING] Document text extracted successfully.");
    console.log("[DOC_EDITOR_PROCESSING] Character count:", metadata.charCount);
    console.log("[DOC_EDITOR_PROCESSING] Pages/slides count:", metadata.pageCount);
    console.log("[DOC_EDITOR_PROCESSING] Images processed:", metadata.imagesProcessed);

    if (!extractedText.trim()) {
      setAnalyzingImage(false);
      setPdfBase64('');
      Alert.alert('Extraction Failed', 'No readable text was extracted from this document.');
      return;
    }

    try {
      console.log("[DOC_EDITOR_PROCESSING] Uploading document file to storage...");
      setLoadingMessage('Uploading document...');

      // Find file asset by comparing name
      const pickerRes = await FileSystem.readAsStringAsync(FileSystem.cacheDirectory + pdfName, {
        encoding: FileSystem.EncodingType.Base64,
      }).catch(() => null); // Fallback: read directly using cached assets is complex in Expo. We convert the base64 back to Blob.
      
      const response = await fetch(`data:application/octet-stream;base64,${pdfBase64}`);
      const blob = await response.blob();

      const storageRef = ref(storage, `users/${userId}/library/${Date.now()}_${pdfName}`);
      const uploadTask = uploadBytesResumable(storageRef, blob);

      uploadTask.on('state_changed',
        (snapshot) => {
          const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          setLoadingMessage(`Uploading (${progress}%)...`);
        },
        (error) => {
          console.error("Storage upload failed:", error);
          setAnalyzingImage(false);
          setPdfBase64('');
          Alert.alert('Upload Failed', 'Failed to upload document file: ' + error.message);
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          console.log("[DOC_EDITOR_PROCESSING] Document uploaded. URL:", downloadURL);

          setPdfUrl(downloadURL);
          setContentType(fileType);
          setSourceType('upload');
          
          setContent((prev) => prev ? `${prev}\n\n${extractedText}` : extractedText);
          if (!title.trim()) {
            setTitle(pdfName.replace(/\.[^/.]+$/, ""));
          }

          setAnalyzingImage(false);
          setPdfBase64('');
          showMessage('Document text extracted & uploaded!');
        }
      );
    } catch (e) {
      console.error(e);
      setAnalyzingImage(false);
      setPdfBase64('');
      Alert.alert('Error', 'Failed to complete document processing: ' + e.message);
    }
  };

  const styles = getStyles(colors);

  return (
    <SafeAreaView style={styles.container}>
      <HexagonBackground />

      <PDFTextExtractor
        base64Data={pdfBase64}
        fileType={fileType === 'pdf' ? 'pdf' : ['pptx', 'ppt'].includes(fileType) ? 'pptx' : 'docx'}
        onProgress={(percent, page, total) => {
          setLoadingMessage(`Extracting Text (${percent}%)...`);
        }}
        onSuccess={handleExtractionSuccess}
        onError={(err) => {
          setAnalyzingImage(false);
          setPdfBase64('');
          Alert.alert('Extraction Error', 'Failed to extract document content: ' + err);
        }}
        onLog={(msg) => {
          console.log("[DOC_EDITOR_PROCESSING WebView LOG]", msg);
        }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[Typography.h3, { color: colors.text }]}>
            {isEditing ? 'Edit Note' : 'New Note'}
          </Text>
          <TouchableOpacity onPress={handleSave} disabled={saving}>
            <Text style={[styles.saveText, { color: saving ? colors.textTertiary : colors.primary }]}>
              {saving ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Title */}
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Note title..."
            placeholderTextColor={colors.textTertiary}
            style={[styles.titleInput, { color: colors.text }]}
          />

          {/* Subject/Topic Row */}
          <TouchableOpacity
            onPress={() => setShowSubjectPicker(true)}
            style={[styles.metaRow, { borderColor: colors.glassBorder, backgroundColor: colors.shimmer }]}
          >
            <Ionicons name="folder-outline" size={18} color={colors.textSecondary} />
            <Text style={[styles.metaText, { color: subject ? colors.text : colors.textTertiary }]}>
              {subject ? `${subject}${topic ? ` / ${topic}` : ''}` : 'Select subject & topic'}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
          </TouchableOpacity>

          {/* Pin Toggle */}
          <TouchableOpacity
            onPress={() => setIsPinned(!isPinned)}
            style={[styles.metaRow, { borderColor: colors.glassBorder, backgroundColor: colors.shimmer }]}
          >
            <Ionicons name={isPinned ? 'pin' : 'pin-outline'} size={18} color={isPinned ? colors.primary : colors.textSecondary} />
            <Text style={[styles.metaText, { color: isPinned ? colors.primary : colors.textSecondary }]}>
              {isPinned ? 'Pinned' : 'Pin this note'}
            </Text>
          </TouchableOpacity>

          {/* Scan Image with AI */}
          <TouchableOpacity
            onPress={handleScanImage}
            style={[styles.metaRow, { borderColor: `${colors.primary}55`, backgroundColor: `${colors.primary}1A` }]}
          >
            <Ionicons name="image-outline" size={18} color={colors.primary} />
            <Text style={[styles.metaText, { color: colors.primary, fontWeight: '700' }]}>
              Scan Image with AI (Extract Text/Notes)
            </Text>
            <Ionicons name="sparkles" size={16} color={colors.primary} />
          </TouchableOpacity>

          {/* Upload Document (Extract Text) */}
          <TouchableOpacity
            onPress={handlePickDocFile}
            style={[styles.metaRow, { borderColor: `${colors.primary}55`, backgroundColor: `${colors.primary}1A` }]}
          >
            <Ionicons name="document-attach-outline" size={18} color={colors.primary} />
            <Text style={[styles.metaText, { color: colors.primary, fontWeight: '700' }]}>
              Upload PDF/PPTX/DOCX (Extract Text)
            </Text>
            <Ionicons name="sparkles" size={16} color={colors.primary} />
          </TouchableOpacity>

          {/* Tags */}
          <View style={styles.tagsSection}>
            <View style={styles.tagsRow}>
              {tags.map((t) => (
                <TagChip key={t} label={t} onRemove={() => setTags(tags.filter((x) => x !== t))} />
              ))}
            </View>
            <View style={[styles.tagInputRow, { borderColor: colors.glassBorder }]}>
              <TextInput
                value={tagInput}
                onChangeText={setTagInput}
                placeholder="Add tag..."
                placeholderTextColor={colors.textTertiary}
                style={[styles.tagInput, { color: colors.text }]}
                onSubmitEditing={handleAddTag}
                returnKeyType="done"
              />
              <TouchableOpacity onPress={handleAddTag}>
                <Ionicons name="add-circle" size={22} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Content */}
          <TextInput
            value={content}
            onChangeText={setContent}
            placeholder="Start writing your notes..."
            placeholderTextColor={colors.textTertiary}
            style={styles.contentInput}
            multiline
            textAlignVertical="top"
          />
        </ScrollView>
      </KeyboardAvoidingView>

      <SubjectPicker
        visible={showSubjectPicker}
        onClose={() => setShowSubjectPicker(false)}
        onSelect={({ subject: s, topic: t }) => { setSubject(s); setTopic(t); }}
        subjects={subjects}
        initialSubject={subject}
        initialTopic={topic}
      />
      <AILoadingOverlay visible={analyzingImage} message={loadingMessage} />
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
  saveText: { fontSize: 16, fontWeight: '700' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  titleInput: {
    fontSize: 26,
    marginBottom: 16,
    paddingVertical: 8,
    fontFamily: 'Handwritten-Bold',
  },
  metaRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12,
    marginBottom: 10,
  },
  metaText: { flex: 1, fontSize: 14 },
  tagsSection: { marginBottom: 16 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 },
  tagInputRow: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1,
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8,
  },
  tagInput: { flex: 1, fontSize: 14, paddingVertical: 0 },
  contentInput: {
    minHeight: 320, fontSize: 20, lineHeight: 28, borderWidth: 1,
    borderRadius: 14, padding: 20, backgroundColor: '#FFFDE7',
    fontFamily: 'Handwritten', color: '#263238',
  },
});
