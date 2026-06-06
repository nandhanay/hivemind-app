import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, TextInput,
  ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useUser } from '../context/UserContext';
import {
  getWorkspaces, createWorkspace,
  getSubjectsByWorkspace, createSubject
} from '../firebase/services/workspaceService';

export default function SubjectPicker({
  visible, onClose, onSelect,
  initialSubject = '', initialTopic = '',
}) {
  const { colors, Typography } = useTheme();
  const { userId } = useUser();

  const [workspaces, setWorkspaces] = useState([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);

  const [loadingWorkspaces, setLoadingWorkspaces] = useState(false);
  const [loadingSubjects, setLoadingSubjects] = useState(false);

  // Creation states
  const [showNewWorkspaceInput, setShowNewWorkspaceInput] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [showNewSubjectInput, setShowNewSubjectInput] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');

  // Fetch workspaces (Subjects in UI)
  const fetchWorkspaces = async () => {
    if (!userId) return;
    setLoadingWorkspaces(true);
    try {
      const data = await getWorkspaces(userId);
      setWorkspaces(data);

      // Auto-select initial subject if provided
      if (initialSubject) {
        const found = data.find((w) => w.name?.toLowerCase() === initialSubject.toLowerCase());
        if (found) {
          setSelectedWorkspace(found);
          fetchSubjects(found.id);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingWorkspaces(false);
    }
  };

  // Fetch subjects (Topics in UI) for the selected workspace
  const fetchSubjects = async (workspaceId) => {
    if (!userId || !workspaceId) return;
    setLoadingSubjects(true);
    try {
      const data = await getSubjectsByWorkspace(userId, workspaceId);
      setSubjects(data);

      // Auto-select initial topic if provided
      if (initialTopic) {
        const found = data.find((s) => s.name?.toLowerCase() === initialTopic.toLowerCase());
        if (found) {
          setSelectedSubject(found);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingSubjects(false);
    }
  };

  useEffect(() => {
    if (visible && userId) {
      fetchWorkspaces();
    }
  }, [visible, userId]);

  const handleSelectWorkspace = (ws) => {
    setSelectedWorkspace(ws);
    setSelectedSubject(null);
    fetchSubjects(ws.id);
  };

  const handleCreateWorkspace = async () => {
    const name = newWorkspaceName.trim();
    if (!name) return;
    try {
      const res = await createWorkspace(userId, { name });
      if (res.success) {
        const newWS = {
          id: res.id,
          name,
          createdAt: { toMillis: () => Date.now() },
        };
        setWorkspaces((prev) => [...prev, newWS]);
        setSelectedWorkspace(newWS);
        setSubjects([]);
        setNewWorkspaceName('');
        setShowNewWorkspaceInput(false);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateSubject = async () => {
    const name = newSubjectName.trim();
    if (!name || !selectedWorkspace) return;
    try {
      const res = await createSubject(userId, { name, workspaceId: selectedWorkspace.id });
      if (res.success) {
        const newSub = {
          id: res.id,
          name,
          workspaceId: selectedWorkspace.id,
        };
        setSubjects((prev) => [...prev, newSub]);
        setSelectedSubject(newSub);
        setNewSubjectName('');
        setShowNewSubjectInput(false);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDone = () => {
    onSelect({
      subject: selectedWorkspace ? selectedWorkspace.name : '',
      topic: selectedSubject ? selectedSubject.name : '',
    });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={[styles.modal, { backgroundColor: colors.surface, borderColor: colors.glassBorder }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[Typography.h3, { color: colors.text }]}>Choose Folder Destination</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Step 1: Select Subject */}
            <Text style={[styles.label, { color: colors.textSecondary }]}>SELECT SUBJECT</Text>
            {loadingWorkspaces ? (
              <ActivityIndicator size="small" color={colors.primary} style={styles.loader} />
            ) : (
              <View style={styles.chipWrap}>
                {workspaces.map((ws) => (
                  <TouchableOpacity
                    key={ws.id}
                    onPress={() => handleSelectWorkspace(ws)}
                    style={[
                      styles.folderChip,
                      {
                        backgroundColor: selectedWorkspace?.id === ws.id ? `${colors.primary}24` : colors.shimmer,
                        borderColor: selectedWorkspace?.id === ws.id ? colors.primary : colors.glassBorder,
                      },
                    ]}
                  >
                    <Ionicons
                      name="folder-open"
                      size={16}
                      color={selectedWorkspace?.id === ws.id ? colors.primary : colors.textSecondary}
                    />
                    <Text style={[styles.chipText, { color: selectedWorkspace?.id === ws.id ? colors.primary : colors.text }]}>
                      {ws.name}
                    </Text>
                  </TouchableOpacity>
                ))}

                {!showNewWorkspaceInput ? (
                  <TouchableOpacity
                    onPress={() => setShowNewWorkspaceInput(true)}
                    style={[styles.addChip, { borderColor: colors.glassBorder, backgroundColor: colors.shimmer }]}
                  >
                    <Ionicons name="add" size={16} color={colors.textSecondary} />
                    <Text style={[styles.chipText, { color: colors.textSecondary, marginLeft: 4 }]}>New Subject</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={[styles.inputChipRow, { borderColor: colors.primary }]}>
                    <TextInput
                      value={newWorkspaceName}
                      onChangeText={setNewWorkspaceName}
                      placeholder="Name..."
                      placeholderTextColor={colors.textTertiary}
                      style={[styles.miniInput, { color: colors.text }]}
                      autoFocus
                    />
                    <TouchableOpacity onPress={handleCreateWorkspace}>
                      <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setShowNewWorkspaceInput(false)}>
                      <Ionicons name="close-circle" size={20} color={colors.danger} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {/* Step 2: Select Topic */}
            {selectedWorkspace && (
              <>
                <Text style={[styles.label, { color: colors.textSecondary, marginTop: 24 }]}>
                  SELECT TOPIC (INSIDE {selectedWorkspace.name?.toUpperCase()})
                </Text>
                {loadingSubjects ? (
                  <ActivityIndicator size="small" color={colors.primary} style={styles.loader} />
                ) : (
                  <View style={styles.chipWrap}>
                    {subjects.map((sub) => (
                      <TouchableOpacity
                        key={sub.id}
                        onPress={() => setSelectedSubject(sub)}
                        style={[
                          styles.folderChip,
                          {
                            backgroundColor: selectedSubject?.id === sub.id ? `${colors.blueAccent}24` : colors.shimmer,
                            borderColor: selectedSubject?.id === sub.id ? colors.blueAccent : colors.glassBorder,
                          },
                        ]}
                      >
                        <Ionicons
                          name="folder"
                          size={16}
                          color={selectedSubject?.id === sub.id ? colors.blueAccent : colors.textSecondary}
                        />
                        <Text style={[styles.chipText, { color: selectedSubject?.id === sub.id ? colors.blueAccent : colors.text }]}>
                          {sub.name}
                        </Text>
                      </TouchableOpacity>
                    ))}

                    {!showNewSubjectInput ? (
                      <TouchableOpacity
                        onPress={() => setShowNewSubjectInput(true)}
                        style={[styles.addChip, { borderColor: colors.glassBorder, backgroundColor: colors.shimmer }]}
                      >
                        <Ionicons name="add" size={16} color={colors.textSecondary} />
                        <Text style={[styles.chipText, { color: colors.textSecondary, marginLeft: 4 }]}>New Topic</Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={[styles.inputChipRow, { borderColor: colors.blueAccent }]}>
                        <TextInput
                          value={newSubjectName}
                          onChangeText={setNewSubjectName}
                          placeholder="Name..."
                          placeholderTextColor={colors.textTertiary}
                          style={[styles.miniInput, { color: colors.text }]}
                          autoFocus
                        />
                        <TouchableOpacity onPress={handleCreateSubject}>
                          <Ionicons name="checkmark-circle" size={20} color={colors.blueAccent} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setShowNewSubjectInput(false)}>
                          <Ionicons name="close-circle" size={20} color={colors.danger} />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                )}
              </>
            )}
          </ScrollView>

          {/* Done Button */}
          <TouchableOpacity
            onPress={handleDone}
            disabled={!selectedWorkspace}
            style={[
              styles.doneBtn,
              {
                backgroundColor: selectedWorkspace ? colors.primary : colors.shimmer,
              },
            ]}
          >
            <Text style={[styles.doneText, { color: selectedWorkspace ? '#000' : colors.textTertiary }]}>
              Select Folder
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modal: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingTop: 20,
    paddingBottom: 32,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  body: {
    paddingHorizontal: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 10,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  folderChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
  },
  addChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  doneBtn: {
    marginHorizontal: 20,
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  doneText: {
    fontSize: 16,
    fontWeight: '700',
  },
  loader: {
    paddingVertical: 10,
    alignSelf: 'flex-start',
  },
  inputChipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  miniInput: {
    width: 80,
    fontSize: 13.5,
    paddingVertical: 4,
  },
});
