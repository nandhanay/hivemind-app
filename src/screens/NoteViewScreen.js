import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Share, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useUser } from '../context/UserContext';
import HexagonBackground from '../components/HexagonBackground';
import GlassCard from '../components/GlassCard';
import TagChip from '../components/TagChip';
import MermaidViewer from '../components/MermaidViewer';
import { getNote, deleteNote } from '../firebase/services/notesService';
import { NOTE_TYPE_LABELS } from '../constants/studyDefaults';
import { getNoteContentString } from '../utils/noteUtils';

export default function NoteViewScreen({ navigation, route }) {
  const { colors, Typography } = useTheme();
  const { userId, showMessage } = useUser();
  const { noteId } = route.params;

  const [note, setNote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('doc');
  const [flippedIndex, setFlippedIndex] = useState(-1);

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

  const isDocument = ['pdf', 'docx', 'pptx'].includes(note.contentType);
  const typeInfo = NOTE_TYPE_LABELS[note.contentType] || NOTE_TYPE_LABELS.manual;

  // Horizontal tabs list for document cards
  const tabs = [
    { key: 'doc', label: 'Document', icon: 'document-text-outline' },
    { key: 'notes', label: 'Notes', icon: 'book-outline' },
    { key: 'summary', label: 'Summary', icon: 'list-outline' },
    { key: 'cards', label: 'Flashcards', icon: 'layers-outline' },
    { key: 'quiz', label: 'Quiz', icon: 'help-circle-outline' },
    { key: 'revision', label: 'Revision', icon: 'refresh-outline' },
  ];

  const handleOpenDocUrl = () => {
    if (note.pdfUrl) {
      Linking.openURL(note.pdfUrl).catch((err) => {
        Alert.alert('Error', 'Could not open URL: ' + err.message);
      });
    } else {
      Alert.alert('No Link', 'Storage URL was not found for this document.');
    }
  };

  // Google Docs View Previewer
  const previewUrl = note.contentType === 'pdf'
    ? note.pdfUrl
    : `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(note.pdfUrl || '')}`;

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
        contentOffset={{ x: 0, y: 0 }}
      >
        {/* Title & Metadata Tags */}
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

        {/* ───────── DOCUMENT TAB VIEWER ───────── */}
        {isDocument ? (
          <View style={{ marginTop: 8 }}>
            {/* Tabs Selector Row */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tabsScrollContent}
              style={[styles.tabsContainer, { borderColor: colors.glassBorder }]}
            >
              {tabs.map((tab) => (
                <TouchableOpacity
                  key={tab.key}
                  onPress={() => setActiveTab(tab.key)}
                  style={[
                    styles.tabButton,
                    activeTab === tab.key && { borderBottomColor: colors.primary, borderBottomWidth: 2 }
                  ]}
                >
                  <Ionicons
                    name={tab.icon}
                    size={16}
                    color={activeTab === tab.key ? colors.primary : colors.textSecondary}
                  />
                  <Text style={[
                    styles.tabLabel,
                    { color: activeTab === tab.key ? colors.text : colors.textSecondary }
                  ]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Tab Views */}
            {activeTab === 'doc' && (
              <View style={styles.tabContent}>
                {note.pdfUrl ? (
                  <View style={{ gap: 12 }}>
                    <TouchableOpacity
                      onPress={handleOpenDocUrl}
                      style={[styles.pdfBanner, { backgroundColor: `${colors.primary}10`, borderColor: colors.primary }]}
                    >
                      <Ionicons name="document-text" size={32} color={colors.primary} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15 }}>Original Document File</Text>
                        <Text style={{ color: colors.textSecondary, fontSize: 12 }} numberOfLines={1}>
                          {note.pdfName || 'Open file attachment'}
                        </Text>
                      </View>
                      <Ionicons name="open-outline" size={20} color={colors.primary} />
                    </TouchableOpacity>

                    {/* Google Embedded Preview Iframe */}
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginTop: 8 }]}>Document Preview</Text>
                    <View style={[styles.webviewContainer, { borderColor: colors.glassBorder }]}>
                      <WebView
                        source={{ uri: previewUrl }}
                        style={styles.webview}
                        javaScriptEnabled={true}
                        domStorageEnabled={true}
                        scalesPageToFit={true}
                      />
                    </View>
                  </View>
                ) : (
                  <Text style={{ color: colors.textSecondary, textAlign: 'center', marginVertical: 20 }}>
                    No file storage URL saved.
                  </Text>
                )}
              </View>
            )}

            {activeTab === 'notes' && (
              <View style={styles.tabContent}>
                {note.aiNotes?.sections?.length > 0 ? (
                  <View>
                    {note.aiNotes.keyTakeaways?.length > 0 && (
                      <GlassCard style={[styles.takeawaysCard, { borderColor: `${colors.primary}33`, marginBottom: 16 }]}>
                        <Text style={[styles.sectionTitle, { color: colors.primary, marginBottom: 8 }]}>
                          💡 Key Takeaways
                        </Text>
                        {note.aiNotes.keyTakeaways.map((t, i) => (
                          <View key={i} style={styles.takeawayRow}>
                            <Text style={[styles.takeawayBullet, { color: colors.primary }]}>•</Text>
                            <Text style={[styles.takeawayText, { color: colors.text }]}>{t}</Text>
                          </View>
                        ))}
                      </GlassCard>
                    )}

                    {note.aiNotes.sections.map((sec, i) => (
                      <GlassCard key={i} style={[styles.sectionCard, { borderColor: colors.glassBorder }]}>
                        <Text style={[styles.sectionHeading, { color: colors.primary }]}>{sec.heading}</Text>
                        <Text style={[styles.sectionContent, { color: colors.text }]}>
                          {sec.content || sec.items?.map((item) => `${item.label}: ${item.value}`).join('\n\n') || ''}
                        </Text>
                      </GlassCard>
                    ))}
                  </View>
                ) : (
                  <View style={styles.emptyTab}>
                    <Ionicons name="sparkles-outline" size={36} color={colors.textTertiary} />
                    <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 10 }}>
                      No AI study notes generated yet.
                    </Text>
                  </View>
                )}
              </View>
            )}

            {activeTab === 'summary' && (
              <View style={styles.tabContent}>
                {note.aiSummary?.summary ? (
                  <View style={{ gap: 14 }}>
                    <GlassCard style={{ borderColor: colors.glassBorder, padding: 18 }}>
                      <Text style={[styles.sectionTitle, { color: colors.primary, marginBottom: 8 }]}>Executive Summary</Text>
                      <Text style={[styles.sectionContent, { color: colors.text, fontFamily: 'System' }]}>
                        {note.aiSummary.summary}
                      </Text>
                    </GlassCard>
                    {note.aiSummary.keyPoints?.length > 0 && (
                      <GlassCard style={{ borderColor: `${colors.primary}33`, padding: 18 }}>
                        <Text style={[styles.sectionTitle, { color: colors.primary, marginBottom: 8 }]}>Core Points</Text>
                        {note.aiSummary.keyPoints.map((pt, i) => (
                          <View key={i} style={styles.takeawayRow}>
                            <Text style={[styles.takeawayBullet, { color: colors.primary }]}>•</Text>
                            <Text style={[styles.takeawayText, { color: colors.text }]}>{pt}</Text>
                          </View>
                        ))}
                      </GlassCard>
                    )}
                  </View>
                ) : (
                  <View style={styles.emptyTab}>
                    <Ionicons name="document-text-outline" size={36} color={colors.textTertiary} />
                    <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 10 }}>
                      No summary generated yet.
                    </Text>
                  </View>
                )}
              </View>
            )}

            {activeTab === 'cards' && (
              <View style={styles.tabContent}>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginBottom: 12 }]}>
                  Interactive Flashcards (Tap to Flip)
                </Text>
                {note.aiFlashcards?.length > 0 ? (
                  <View style={{ gap: 12 }}>
                    {note.aiFlashcards.map((card, idx) => (
                      <TouchableOpacity
                        key={idx}
                        activeOpacity={0.9}
                        onPress={() => setFlippedIndex(flippedIndex === idx ? -1 : idx)}
                        style={[
                          styles.flashcardCard,
                          {
                            backgroundColor: colors.shimmer,
                            borderColor: flippedIndex === idx ? colors.primary : colors.glassBorder,
                            borderWidth: 1,
                          }
                        ]}
                      >
                        <Text style={[styles.flashcardHeader, { color: flippedIndex === idx ? colors.primary : colors.textTertiary }]}>
                          {flippedIndex === idx ? 'Answer' : 'Question'}
                        </Text>
                        <Text style={[styles.flashcardText, { color: colors.text }]}>
                          {flippedIndex === idx ? card.answer : card.question}
                        </Text>
                        <Text style={[styles.flashcardFlipHint, { color: colors.primary }]}>
                          TAP TO FLIP
                        </Text>
                      </TouchableOpacity>
                    ))}
                    <TouchableOpacity
                      onPress={() => navigation.navigate('Flashcards', { subject: note.subject })}
                      style={[styles.linkBtn, { backgroundColor: `${colors.primary}1A`, borderColor: colors.primary }]}
                    >
                      <Ionicons name="layers-outline" size={16} color={colors.primary} />
                      <Text style={{ color: colors.primary, fontWeight: '700' }}>Study In Flashcards Deck</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.emptyTab}>
                    <Ionicons name="layers-outline" size={36} color={colors.textTertiary} />
                    <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 10 }}>
                      No flashcards generated yet.
                    </Text>
                  </View>
                )}
              </View>
            )}

            {activeTab === 'quiz' && (
              <View style={styles.tabContent}>
                {note.aiQuiz?.length > 0 ? (
                  <GlassCard style={{ borderColor: colors.glassBorder, padding: 20, alignItems: 'center', gap: 14 }}>
                    <Ionicons name="checkbox-outline" size={48} color={colors.primary} />
                    <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>Study Practice Quiz</Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 14, textAlign: 'center' }}>
                      Comprehension test ready with exactly {note.aiQuiz.length} questions.
                    </Text>
                    <TouchableOpacity
                      style={[styles.quizBtn, { backgroundColor: colors.primary }]}
                      onPress={() => {
                        if (note.quizId) {
                          navigation.navigate('QuizTaking', { quizId: note.quizId });
                        } else {
                          Alert.alert('Quiz missing', 'No active quiz object linked to this document.');
                        }
                      }}
                    >
                      <Text style={{ color: '#000', fontWeight: '800', fontSize: 15 }}>Start Quiz</Text>
                    </TouchableOpacity>
                  </GlassCard>
                ) : (
                  <View style={styles.emptyTab}>
                    <Ionicons name="help-circle-outline" size={36} color={colors.textTertiary} />
                    <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 10 }}>
                      No quiz generated yet.
                    </Text>
                  </View>
                )}
              </View>
            )}

            {activeTab === 'revision' && (
              <View style={styles.tabContent}>
                {note.aiRevision ? (
                  <View style={{ gap: 14 }}>
                    {note.aiRevision.studyQuestions?.length > 0 && (
                      <GlassCard style={{ borderColor: colors.glassBorder, padding: 18 }}>
                        <Text style={[styles.sectionTitle, { color: colors.primary, marginBottom: 8 }]}>Study Questions</Text>
                        {note.aiRevision.studyQuestions.map((q, idx) => (
                          <View key={idx} style={{ flexDirection: 'row', marginBottom: 8, gap: 8, alignItems: 'flex-start' }}>
                            <Ionicons name="help-circle" size={16} color={colors.primary} style={{ marginTop: 2 }} />
                            <Text style={{ color: colors.text, fontSize: 14, flex: 1, lineHeight: 20 }}>{q}</Text>
                          </View>
                        ))}
                      </GlassCard>
                    )}

                    {note.aiRevision.mnemonics?.length > 0 && (
                      <GlassCard style={{ borderColor: colors.glassBorder, padding: 18 }}>
                        <Text style={[styles.sectionTitle, { color: colors.primary, marginBottom: 8 }]}>Mnemonics & Memory Aids</Text>
                        {note.aiRevision.mnemonics.map((m, idx) => (
                          <View key={idx} style={{ backgroundColor: `${colors.primary}0D`, padding: 12, borderRadius: 10, marginBottom: 8 }}>
                            <Text style={{ color: colors.text, fontSize: 14, lineHeight: 20 }}>{m}</Text>
                          </View>
                        ))}
                      </GlassCard>
                    )}

                    {note.aiRevision.quickFacts?.length > 0 && (
                      <GlassCard style={{ borderColor: colors.glassBorder, padding: 18 }}>
                        <Text style={[styles.sectionTitle, { color: colors.primary, marginBottom: 8 }]}>Quick Recall Facts</Text>
                        {note.aiRevision.quickFacts.map((f, idx) => (
                          <View key={idx} style={styles.takeawayRow}>
                            <Text style={[styles.takeawayBullet, { color: colors.primary }]}>•</Text>
                            <Text style={[styles.takeawayText, { color: colors.text }]}>{f}</Text>
                          </View>
                        ))}
                      </GlassCard>
                    )}
                  </View>
                ) : (
                  <View style={styles.emptyTab}>
                    <Ionicons name="refresh-outline" size={36} color={colors.textTertiary} />
                    <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 10 }}>
                      No revision guide generated yet.
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        ) : (
          // ───────── MANUAL NOTE VIEWER ─────────
          <View style={{ marginTop: 10 }}>
            {/* Flowchart */}
            {note.mermaidCode ? (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Flowchart</Text>
                <MermaidViewer code={note.mermaidCode} height={350} />
              </View>
            ) : null}

            {/* Structured Sections */}
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

            {/* Plain Text content */}
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
                  onPress={() => navigation.navigate('AIFlashcard', { content: getNoteContentString(note), subject: note.subject, topic: note.topic })}
                >
                  <Ionicons name="layers-outline" size={22} color={colors.blueAccent} />
                  <Text style={[styles.actionLabel, { color: colors.text }]}>Make Flashcards</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionCard, { backgroundColor: colors.shimmer, borderColor: colors.glassBorder }]}
                  onPress={() => navigation.navigate('QuizSetup', { content: getNoteContentString(note), subject: note.subject, topic: note.topic, sourceType: 'notes' })}
                >
                  <Ionicons name="help-circle-outline" size={22} color={colors.purpleAccent} />
                  <Text style={[styles.actionLabel, { color: colors.text }]}>Generate Quiz</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

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
  // Tab layout styles
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    marginBottom: 16,
  },
  tabsScrollContent: {
    paddingRight: 20,
    gap: 16,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  tabContent: {
    marginTop: 4,
  },
  pdfBanner: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  webviewContainer: {
    height: 420,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    marginTop: 6,
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  flashcardCard: {
    borderRadius: 14,
    padding: 24,
    minHeight: 140,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginBottom: 10,
  },
  flashcardHeader: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  flashcardText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 24,
  },
  flashcardFlipHint: {
    position: 'absolute',
    bottom: 12,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  linkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 6,
  },
  quizBtn: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  emptyTab: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
});
