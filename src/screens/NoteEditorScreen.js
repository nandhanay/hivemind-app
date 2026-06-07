import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { useTheme } from "../theme/ThemeContext";
import { useUser } from "../context/UserContext";
import HexagonBackground from "../components/HexagonBackground";
import TagChip from "../components/TagChip";
import SubjectPicker from "../components/SubjectPicker";
import AILoadingOverlay from "../components/AILoadingOverlay";
import {
  addNote,
  getNote,
  updateNote,
} from "../firebase/services/notesService";
import { getUniqueSubjectNames } from "../firebase/services/workspaceService";
import { generateContent } from "../services/aiService";
import PDFExtractorWebView from "../components/PDFTextExtractor";
import {
  extractTextFromFile,
  uploadFileToStorage,
} from "../services/documentProcessor";

const DOCUMENT_MIME_TYPES = [
  "application/pdf",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export default function NoteEditorScreen({ navigation, route }) {
  const { colors, Typography } = useTheme();
  const { userId, showMessage } = useUser();
  const noteId = route.params?.noteId;
  const isEditing = Boolean(noteId);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState("");
  const [isPinned, setIsPinned] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showSubjectPicker, setShowSubjectPicker] = useState(false);
  const [subjects, setSubjects] = useState([]);
  const [analyzingImage, setAnalyzingImage] = useState(false);

  // Document states
  const [pdfUrl, setPdfUrl] = useState("");
  const [pdfName, setPdfName] = useState("");
  const [contentType, setContentType] = useState("manual");
  const [sourceType, setSourceType] = useState("manual");
  const [loadingMessage, setLoadingMessage] = useState("Processing...");

  // Ref for the always-mounted PDF extractor WebView
  const pdfExtractorRef = useRef(null);

  useEffect(() => {
    if (isEditing) {
      (async () => {
        const note = await getNote(userId, noteId);
        if (note) {
          setTitle(note.title || "");
          setContent(note.content || "");
          setSubject(note.subject || "");
          setTopic(note.topic || "");
          setTags(note.tags || []);
          setIsPinned(note.isPinned || false);
          setPdfUrl(note.pdfUrl || "");
          setPdfName(note.pdfName || "");
          setContentType(note.contentType || "manual");
          setSourceType(note.sourceType || "manual");
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
    setTagInput("");
  };

  const handleSave = async () => {
    if (!title.trim() && !content.trim()) {
      Alert.alert("Empty Note", "Please add a title or content.");
      return;
    }
    setSaving(true);
    try {
      const noteData = {
        title: title.trim() || "Untitled Note",
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
        showMessage("Note updated");
      } else {
        await addNote(userId, noteData);
        showMessage("Note created");
      }
      navigation.goBack();
    } catch (e) {
      Alert.alert("Error", e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleScanImage = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: "image/*",
        copyToCacheDirectory: true,
      });

      if (res.canceled || !res.assets || res.assets.length === 0) {
        return;
      }

      const asset = res.assets[0];
      setAnalyzingImage(true);
      setLoadingMessage("Analyzing study image...");

      const base64Data = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const prompt = `Analyze this study image (which could contain handwritten notes, a textbook page, diagrams, or slides). Extract all readable text, outline key concepts, summarize diagrams, and format the output beautifully in Markdown. Do not include markdown code fences (like \`\`\`markdown) around the output. Make sure the output is structured and ready to study.`;

      const result = await generateContent(prompt, {
        json: false,
        file: {
          mimeType: asset.mimeType || "image/jpeg",
          data: base64Data,
        },
        timeout: 60000,
      });

      if (result.success && result.text) {
        setContent((prev) =>
          prev ? `${prev}\n\n${result.text}` : result.text,
        );
        showMessage("Image analyzed & notes appended!");
      } else {
        Alert.alert(
          "Analysis Failed",
          result.error || "Could not analyze image.",
        );
      }
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Failed to scan image: " + e.message);
    } finally {
      setAnalyzingImage(false);
    }
  };

  // ─── Document Upload — NEW PIPELINE ───────────────────

  const handlePickDocFile = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: DOCUMENT_MIME_TYPES,
        copyToCacheDirectory: true,
      });

      if (res.canceled || !res.assets || res.assets.length === 0) {
        return;
      }

      const file = res.assets[0];
      console.log(
        "[DOC_PIPELINE] Editor: File picked:",
        JSON.stringify({
          uri: file.uri,
          name: file.name,
          mimeType: file.mimeType,
          size: file.size,
        }),
      );

      setAnalyzingImage(true);
      setLoadingMessage("Extracting document text...");

      try {
        // Extract text using the new pipeline
        const result = await extractTextFromFile(file, pdfExtractorRef, (msg) =>
          setLoadingMessage(msg),
        );

        if (!result.text || result.text.trim().length === 0) {
          Alert.alert(
            "Extraction Failed",
            "No readable text found in the document.",
          );
          setAnalyzingImage(false);
          return;
        }

        console.log(
          "[DOC_PIPELINE] Editor: Extraction success. Chars:",
          result.metadata.charCount,
        );

        // Upload to storage
        setLoadingMessage("Uploading document...");
        const downloadURL = await uploadFileToStorage(userId, file);
        console.log("[DOC_PIPELINE] Editor: Upload success. URL:", downloadURL);

        // Update editor state
        setPdfUrl(downloadURL);
        setPdfName(file.name);
        const nameLower = file.name.toLowerCase();
        const ft = nameLower.endsWith(".pdf")
          ? "pdf"
          : nameLower.endsWith(".pptx")
            ? "pptx"
            : nameLower.endsWith(".ppt")
              ? "ppt"
              : nameLower.endsWith(".docx")
                ? "docx"
                : "doc";
        setContentType(ft);
        setSourceType("upload");

        setContent((prev) =>
          prev ? `${prev}\n\n${result.text}` : result.text,
        );
        if (!title.trim()) {
          setTitle(file.name.replace(/\.[^/.]+$/, ""));
        }

        showMessage("Document text extracted & uploaded!");
      } catch (extractErr) {
        console.error("[DOC_PIPELINE] Editor: Processing failed:", extractErr);
        Alert.alert("Processing Error", extractErr.message);
      } finally {
        setAnalyzingImage(false);
      }
    } catch (e) {
      console.error(e);
      setAnalyzingImage(false);
      Alert.alert("Error", "Failed to pick document: " + e.message);
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

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
          >
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[Typography.h3, { color: colors.text }]}>
            {isEditing ? "Edit Note" : "New Note"}
          </Text>
          <TouchableOpacity onPress={handleSave} disabled={saving}>
            <Text
              style={[
                styles.saveText,
                { color: saving ? colors.textTertiary : colors.primary },
              ]}
            >
              {saving ? "Saving..." : "Save"}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={{ flex: 1 }}
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
            style={[
              styles.metaRow,
              {
                borderColor: colors.glassBorder,
                backgroundColor: colors.shimmer,
              },
            ]}
          >
            <Ionicons
              name="folder-outline"
              size={18}
              color={colors.textSecondary}
            />
            <Text
              style={[
                styles.metaText,
                { color: subject ? colors.text : colors.textTertiary },
              ]}
            >
              {subject
                ? `${subject}${topic ? ` / ${topic}` : ""}`
                : "Select subject & topic"}
            </Text>
            <Ionicons
              name="chevron-forward"
              size={16}
              color={colors.textTertiary}
            />
          </TouchableOpacity>

          {/* Pin Toggle */}
          <TouchableOpacity
            onPress={() => setIsPinned(!isPinned)}
            style={[
              styles.metaRow,
              {
                borderColor: colors.glassBorder,
                backgroundColor: colors.shimmer,
              },
            ]}
          >
            <Ionicons
              name={isPinned ? "pin" : "pin-outline"}
              size={18}
              color={isPinned ? colors.primary : colors.textSecondary}
            />
            <Text
              style={[
                styles.metaText,
                { color: isPinned ? colors.primary : colors.textSecondary },
              ]}
            >
              {isPinned ? "Pinned" : "Pin this note"}
            </Text>
          </TouchableOpacity>

          {/* Scan Image with AI */}
          <TouchableOpacity
            onPress={handleScanImage}
            style={[
              styles.metaRow,
              {
                borderColor: `${colors.primary}55`,
                backgroundColor: `${colors.primary}1A`,
              },
            ]}
          >
            <Ionicons name="image-outline" size={18} color={colors.primary} />
            <Text
              style={[
                styles.metaText,
                { color: colors.primary, fontWeight: "700" },
              ]}
            >
              Scan Image with AI (Extract Text/Notes)
            </Text>
            <Ionicons name="sparkles" size={16} color={colors.primary} />
          </TouchableOpacity>

          {/* Upload Document (Extract Text) */}
          <TouchableOpacity
            onPress={handlePickDocFile}
            style={[
              styles.metaRow,
              {
                borderColor: `${colors.primary}55`,
                backgroundColor: `${colors.primary}1A`,
              },
            ]}
          >
            <Ionicons
              name="document-attach-outline"
              size={18}
              color={colors.primary}
            />
            <Text
              style={[
                styles.metaText,
                { color: colors.primary, fontWeight: "700" },
              ]}
            >
              Upload PDF/PPTX/DOCX (Extract Text)
            </Text>
            <Ionicons name="sparkles" size={16} color={colors.primary} />
          </TouchableOpacity>

          {/* Tags */}
          <View style={styles.tagsSection}>
            <View style={styles.tagsRow}>
              {tags.map((t) => (
                <TagChip
                  key={t}
                  label={t}
                  onRemove={() => setTags(tags.filter((x) => x !== t))}
                />
              ))}
            </View>
            <View
              style={[styles.tagInputRow, { borderColor: colors.glassBorder }]}
            >
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
        onSelect={({ subject: s, topic: t }) => {
          setSubject(s);
          setTopic(t);
        }}
        subjects={subjects}
        initialSubject={subject}
        initialTopic={topic}
      />
      <AILoadingOverlay visible={analyzingImage} message={loadingMessage} />
    </SafeAreaView>
  );
}

const getStyles = (colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingVertical: 14,
    },
    backBtn: { padding: 4 },
    saveText: { fontSize: 16, fontWeight: "700" },
    scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
    titleInput: {
      fontSize: 26,
      marginBottom: 16,
      paddingVertical: 8,
      fontFamily: "Handwritten-Bold",
    },
    metaRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      borderRadius: 12,
      borderWidth: 1,
      paddingHorizontal: 14,
      paddingVertical: 12,
      marginBottom: 10,
    },
    metaText: { flex: 1, fontSize: 14 },
    tagsSection: { marginBottom: 16 },
    tagsRow: { flexDirection: "row", flexWrap: "wrap", marginBottom: 8 },
    tagInputRow: {
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    tagInput: { flex: 1, fontSize: 14, paddingVertical: 0 },
    contentInput: {
      minHeight: 320,
      fontSize: 20,
      lineHeight: 28,
      borderWidth: 1,
      borderRadius: 14,
      padding: 20,
      backgroundColor: "#FFFDE7",
      fontFamily: "Handwritten",
      color: "#263238",
    },
  });
