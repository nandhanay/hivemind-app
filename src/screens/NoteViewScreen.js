import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useUser } from '../context/UserContext';
import HexagonBackground from '../components/HexagonBackground';
import GlassCard from '../components/GlassCard';
import TagChip from '../components/TagChip';
import MermaidViewer from '../components/MermaidViewer';
import { getNote, deleteNote } from '../firebase/services/notesService';
import { NOTE_TYPE_LABELS } from '../constants/studyDefaults';

export default function NoteViewScreen({ navigation, route }) {
  const { colors, Typography } = useTheme();
  const { userId, showMessage } = useUser();
  const { noteId } = route.params;

  const [note, setNote] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const data = await getNote(userId, noteId);
      setNote(data);
      setLoading(false);
    })();
  }, [userId, noteId]);

  const handleShare = async () => {
    try {
      let shareContent = `HiveMind Study Note: ${note.title}\n`;
      if (note.subject) shareContent += `Subject: ${note.subject}\n`;
      if (note.topic) shareContent += `Topic: ${note.topic}\n`;
      shareContent += `\n`;

      if (note.keyTakeaways?.length > 0) {
        shareContent += `💡 Key Takeaways:\n`;
        note.keyTakeaways.forEach((t) => {
          shareContent += `• ${t}\n`;
        });
        shareContent += `\n`;
      }

      if (note.sections?.length > 0) {
        note.sections.forEach((sec) => {
          shareContent += `## ${sec.heading}\n`;
          const secText = sec.content || sec.items?.map((item) => `${item.label}: ${item.value}`).join('\n') || '';
          shareContent += `${secText}\n\n`;
        });
      } else if (note.content) {
        shareContent += `${note.content}\n`;
      }

      if (note.mermaidCode) {
        shareContent += `📊 Flowchart Source Code (Mermaid):\n\`\`\`mermaid\n${note.mermaidCode}\n\`\`\`\n`;
      }

      await Share.share({
        message: shareContent,
        title: note.title,
      });
    } catch (error) {
      Alert.alert('Share Error', error.message);
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete Note', 'This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          await deleteNote(userId, noteId);
          showMessage('Note deleted');
          navigation.goBack();
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  if (!note) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[Typography.body, { color: colors.textSecondary, textAlign: 'center', marginTop: 40 }]}>
          Note not found
        </Text>
      </SafeAreaView>
    );
  }

  const typeInfo = NOTE_TYPE_LABELS[note.contentType] || NOTE_TYPE_LABELS.manual;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <HexagonBackground />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleShare} style={styles.actionBtn}>
            <Ionicons name="share-social-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate('NoteEditor', { noteId: note.id })}
            style={styles.actionBtn}
          >
            <Ionicons name="create-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete} style={styles.actionBtn}>
            <Ionicons name="trash-outline" size={20} color={colors.danger} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Title & Meta */}
        <Text style={[styles.title, { color: colors.text }]}>{note.title}</Text>

        <View style={styles.metaRow}>
          {note.subject ? (
            <TagChip label={note.subject} color={colors.blueAccent} />
          ) : null}
          {note.topic ? (
            <TagChip label={note.topic} color={colors.purpleAccent} />
          ) : null}
          <TagChip label={typeInfo.label} color={colors.textSecondary} />
        </View>

        {note.tags?.length > 0 && (
          <View style={styles.tagsRow}>
            {note.tags.map((t) => <TagChip key={t} label={t} />)}
          </View>
        )}

        {/* Flowchart */}
        {note.mermaidCode ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Flowchart</Text>
            <MermaidViewer code={note.mermaidCode} height={350} />
          </View>
        ) : null}

        {/* Structured Sections (AI notes) */}
        {note.sections?.length > 0 ? (
          note.sections.map((sec, i) => (
            <GlassCard key={i} style={[styles.sectionCard, { borderColor: colors.glassBorder }]}>
              <Text style={[styles.sectionHeading, { color: colors.primary }]}>{sec.heading}</Text>
              <Text style={[styles.sectionContent, { color: colors.text }]}>
                {sec.content || sec.items?.map((item) => `${item.label}: ${item.value}`).join('\n\n') || ''}
              </Text>
            </GlassCard>
          ))
        ) : null}

        {/* Plain content (manual notes) */}
        {note.content && !note.sections?.length ? (
          <View style={styles.section}>
            <Text style={[styles.contentText, { color: colors.text }]}>{note.content}</Text>
          </View>
        ) : null}

        {/* Key Takeaways */}
        {note.keyTakeaways?.length > 0 && (
          <GlassCard style={[styles.takeawaysCard, { borderColor: `${colors.primary}33` }]}>
            <Text style={[styles.sectionTitle, { color: colors.primary, marginBottom: 8 }]}>
              💡 Key Takeaways
            </Text>
            {note.keyTakeaways.map((t, i) => (
              <View key={i} style={styles.takeawayRow}>
                <Text style={[styles.takeawayBullet, { color: colors.primary }]}>•</Text>
                <Text style={[styles.takeawayText, { color: colors.text }]}>{t}</Text>
              </View>
            ))}
          </GlassCard>
        )}

        {/* Quick Actions */}
        <View style={styles.actionsSection}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Quick Actions</Text>
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: colors.shimmer, borderColor: colors.glassBorder }]}
              onPress={() => navigation.navigate('AIFlashcard', { content: note.content || note.sections?.map((s) => s.content).join('\n') || '', subject: note.subject, topic: note.topic })}
            >
              <Ionicons name="layers-outline" size={22} color={colors.blueAccent} />
              <Text style={[styles.actionLabel, { color: colors.text }]}>Make Flashcards</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: colors.shimmer, borderColor: colors.glassBorder }]}
              onPress={() => navigation.navigate('QuizSetup', { content: note.content || note.sections?.map((s) => s.content).join('\n') || '', subject: note.subject, topic: note.topic, sourceType: 'notes' })}
            >
              <Ionicons name="help-circle-outline" size={22} color={colors.purpleAccent} />
              <Text style={[styles.actionLabel, { color: colors.text }]}>Generate Quiz</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
  },
  backBtn: { padding: 4 },
  headerActions: { flexDirection: 'row', gap: 12 },
  actionBtn: { padding: 4 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  title: { fontSize: 32, fontFamily: 'Handwritten-Bold', marginBottom: 12 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 14, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
  sectionCard: { marginBottom: 12, borderWidth: 1 },
  sectionHeading: { fontSize: 22, fontFamily: 'Handwritten-Bold', marginBottom: 8 },
  sectionContent: { fontSize: 18, lineHeight: 26, fontFamily: 'Handwritten' },
  contentText: { fontSize: 20, lineHeight: 28, fontFamily: 'Handwritten' },
  takeawaysCard: { marginBottom: 20, borderWidth: 1 },
  takeawayRow: { flexDirection: 'row', marginBottom: 6 },
  takeawayBullet: { fontSize: 16, marginRight: 8, marginTop: 1 },
  takeawayText: { fontSize: 14, lineHeight: 21, flex: 1 },
  actionsSection: { marginTop: 8 },
  actionsRow: { flexDirection: 'row', gap: 12 },
  actionCard: {
    flex: 1, borderRadius: 14, borderWidth: 1, padding: 16,
    alignItems: 'center', gap: 8,
  },
  actionLabel: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
});
