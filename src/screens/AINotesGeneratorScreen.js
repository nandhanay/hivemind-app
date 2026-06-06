import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { useTheme } from '../theme/ThemeContext';
import { useUser } from '../context/UserContext';
import HexagonBackground from '../components/HexagonBackground';
import GlassCard from '../components/GlassCard';
import SubjectPicker from '../components/SubjectPicker';
import AILoadingOverlay from '../components/AILoadingOverlay';
import { addNote, updateNote } from '../firebase/services/notesService';
import { addFlashcards } from '../firebase/services/flashcardService';
import { createQuiz } from '../firebase/services/quizService';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db, storage } from '../firebase/config';
import { generateContent } from '../services/aiService';
import { topicNotesPrompt, contentNotesPrompt, NOTE_TYPES } from '../services/prompts/notesPrompts';
import PDFTextExtractor from '../components/PDFTextExtractor';

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
  const [loadingMessage, setLoadingMessage] = useState('Generating your notes...');
  const [showSubjectPicker, setShowSubjectPicker] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  // Hidden extractor state
  const [pdfBase64, setPdfBase64] = useState('');
  const [fileType, setFileType] = useState('');

  // Selected file ref to bypass stale React closures
  const selectedFileRef = useRef(null);

  const handlePickFile = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (res.canceled || !res.assets || res.assets.length === 0) {
        return;
      }

      const file = res.assets[0];
      setSelectedFile(file);
      selectedFileRef.current = file;
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
      // File upload checks
      if (!selectedFile) {
        Alert.alert('Missing Input', 'Please choose a file to upload.');
        return;
      }
      if (selectedFile.size && selectedFile.size > 15 * 1024 * 1024) {
        Alert.alert('File Too Large', 'Please upload a file smaller than 15MB.');
        return;
      }
      input = selectedFile.name;
    }

    setGenerating(true);
    setLoadingMessage('Generating your notes...');

    try {
      // Caching check for standard inputs
      let cachedNoteId = null;
      const targetContentType = `ai_${noteType === NOTE_TYPES.flowchart ? 'flowchart' :
        noteType === NOTE_TYPES.summary ? 'summary' :
        noteType === NOTE_TYPES.detailed ? 'detailed' :
        noteType === NOTE_TYPES.bullets ? 'bullets' :
        noteType === NOTE_TYPES.formula ? 'formula' : 'visual'}`;

      try {
        const notesRef = collection(db, 'users', userId, 'notes');
        let q = null;

        if (source === 'topic' && topicInput.trim()) {
          q = query(
            notesRef,
            where('topic', '==', topicInput.trim()),
            where('contentType', '==', targetContentType)
          );
        } else if (source === 'paste' && topic) {
          q = query(
            notesRef,
            where('topic', '==', topic),
            where('contentType', '==', targetContentType)
          );
        } else if (source === 'upload' && selectedFile) {
          const fileExt = selectedFile.name?.toLowerCase().split('.').pop();
          if (['pdf', 'docx', 'pptx', 'doc', 'ppt'].includes(fileExt)) {
            q = query(
              notesRef,
              where('title', '==', selectedFile.name),
              where('contentType', '==', fileExt)
            );
          }
        }

        if (q) {
          const snap = await getDocs(q);
          if (!snap.empty) {
            cachedNoteId = snap.docs[0].id;
          }
        }
      } catch (cacheErr) {
        console.warn('Notes cache check failed:', cacheErr);
      }

      if (cachedNoteId) {
        console.log("[DOC_PROCESSING] Document already parsed. Loading cached record:", cachedNoteId);
        showMessage('Loaded cached document notes from Firebase!');
        setGenerating(false);
        navigation.replace('NoteView', { noteId: cachedNoteId });
        return;
      }

      // Route based on source
      if (source === 'topic') {
        const prompt = topicNotesPrompt(input, noteType);
        const result = await generateContent(prompt, { json: true });
        await handleAIResultSave(result, input);
      } else if (source === 'paste') {
        const prompt = contentNotesPrompt(input, noteType);
        const result = await generateContent(prompt, { json: true });
        await handleAIResultSave(result, input);
      } else {
        // Document File Upload
        const file = selectedFileRef.current || selectedFile;
        if (!file) {
          Alert.alert('Error', 'No file selected.');
          setGenerating(false);
          return;
        }

        // 1. Log the complete file object returned by the picker
        console.log("[DOC_PROCESSING] Picker returned file object:", JSON.stringify(file, null, 2));

        // 2. Verify whether uri, name, mimeType, size, base64 exists
        const uriExists = typeof file.uri !== 'undefined' && file.uri !== null;
        const nameExists = typeof file.name !== 'undefined' && file.name !== null;
        const mimeTypeExists = typeof file.mimeType !== 'undefined' && file.mimeType !== null;
        const sizeExists = typeof file.size !== 'undefined' && file.size !== null;
        const base64Exists = typeof file.base64 !== 'undefined' && file.base64 !== null;

        console.log("[DOC_PROCESSING] Picker response fields verification:");
        console.log(`- uri exists: ${uriExists} (Value: ${file.uri})`);
        console.log(`- name exists: ${nameExists} (Value: ${file.name})`);
        console.log(`- mimeType exists: ${mimeTypeExists} (Value: ${file.mimeType})`);
        console.log(`- size exists: ${sizeExists} (Value: ${file.size})`);
        console.log(`- base64 exists: ${base64Exists} (Value: ${file.base64 ? 'defined' : 'undefined'})`);

        // 3. Convert contents into base64 manually if undefined
        let base64Data = "";
        if (base64Exists && file.base64) {
          console.log("[DOC_PROCESSING] Using base64 field from file picker object.");
          base64Data = file.base64;
        } else {
          console.log("[DOC_PROCESSING] base64 is undefined or empty. Manually reading file as base64 from URI...");
          base64Data = await FileSystem.readAsStringAsync(file.uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
        }

        // 7. Verify that uploaded documents are actually converted to base64 before sending them to any extraction component
        if (!base64Data) {
          throw new Error("Base64 conversion failed: result is empty.");
        }
        console.log("[DOC_PROCESSING] Verification: Successfully converted file to base64. Data length:", base64Data.length);

        // 6. Before processing, log: filename, MIME type, file size, URI, base64 length
        console.log("[DOC_PROCESSING] Document details before processing:");
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

        const isTextFile = mimeTypeLower.includes('text') ||
                           mimeTypeLower.includes('plain') ||
                           fileNameLower.endsWith('.txt') ||
                           fileNameLower.endsWith('.md') ||
                           fileNameLower.endsWith('.csv');

        const isImage = mimeTypeLower.includes('image') ||
                        ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif'].some(ext => fileNameLower.endsWith(ext));

        const isDocumentFile = isPDF || isPPTX || isPPT || isDOCX || isDOC;

        if (isDocumentFile) {
          const extractorFileType = isPDF ? 'pdf' : (isPPTX || isPPT) ? 'pptx' : 'docx';
          const actualFileType = isPDF ? 'pdf' : isPPTX ? 'pptx' : isPPT ? 'ppt' : isDOCX ? 'docx' : 'doc';
          
          setFileType(actualFileType);
          setLoadingMessage('Extracting Text...');

          // Trigger extraction in PDFTextExtractor WebView with verified manual base64Data
          setPdfBase64(base64Data);

        } else if (isTextFile) {
          const text = await FileSystem.readAsStringAsync(file.uri);
          const prompt = contentNotesPrompt(text, noteType);
          const result = await generateContent(prompt, { json: true });
          await handleAIResultSave(result, file.name);
        } else if (isImage) {
          const prompt = contentNotesPrompt(`Analyze and extract highly detailed study notes from the attached image. Note Type request: ${noteType}`, noteType);
          
          let targetMimeType = 'image/jpeg';
          if (fileNameLower.endsWith('.png')) targetMimeType = 'image/png';
          else if (fileNameLower.endsWith('.webp')) targetMimeType = 'image/webp';

          fileOption = {
            mimeType: targetMimeType,
            data: base64Data,
          };
          const result = await generateContent(prompt, { json: true, file: fileOption, timeout: 60000 });
          await handleAIResultSave(result, file.name);
        } else {
          Alert.alert(
            'Unsupported Format',
            'Only PDF, PPTX, PPT, DOCX, DOC, images, and text files (.txt, .md, .csv) are supported.'
          );
          setGenerating(false);
        }
      }
    } catch (e) {
      console.error("[DOC_PROCESSING] Generation error:", e);
      Alert.alert('Error', e.message);
      setGenerating(false);
    }
  };

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

  // SUCCESS HANDLER FOR EMBEDDED EXTRACTION SANDBOX
  const handleExtractionSuccess = async (extractedText, metadata) => {
    console.log("[DOC_PROCESSING] Text extraction completed successfully.");
    console.log("[DOC_PROCESSING] Extracted character count:", metadata.charCount);
    console.log("[DOC_PROCESSING] Number of pages/slides:", metadata.pageCount);
    console.log("[DOC_PROCESSING] Number of images processed (OCR):", metadata.imagesProcessed);

    const file = selectedFileRef.current || selectedFile;
    if (!file) {
      setGenerating(false);
      setPdfBase64('');
      Alert.alert('Upload Error', 'Picked file reference is missing.');
      return;
    }

    if (!extractedText.trim()) {
      setGenerating(false);
      setPdfBase64('');
      Alert.alert('Extraction Failed', 'No readable text was extracted from this document.');
      return;
    }

    try {
      console.log("[DOC_PROCESSING] Starting upload to Firebase Storage...");
      setLoadingMessage('Uploading...');

      // Safe fetch directly from local URI stashed in ref
      const response = await fetch(file.uri);
      const blob = await response.blob();
      
      const storageRef = ref(storage, `users/${userId}/library/${Date.now()}_${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, blob);

      uploadTask.on('state_changed', 
        (snapshot) => {
          const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          console.log(`[DOC_PROCESSING] Storage upload progress: ${progress}%`);
          setLoadingMessage(`Uploading (${progress}%)...`);
        }, 
        (error) => {
          console.error("[DOC_PROCESSING] Firebase Storage upload failed:", error);
          setGenerating(false);
          setPdfBase64('');
          Alert.alert('Upload Failed', 'Failed to upload document file: ' + error.message);
        }, 
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          console.log("[DOC_PROCESSING] Firebase Storage upload completed. URL:", downloadURL);

          // Save original file note & metadata
          console.log("[DOC_PROCESSING] Saving file metadata in Firestore...");
          const noteData = {
            title: file.name,
            content: extractedText,
            contentType: fileType, // 'pdf' | 'docx' | 'pptx' | 'doc' | 'ppt'
            subject: subject || '',
            topic: topic || file.name.replace(/\.[^/.]+$/, "").substring(0, 50),
            sourceType: 'upload',
            createdByAI: true,
            pdfUrl: downloadURL,
            pdfName: file.name,
            hasAIContent: false,
          };

          const saveResult = await addNote(userId, noteData);
          if (!saveResult.success) {
            console.error("[DOC_PROCESSING] Firestore note save failed:", saveResult.error);
            setGenerating(false);
            setPdfBase64('');
            Alert.alert('Database Error', 'Failed to save metadata to Firestore: ' + saveResult.error);
            return;
          }

          const noteId = saveResult.id;
          console.log("[DOC_PROCESSING] Firestore note created with ID:", noteId);

          // Run AI Pipeline to generate all tabs content
          await runAIPipeline(noteId, extractedText, noteData);
        }
      );
    } catch (e) {
      console.error("[DOC_PROCESSING] Document pipeline failure:", e);
      setGenerating(false);
      setPdfBase64('');
      Alert.alert('Upload Error', e.message);
    }
  };

  const runAIPipeline = async (noteId, textContent, noteData) => {
    const trimmedText = textContent.substring(0, 60000);

    try {
      // Step 1: Generate Notes
      console.log("[DOC_PROCESSING] Sequential pipeline step 1: Generating detailed Study Notes...");
      setLoadingMessage('Generating Notes...');

      const notesPrompt = `You are an expert study assistant. Read the following content and generate structured, detailed study notes with clear sections (headings and explanations) and key takeaways.
      
Content:
"""
${trimmedText}
"""

Return JSON in this exact format:
{
  "sections": [
    { "heading": "<heading>", "content": "<markdown formatting description or list>" }
  ],
  "keyTakeaways": ["<main concept 1>", "<main concept 2>"]
}

Respond ONLY with valid JSON. No explanations outside JSON.`;

      const notesResult = await generateContent(notesPrompt, { json: true });
      if (!notesResult.success) throw new Error("Notes generation failed: " + notesResult.error);
      const aiNotes = {
        sections: notesResult.data?.sections || [],
        keyTakeaways: notesResult.data?.keyTakeaways || []
      };
      console.log("[DOC_PROCESSING] AI Study notes generated successfully. Sections count: " + aiNotes.sections.length);

      // Step 2: Generate Summary & Revision material
      console.log("[DOC_PROCESSING] Sequential pipeline step 2: Generating Summary & Revision materials...");
      const summaryPrompt = `You are an expert study assistant. Read the following content and generate:
1. A concise executive summary (1-2 paragraphs).
2. 3-5 core key points.
3. 3-5 challenging study questions to test comprehension.
4. 2-3 mnemonics/memory aids to recall key formulas/definitions.
5. 3-5 quick recall facts.

Content:
"""
${trimmedText}
"""

Return JSON in this exact format:
{
  "summary": "<summary paragraph>",
  "keyPoints": ["<point 1>", "<point 2>"],
  "studyQuestions": ["<question 1>", "<question 2>"],
  "mnemonics": ["<mnemonic 1>", "<mnemonic 2>"],
  "quickFacts": ["<fact 1>", "<fact 2>"]
}

Respond ONLY with valid JSON.`;

      const summaryResult = await generateContent(summaryPrompt, { json: true });
      if (!summaryResult.success) throw new Error("Summary & Revision generation failed: " + summaryResult.error);
      
      const aiSummary = {
        summary: summaryResult.data?.summary || '',
        keyPoints: summaryResult.data?.keyPoints || []
      };
      const aiRevision = {
        studyQuestions: summaryResult.data?.studyQuestions || [],
        mnemonics: summaryResult.data?.mnemonics || [],
        quickFacts: summaryResult.data?.quickFacts || []
      };
      console.log("[DOC_PROCESSING] Summary and revision items generated successfully.");

      // Step 3: Generate Flashcards
      console.log("[DOC_PROCESSING] Sequential pipeline step 3: Generating Flashcards...");
      setLoadingMessage('Generating Flashcards...');

      const flashcardsPrompt = `You are an expert study assistant. Read the following content and generate exactly 8 interactive active recall flashcards (question and short answer).
      
Content:
"""
${trimmedText}
"""

Return JSON in this exact format:
{
  "flashcards": [
    { "question": "<question>", "answer": "<answer>" }
  ]
}

Respond ONLY with valid JSON.`;

      const flashcardsResult = await generateContent(flashcardsPrompt, { json: true });
      if (!flashcardsResult.success) throw new Error("Flashcards generation failed: " + flashcardsResult.error);
      const aiFlashcards = flashcardsResult.data?.flashcards || [];
      console.log("[DOC_PROCESSING] Flashcards generated successfully. Saving to active collection. Count: " + aiFlashcards.length);

      const cardsToSave = aiFlashcards.map(c => ({
        question: c.question,
        answer: c.answer,
        type: 'recall',
        difficulty: 'medium',
        subject: noteData.subject,
        topic: noteData.topic,
        createdByAI: true,
        noteId: noteId
      }));
      await addFlashcards(userId, cardsToSave);

      // Step 4: Generate Quiz
      console.log("[DOC_PROCESSING] Sequential pipeline step 4: Generating Quiz Questions...");
      setLoadingMessage('Generating Quiz...');

      const quizPrompt = `You are an expert quiz maker. Read the following content and generate exactly 5 multiple-choice quiz questions (each question must have 4 options and correctIndex pointing to correct answer 0-3).
      
Content:
"""
${trimmedText}
"""

Return JSON in this exact format:
{
  "title": "Quiz: ${noteData.topic}",
  "questions": [
    {
      "question": "<question text>",
      "options": ["<option 0>", "<option 1>", "<option 2>", "<option 3>"],
      "correctIndex": 0,
      "explanation": "<brief explanation of correct answer>"
    }
  ]
}

Respond ONLY with valid JSON.`;

      const quizResult = await generateContent(quizPrompt, { json: true });
      if (!quizResult.success) throw new Error("Quiz generation failed: " + quizResult.error);
      const aiQuiz = quizResult.data?.questions || [];
      console.log("[DOC_PROCESSING] Quiz questions generated successfully. Count: " + aiQuiz.length);

      const quizToSave = {
        title: quizResult.data?.title || `Quiz: ${noteData.topic}`,
        quizType: 'mcq',
        subject: noteData.subject,
        topic: noteData.topic,
        sourceType: 'notes',
        sourceId: noteId,
        questions: aiQuiz.map(q => ({
          question: q.question,
          options: q.options,
          correctIndex: q.correctIndex,
          explanation: q.explanation || '',
          difficulty: 'medium',
          type: 'mcq'
        }))
      };
      const quizSaveRes = await createQuiz(userId, quizToSave);
      const quizId = quizSaveRes.success ? quizSaveRes.id : '';
      console.log("[DOC_PROCESSING] Active Quiz created in user collection. Quiz ID:", quizId);

      // Step 5: Save AI outputs to main document note
      console.log("[DOC_PROCESSING] Sequential pipeline step 5: Saving study suite inside document note...");
      setLoadingMessage('Complete');

      const updateResult = await updateNote(userId, noteId, {
        aiNotes,
        aiSummary,
        aiFlashcards,
        aiQuiz,
        aiRevision,
        quizId,
        hasAIContent: true
      });

      if (updateResult.success) {
        console.log("[DOC_PROCESSING] Document intelligence pipeline completed successfully!");
        showMessage('Document Processed & Study Suite Generated!');
        setGenerating(false);
        setPdfBase64('');
        navigation.replace('NoteView', { noteId });
      } else {
        throw new Error("Failed to update note details: " + updateResult.error);
      }

    } catch (err) {
      console.error("[DOC_PROCESSING] AI generation pipeline failed:", err);
      setGenerating(false);
      setPdfBase64('');
      Alert.alert('Pipeline Error', 'Document processed but AI study generation failed: ' + err.message);
    }
  };

  const styles = getStyles(colors);

  return (
    <SafeAreaView style={styles.container}>
      <HexagonBackground />

      {/* Hidden WebView Extractor */}
      <PDFTextExtractor
        base64Data={pdfBase64}
        fileType={fileType === 'pdf' ? 'pdf' : ['pptx', 'ppt'].includes(fileType) ? 'pptx' : 'docx'}
        onProgress={(percent, page, total) => {
          setLoadingMessage(`Extracting Text (${percent}%)...`);
        }}
        onSuccess={handleExtractionSuccess}
        onError={(err) => {
          console.error("[DOC_PROCESSING] PDFTextExtractor sandbox reported error:", err);
          setGenerating(false);
          setPdfBase64('');
          Alert.alert('Extraction Error', 'Failed to extract document contents: ' + err);
        }}
        onLog={(msg) => {
          console.log("[DOC_PROCESSING WebView LOG]", msg);
        }}
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

        {/* Note Type */}
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
