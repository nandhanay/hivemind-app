import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Alert,
  ActivityIndicator, Modal, TextInput, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useUser } from '../context/UserContext';
import HexagonBackground from '../components/HexagonBackground';
import GlassCard from '../components/GlassCard';
import FAB from '../components/FAB';
import {
  getWorkspaces, createWorkspace, updateWorkspace, deleteWorkspace,
  getSubjectsByWorkspace, createSubject, updateSubject, deleteSubject,
} from '../firebase/services/workspaceService';
import { getNotes } from '../firebase/services/notesService';
import { getFlashcards } from '../firebase/services/flashcardService';
import { getQuizzes } from '../firebase/services/quizService';

const COLORS_PALETTE = [
  '#FBC02D', // Hive Gold
  '#FF5722', // Deep Orange
  '#2196F3', // Ocean Blue
  '#4CAF50', // Emerald Green
  '#9C27B0', // Purple Accent
  '#E91E63', // Rose Red
  '#00BCD4', // Cyan Accent
];

const ICONS_PALETTE = [
  'folder-open-outline',
  'book-outline',
  'code-slash-outline',
  'flask-outline',
  'calculator-outline',
  'color-palette-outline',
  'globe-outline',
];

export default function WorkspaceScreen({ navigation }) {
  const { colors, Typography } = useTheme();
  const { userId, showMessage } = useUser();

  const [workspaces, setWorkspaces] = useState([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // Content counts for subjects
  const [notes, setNotes] = useState([]);
  const [cards, setCards] = useState([]);
  const [quizzes, setQuizzes] = useState([]);

  // Modals state
  const [workspaceModalVisible, setWorkspaceModalVisible] = useState(false);
  const [subjectModalVisible, setSubjectModalVisible] = useState(false);
  const [subjectActionVisible, setSubjectActionVisible] = useState(false);

  // Form states
  const [workspaceName, setWorkspaceName] = useState('');
  const [workspaceColor, setWorkspaceColor] = useState(COLORS_PALETTE[0]);
  const [workspaceIcon, setWorkspaceIcon] = useState(ICONS_PALETTE[0]);
  const [editingWorkspace, setEditingWorkspace] = useState(null);

  const [subjectName, setSubjectName] = useState('');
  const [subjectColor, setSubjectColor] = useState(COLORS_PALETTE[2]);
  const [editingSubject, setEditingSubject] = useState(null);
  const [selectedSubjectForActions, setSelectedSubjectForActions] = useState(null);

  // Fetch workspaces (Subjects in UI)
  const loadWorkspaces = useCallback(async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const data = await getWorkspaces(userId);
      setWorkspaces(data);

      // Pre-fetch items to compute counts
      const [allNotes, allCards, allQuizzes] = await Promise.all([
        getNotes(userId),
        getFlashcards(userId),
        getQuizzes(userId),
      ]);
      setNotes(allNotes);
      setCards(allCards);
      setQuizzes(allQuizzes);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Fetch subjects (Topics in UI) for a workspace
  const loadSubjects = useCallback(async (workspaceId) => {
    if (!userId || !workspaceId) return;
    try {
      setLoading(true);
      const data = await getSubjectsByWorkspace(userId, workspaceId);
      setSubjects(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadWorkspaces();
  }, [loadWorkspaces]);

  // Load subjects when a workspace is selected
  useEffect(() => {
    if (selectedWorkspace) {
      loadSubjects(selectedWorkspace.id);
    } else {
      setSubjects([]);
    }
  }, [selectedWorkspace, loadSubjects]);

  const handleSaveWorkspace = async () => {
    if (!workspaceName.trim()) {
      Alert.alert('Empty Name', 'Please enter a name for the subject.');
      return;
    }
    try {
      if (editingWorkspace) {
        await updateWorkspace(userId, editingWorkspace.id, {
          name: workspaceName.trim(),
          color: workspaceColor,
          icon: workspaceIcon,
        });
        showMessage('Subject updated');
      } else {
        await createWorkspace(userId, {
          name: workspaceName.trim(),
          color: workspaceColor,
          icon: workspaceIcon,
        });
        showMessage('Subject created');
      }
      setWorkspaceModalVisible(false);
      setWorkspaceName('');
      setWorkspaceColor(COLORS_PALETTE[0]);
      setWorkspaceIcon(ICONS_PALETTE[0]);
      setEditingWorkspace(null);
      loadWorkspaces();
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  const handleDeleteWorkspace = (ws) => {
    Alert.alert('Delete Subject', `Are you sure you want to delete "${ws.name}"? All topics inside will remain, but the subject folder will be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          await deleteWorkspace(userId, ws.id);
          showMessage('Subject deleted');
          loadWorkspaces();
        },
      },
    ]);
  };

  const handleSaveSubject = async () => {
    if (!subjectName.trim()) {
      Alert.alert('Empty Name', 'Please enter a name for the topic.');
      return;
    }
    try {
      if (editingSubject) {
        await updateSubject(userId, editingSubject.id, {
          name: subjectName.trim(),
          color: subjectColor,
        });
        showMessage('Topic updated');
      } else {
        await createSubject(userId, {
          name: subjectName.trim(),
          workspaceId: selectedWorkspace.id,
          color: subjectColor,
        });
        showMessage('Topic created');
      }
      setSubjectModalVisible(false);
      setSubjectName('');
      setSubjectColor(COLORS_PALETTE[2]);
      setEditingSubject(null);
      loadSubjects(selectedWorkspace.id);
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  const handleDeleteSubject = (sub) => {
    Alert.alert('Delete Topic', `Are you sure you want to delete the topic "${sub.name}"? Notes and cards matching this topic name will not be deleted.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          await deleteSubject(userId, sub.id);
          showMessage('Topic deleted');
          loadSubjects(selectedWorkspace.id);
        },
      },
    ]);
  };

  const openWorkspaceEdit = (ws) => {
    setEditingWorkspace(ws);
    setWorkspaceName(ws.name);
    setWorkspaceColor(ws.color || COLORS_PALETTE[0]);
    setWorkspaceIcon(ws.icon || ICONS_PALETTE[0]);
    setWorkspaceModalVisible(true);
  };

  const openSubjectEdit = (sub) => {
    setEditingSubject(sub);
    setSubjectName(sub.name);
    setSubjectColor(sub.color || COLORS_PALETTE[2]);
    setSubjectModalVisible(true);
  };

  const getSubjectCounts = (subjectName) => {
    const subNameLower = subjectName?.toLowerCase();
    const noteCount = notes.filter((n) => n.subject?.toLowerCase() === subNameLower).length;
    const cardCount = cards.filter((c) => c.subject?.toLowerCase() === subNameLower).length;
    const quizCount = quizzes.filter((q) => q.subject?.toLowerCase() === subNameLower).length;
    return { notes: noteCount, cards: cardCount, quizzes: quizCount };
  };

  const styles = getStyles(colors, Typography);

  return (
    <SafeAreaView style={styles.container}>
      <HexagonBackground />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            if (selectedWorkspace) {
              setSelectedWorkspace(null);
            } else {
              navigation.goBack();
            }
          }}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[Typography.h2, { color: colors.text, flex: 1, marginLeft: 10 }]} numberOfLines={1}>
          {selectedWorkspace ? selectedWorkspace.name : 'Subjects'}
        </Text>
        {selectedWorkspace && (
          <TouchableOpacity
            onPress={() => {
              setSubjectName('');
              setEditingSubject(null);
              setSubjectModalVisible(true);
            }}
            style={[styles.aiBtn, { backgroundColor: `${colors.primary}1A`, marginRight: 8 }]}
          >
            <Ionicons name="add" size={20} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Main List */}
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ flex: 1 }} />
      ) : !selectedWorkspace ? (
        /* Workspace List (Subjects) */
        <FlatList
          data={workspaces}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setSelectedWorkspace(item)}
              onLongPress={() => {
                Alert.alert(item.name, 'Choose an action', [
                  { text: 'Edit Subject', onPress: () => openWorkspaceEdit(item) },
                  { text: 'Delete Subject', style: 'destructive', onPress: () => handleDeleteWorkspace(item) },
                  { text: 'Cancel', style: 'cancel' },
                ]);
              }}
              style={styles.workspaceCardWrap}
            >
              <GlassCard style={[styles.workspaceCard, { borderLeftColor: item.color || colors.primary, borderLeftWidth: 5 }]}>
                <View style={styles.cardHeader}>
                  <View style={[styles.iconBox, { backgroundColor: `${item.color || colors.primary}1A` }]}>
                    <Ionicons name={item.icon || 'folder-open-outline'} size={24} color={item.color || colors.primary} />
                  </View>
                  <View style={styles.workspaceText}>
                    <Text style={[Typography.h3, { color: colors.text }]}>{item.name}</Text>
                    <Text style={[Typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
                      Created {new Date(item.createdAt?.toMillis?.() || Date.now()).toLocaleDateString()}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                </View>
              </GlassCard>
            </TouchableOpacity>
          )}
        />
      ) : (
        /* Subject List (Topics in UI) */
        <FlatList
          data={subjects}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="folder-open-outline" size={48} color={colors.textTertiary} />
              <Text style={[Typography.body, { color: colors.textSecondary, textAlign: 'center', marginTop: 12 }]}>
                No topics in this subject yet.
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setSubjectName('');
                  setEditingSubject(null);
                  setSubjectModalVisible(true);
                }}
                style={[styles.addBtn, { backgroundColor: colors.primary }]}
              >
                <Text style={styles.addBtnText}>Add Topic</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => {
            const counts = getSubjectCounts(item.name);
            return (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => {
                  setSelectedSubjectForActions(item);
                  setSubjectActionVisible(true);
                }}
                onLongPress={() => {
                  Alert.alert(item.name, 'Choose an action', [
                    { text: 'Edit Topic', onPress: () => openSubjectEdit(item) },
                    { text: 'Delete Topic', style: 'destructive', onPress: () => handleDeleteSubject(item) },
                    { text: 'Cancel', style: 'cancel' },
                  ]);
                }}
                style={styles.subjectCardWrap}
              >
                <GlassCard style={styles.subjectCard}>
                  <View style={styles.subjectRow}>
                    <Ionicons name="folder" size={28} color={item.color || colors.primary} />
                    <View style={styles.subjectText}>
                      <Text style={[Typography.h3, { color: colors.text }]}>{item.name}</Text>
                      <Text style={[Typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
                        {counts.notes} notes · {counts.cards} flashcards · {counts.quizzes} quizzes
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                  </View>
                </GlassCard>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* FAB to add a Subject */}
      {!selectedWorkspace && !loading && (
        <FAB
          onPress={() => {
            setWorkspaceName('');
            setWorkspaceColor(COLORS_PALETTE[0]);
            setWorkspaceIcon(ICONS_PALETTE[0]);
            setEditingWorkspace(null);
            setWorkspaceModalVisible(true);
          }}
        />
      )}

      {/* Modal: Subject Form (Workspace in Firebase) */}
      <Modal visible={workspaceModalVisible} animationType="slide" transparent>
        <SafeAreaView style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface, borderColor: colors.glassBorder }]}>
            <View style={styles.modalHeader}>
              <Text style={[Typography.h3, { color: colors.text }]}>
                {editingWorkspace ? 'Edit Subject' : 'New Subject'}
              </Text>
              <TouchableOpacity onPress={() => setWorkspaceModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Subject Name</Text>
            <TextInput
              value={workspaceName}
              onChangeText={setWorkspaceName}
              placeholder="e.g. Mathematics, History, Physics"
              placeholderTextColor={colors.textTertiary}
              style={[styles.modalInput, { color: colors.text, borderColor: colors.glassBorder, backgroundColor: colors.shimmer }]}
            />

            <Text style={[styles.modalLabel, { color: colors.textSecondary, marginTop: 14 }]}>Subject Color</Text>
            <View style={styles.colorsRow}>
              {COLORS_PALETTE.map((c) => (
                <TouchableOpacity
                  key={c}
                  onPress={() => setWorkspaceColor(c)}
                  style={[
                    styles.colorSelector,
                    { backgroundColor: c, borderColor: workspaceColor === c ? colors.text : 'transparent' },
                  ]}
                />
              ))}
            </View>

            <Text style={[styles.modalLabel, { color: colors.textSecondary, marginTop: 14 }]}>Subject Icon</Text>
            <View style={styles.iconsRow}>
              {ICONS_PALETTE.map((ic) => (
                <TouchableOpacity
                  key={ic}
                  onPress={() => setWorkspaceIcon(ic)}
                  style={[
                    styles.iconSelector,
                    {
                      borderColor: workspaceIcon === ic ? colors.primary : colors.glassBorder,
                      backgroundColor: workspaceIcon === ic ? `${colors.primary}1A` : colors.shimmer,
                    },
                  ]}
                >
                  <Ionicons name={ic} size={20} color={workspaceIcon === ic ? colors.primary : colors.textSecondary} />
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              onPress={handleSaveWorkspace}
              style={[styles.saveBtn, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.saveBtnText}>Save Subject</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Modal: Topic Form (Subject in Firebase) */}
      <Modal visible={subjectModalVisible} animationType="slide" transparent>
        <SafeAreaView style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface, borderColor: colors.glassBorder }]}>
            <View style={styles.modalHeader}>
              <Text style={[Typography.h3, { color: colors.text }]}>
                {editingSubject ? 'Edit Topic' : 'New Topic'}
              </Text>
              <TouchableOpacity onPress={() => setSubjectModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Topic Name</Text>
            <TextInput
              value={subjectName}
              onChangeText={setSubjectName}
              placeholder="e.g. Calculus, Organic Chemistry"
              placeholderTextColor={colors.textTertiary}
              style={[styles.modalInput, { color: colors.text, borderColor: colors.glassBorder, backgroundColor: colors.shimmer }]}
            />

            <Text style={[styles.modalLabel, { color: colors.textSecondary, marginTop: 14 }]}>Topic Color</Text>
            <View style={styles.colorsRow}>
              {COLORS_PALETTE.map((c) => (
                <TouchableOpacity
                  key={c}
                  onPress={() => setSubjectColor(c)}
                  style={[
                    styles.colorSelector,
                    { backgroundColor: c, borderColor: subjectColor === c ? colors.text : 'transparent' },
                  ]}
                />
              ))}
            </View>

            <TouchableOpacity
              onPress={handleSaveSubject}
              style={[styles.saveBtn, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.saveBtnText}>Save Topic</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Modal: Topic Actions (Drill-down action picker) */}
      <Modal visible={subjectActionVisible} animationType="slide" transparent>
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setSubjectActionVisible(false)}
        >
          <View style={[styles.actionsModal, { backgroundColor: colors.surface, borderColor: colors.glassBorder }]}>
            <View style={styles.actionsHeader}>
              <View style={styles.actionsTitleRow}>
                <Ionicons name="folder-open" size={24} color={selectedSubjectForActions?.color || colors.primary} />
                <Text style={[Typography.h3, { color: colors.text, marginLeft: 10 }]} numberOfLines={1}>
                  {selectedSubjectForActions?.name}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSubjectActionVisible(false)}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.actionsGrid}>
              {[
                {
                  label: 'View Notes',
                  icon: 'document-text-outline',
                  color: colors.primary,
                  onPress: () => {
                    setSubjectActionVisible(false);
                    navigation.navigate('Notes', { subject: selectedSubjectForActions.name });
                  },
                },
                {
                  label: 'Study Flashcards',
                  icon: 'layers-outline',
                  color: colors.blueAccent,
                  onPress: () => {
                    setSubjectActionVisible(false);
                    navigation.navigate('Flashcards', { subject: selectedSubjectForActions.name });
                  },
                },
                {
                  label: 'Quiz History',
                  icon: 'help-circle-outline',
                  color: colors.purpleAccent,
                  onPress: () => {
                    setSubjectActionVisible(false);
                    navigation.navigate('Quiz', { subject: selectedSubjectForActions.name });
                  },
                },
              ].map((act) => (
                <TouchableOpacity
                  key={act.label}
                  onPress={act.onPress}
                  style={[styles.actionOption, { borderColor: colors.glassBorder, backgroundColor: colors.shimmer }]}
                >
                  <View style={[styles.actionIconCircle, { backgroundColor: `${act.color}14` }]}>
                    <Ionicons name={act.icon} size={24} color={act.color} />
                  </View>
                  <Text style={[Typography.body, { color: colors.text, fontWeight: '700' }]}>{act.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const getStyles = (colors, Typography) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
  },
  backBtn: { padding: 4 },
  aiBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: 20, paddingBottom: 100, paddingTop: 10 },
  workspaceCardWrap: { marginBottom: 12 },
  workspaceCard: { padding: 16, borderWidth: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  iconBox: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  workspaceText: { flex: 1, marginLeft: 12 },
  subjectCardWrap: { marginBottom: 12 },
  subjectCard: { padding: 16, borderWidth: 1 },
  subjectRow: { flexDirection: 'row', alignItems: 'center' },
  subjectText: { flex: 1, marginLeft: 12 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 80, paddingHorizontal: 40 },
  addBtn: { marginTop: 20, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  addBtnText: { color: '#000', fontWeight: 'bold', fontSize: 15 },
  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', paddingHorizontal: 20 },
  modalContent: { borderRadius: 20, borderWidth: 1, padding: 20, elevation: 5 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalLabel: { fontSize: 13, fontWeight: '700', marginBottom: 8 },
  modalInput: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, marginBottom: 10 },
  colorsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  colorSelector: { width: 36, height: 36, borderRadius: 18, borderWidth: 2 },
  iconsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  iconSelector: { width: 40, height: 40, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  saveBtn: { paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  saveBtnText: { color: '#000', fontWeight: 'bold', fontSize: 16 },
  // Backdrop
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  actionsModal: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, borderBottomWidth: 0, padding: 24 },
  actionsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  actionsTitleRow: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 16 },
  actionsGrid: { gap: 12, marginBottom: 20 },
  actionOption: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 16, padding: 16, gap: 16 },
  actionIconCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
