import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useUser } from '../context/UserContext';
import HexagonBackground from '../components/HexagonBackground';
import SearchBar from '../components/SearchBar';
import FilterBar from '../components/FilterBar';
import NoteCard from '../components/NoteCard';
import FAB from '../components/FAB';
import EmptyState from '../components/EmptyState';
import { getNotes, deleteNote, searchNotes, togglePin, toggleArchive } from '../firebase/services/notesService';

const FILTERS = [
  { key: 'all', label: 'All', icon: 'apps-outline' },
  { key: 'pinned', label: 'Pinned', icon: 'pin-outline' },
  { key: 'ai', label: 'AI Generated', icon: 'sparkles-outline' },
  { key: 'archived', label: 'Archived', icon: 'archive-outline' },
];

export default function NotesScreen({ navigation, route }) {
  const { colors, Typography } = useTheme();
  const { userId } = useUser();

  const [notes, setNotes] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  const loadNotes = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getNotes(userId);
      setNotes(data);
    } catch (e) {
      console.error('loadNotes:', e);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { loadNotes(); }, [loadNotes]);
  useEffect(() => {
    const unsub = navigation.addListener('focus', loadNotes);
    return unsub;
  }, [navigation, loadNotes]);

  // Apply filters
  useEffect(() => {
    let result = [...notes];

    // Subject parameter filter
    const routeSubject = route.params?.subject;
    if (routeSubject) {
      result = result.filter((n) => n.subject?.toLowerCase() === routeSubject.toLowerCase());
    }

    // Filter
    if (activeFilter === 'pinned') result = result.filter((n) => n.isPinned);
    else if (activeFilter === 'ai') result = result.filter((n) => n.createdByAI);
    else if (activeFilter === 'archived') result = result.filter((n) => n.isArchived);
    else result = result.filter((n) => !n.isArchived); // 'all' hides archived

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((n) =>
        n.title?.toLowerCase().includes(q) ||
        n.content?.toLowerCase().includes(q) ||
        n.subject?.toLowerCase().includes(q) ||
        n.topic?.toLowerCase().includes(q)
      );
    }

    // Sort: pinned first, then by updatedAt
    result.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      const ta = a.updatedAt?.toMillis?.() ?? 0;
      const tb = b.updatedAt?.toMillis?.() ?? 0;
      return tb - ta;
    });

    setFiltered(result);
  }, [notes, search, activeFilter]);

  const handleDelete = (noteId) => {
    Alert.alert('Delete Note', 'Are you sure you want to delete this note?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          await deleteNote(userId, noteId);
          loadNotes();
        },
      },
    ]);
  };

  const handleLongPress = (note) => {
    const options = [
      { text: note.isPinned ? 'Unpin' : 'Pin', onPress: async () => { await togglePin(userId, note.id, note.isPinned); loadNotes(); } },
      { text: note.isArchived ? 'Unarchive' : 'Archive', onPress: async () => { await toggleArchive(userId, note.id, note.isArchived); loadNotes(); } },
      { text: 'Edit', onPress: () => navigation.navigate('NoteEditor', { noteId: note.id }) },
      { text: 'Delete', style: 'destructive', onPress: () => handleDelete(note.id) },
      { text: 'Cancel', style: 'cancel' },
    ];
    Alert.alert(note.title || 'Note', 'Choose an action', options);
  };

  const styles = getStyles(colors, Typography);

  return (
    <SafeAreaView style={styles.container}>
      <HexagonBackground />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[Typography.h2, { color: colors.text }]}>Notes</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('AINotesGenerator')}
          style={[styles.aiBtn, { backgroundColor: `${colors.primary}1A` }]}
        >
          <Ionicons name="sparkles" size={18} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Search + Filter */}
      <View style={styles.searchWrap}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search notes..." />
      </View>
      <FilterBar filters={FILTERS} activeFilter={activeFilter} onFilterChange={setActiveFilter} style={styles.filterBar} />

      {/* Notes List */}
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="document-text-outline"
          title={search ? 'No notes found' : 'No notes yet'}
          subtitle={search ? 'Try a different search term' : 'Tap + to create your first note or use AI to generate one'}
          colors={colors}
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <NoteCard
              note={item}
              onPress={() => navigation.navigate('NoteView', { noteId: item.id })}
              onLongPress={() => handleLongPress(item)}
            />
          )}
        />
      )}

      {/* FAB */}
      <FAB onPress={() => navigation.navigate('NoteEditor')} />
    </SafeAreaView>
  );
}

const getStyles = (colors, Typography) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
  },
  backBtn: { padding: 4 },
  aiBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  searchWrap: { paddingHorizontal: 20, marginBottom: 10 },
  filterBar: { paddingHorizontal: 20 },
  loader: { flex: 1, justifyContent: 'center' },
  list: { paddingHorizontal: 20, paddingBottom: 100 },
});
