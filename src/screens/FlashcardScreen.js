import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useUser } from '../context/UserContext';
import HexagonBackground from '../components/HexagonBackground';
import GlassCard from '../components/GlassCard';
import SearchBar from '../components/SearchBar';
import FlashcardItem from '../components/FlashcardItem';
import FAB from '../components/FAB';
import EmptyState from '../components/EmptyState';
import { getFlashcards, getFlashcardStats, deleteFlashcard } from '../firebase/services/flashcardService';

const COLORS_PALETTE = [
  '#FBC02D', // Gold
  '#2196F3', // Ocean Blue
  '#9C27B0', // Purple Accent
  '#4CAF50', // Emerald Green
  '#FF5722', // Deep Orange
  '#E91E63', // Rose Red
  '#00BCD4', // Cyan
];

export default function FlashcardScreen({ navigation, route }) {
  const { colors, Typography } = useTheme();
  const { userId } = useUser();

  const [cards, setCards] = useState([]);
  const [stats, setStats] = useState({ total: 0, due: 0, mastered: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Internal screen navigation/hierarchical folder state
  const [selectedSubject, setSelectedSubject] = useState(route.params?.subject || null);
  const [selectedTopic, setSelectedTopic] = useState(null);

  // Sync subject when arriving from Workspace Screen drill-down
  useEffect(() => {
    if (route.params?.subject) {
      setSelectedSubject(route.params.subject);
    }
  }, [route.params?.subject]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [allCards, cardStats] = await Promise.all([
        getFlashcards(userId),
        getFlashcardStats(userId),
      ]);
      setCards(allCards);
      setStats(cardStats);
    } catch (e) {
      console.error('loadFlashcards:', e);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => {
    const unsub = navigation.addListener('focus', loadData);
    return unsub;
  }, [navigation, loadData]);

  const getFolderColor = (subjectName) => {
    let hash = 0;
    for (let i = 0; i < subjectName.length; i++) {
      hash = subjectName.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colorIndex = Math.abs(hash) % COLORS_PALETTE.length;
    return COLORS_PALETTE[colorIndex];
  };

  // Group all flashcards by subject -> topic -> cards
  const groupedData = useMemo(() => {
    const subjects = {};
    cards.forEach((c) => {
      const sub = c.subject?.trim() || 'General';
      const top = c.topic?.trim() || 'General';

      if (!subjects[sub]) {
        subjects[sub] = { name: sub, total: 0, due: 0, color: getFolderColor(sub), topics: {} };
      }

      subjects[sub].total++;

      const nextReview = c.nextReviewDate?.toMillis?.() ?? 0;
      const isDue = nextReview <= Date.now();
      if (isDue) {
        subjects[sub].due++;
      }

      if (!subjects[sub].topics[top]) {
        subjects[sub].topics[top] = { name: top, total: 0, due: 0, cards: [] };
      }

      subjects[sub].topics[top].total++;
      if (isDue) {
        subjects[sub].topics[top].due++;
      }
      subjects[sub].topics[top].cards.push(c);
    });

    return subjects;
  }, [cards]);

  const isSearching = search.trim().length > 0;

  // Filtered search results
  const searchFilteredCards = useMemo(() => {
    if (!isSearching) return [];
    const q = search.toLowerCase();
    return cards.filter((c) => {
      // If we are currently browsing a subject/topic, restrict search to it
      if (selectedSubject && c.subject?.toLowerCase() !== selectedSubject.toLowerCase()) {
        return false;
      }
      if (selectedTopic && c.topic?.toLowerCase() !== selectedTopic.toLowerCase()) {
        return false;
      }
      return (
        c.question.toLowerCase().includes(q) ||
        c.answer.toLowerCase().includes(q) ||
        c.subject?.toLowerCase().includes(q) ||
        c.topic?.toLowerCase().includes(q)
      );
    });
  }, [cards, search, selectedSubject, selectedTopic, isSearching]);

  const handleDelete = (cardId) => {
    Alert.alert('Delete Flashcard', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => { await deleteFlashcard(userId, cardId); loadData(); },
      },
    ]);
  };

  const handleLongPress = (card) => {
    Alert.alert(card.question.substring(0, 50), 'Choose an action', [
      { text: 'Edit', onPress: () => navigation.navigate('FlashcardEditor', { cardId: card.id }) },
      { text: 'Delete', style: 'destructive', onPress: () => handleDelete(card.id) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleBack = () => {
    if (selectedTopic) {
      setSelectedTopic(null);
    } else if (selectedSubject) {
      if (route.params?.subject) {
        navigation.goBack();
      } else {
        setSelectedSubject(null);
      }
    } else {
      navigation.goBack();
    }
  };

  // Derive structural lists
  const subjectsList = useMemo(() => Object.values(groupedData), [groupedData]);

  const topicsList = useMemo(() => {
    if (!selectedSubject || !groupedData[selectedSubject]) return [];
    return Object.values(groupedData[selectedSubject].topics);
  }, [groupedData, selectedSubject]);

  const topicCardsList = useMemo(() => {
    if (!selectedSubject || !selectedTopic || !groupedData[selectedSubject]?.topics[selectedTopic]) return [];
    return groupedData[selectedSubject].topics[selectedTopic].cards;
  }, [groupedData, selectedSubject, selectedTopic]);

  // Count due cards in current view context
  const currentDueCount = useMemo(() => {
    if (selectedTopic) {
      return groupedData[selectedSubject]?.topics[selectedTopic]?.due || 0;
    }
    if (selectedSubject) {
      return groupedData[selectedSubject]?.due || 0;
    }
    return stats.due;
  }, [groupedData, selectedSubject, selectedTopic, stats.due]);

  const styles = getStyles(colors);

  return (
    <SafeAreaView style={styles.container}>
      <HexagonBackground />

      {/* Header with breadcrumbs */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.titleWrap}>
          <Text style={[Typography.h2, { color: colors.text }]} numberOfLines={1}>
            {!selectedSubject ? 'Flashcards' : selectedSubject}
          </Text>
          {selectedTopic && (
            <Text style={[Typography.caption, { color: colors.primary }]} numberOfLines={1}>
              📁 {selectedTopic}
            </Text>
          )}
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate('AIFlashcard', { subject: selectedSubject || '', topic: selectedTopic || '' })}
          style={[styles.aiBtn, { backgroundColor: `${colors.blueAccent}1A` }]}
        >
          <Ionicons name="sparkles" size={18} color={colors.blueAccent} />
        </TouchableOpacity>
      </View>

      {/* Global/Subject/Topic Stats */}
      {!loading && (
        <View style={styles.statsRow}>
          <GlassCard style={[styles.statCard, { borderColor: `${colors.primary}33` }]}>
            <Text style={[styles.statValue, { color: colors.primary }]}>
              {selectedTopic
                ? topicCardsList.length
                : selectedSubject
                  ? groupedData[selectedSubject]?.total || 0
                  : stats.total}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total</Text>
          </GlassCard>
          <GlassCard style={[styles.statCard, { borderColor: `${colors.danger}33` }]}>
            <Text style={[styles.statValue, { color: currentDueCount > 0 ? colors.danger : colors.textSecondary }]}>
              {currentDueCount}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Due</Text>
          </GlassCard>
          <GlassCard style={[styles.statCard, { borderColor: `${colors.greenAccent}33` }]}>
            <Text style={[styles.statValue, { color: colors.greenAccent }]}>
              {selectedTopic
                ? topicCardsList.filter(c => (c.repetitions || 0) >= 5).length
                : selectedSubject
                  ? Object.values(groupedData[selectedSubject]?.topics || {}).reduce((sum, t) => sum + t.cards.filter(c => (c.repetitions || 0) >= 5).length, 0)
                  : stats.mastered}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Mastered</Text>
          </GlassCard>
        </View>
      )}

      {/* Study Session trigger */}
      {!loading && (selectedTopic || selectedSubject || stats.due > 0) && (
        <TouchableOpacity
          style={[styles.studyBtn, { backgroundColor: colors.primary }]}
          onPress={() => {
            if (selectedTopic) {
              navigation.navigate('FlashcardStudy', { topic: selectedTopic });
            } else if (selectedSubject) {
              navigation.navigate('FlashcardStudy', { subject: selectedSubject });
            } else {
              navigation.navigate('FlashcardStudy');
            }
          }}
        >
          <Ionicons name="play" size={18} color="#000" />
          <Text style={styles.studyBtnText}>
            {selectedTopic
              ? `Study Topic: ${selectedTopic}`
              : selectedSubject
                ? `Study Subject: ${selectedSubject}`
                : `Study ${stats.due} Due Cards`}
          </Text>
        </TouchableOpacity>
      )}

      {/* Search */}
      <View style={styles.searchWrap}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder={selectedTopic ? `Search in ${selectedTopic}...` : selectedSubject ? `Search in ${selectedSubject}...` : "Search all flashcards..."}
        />
      </View>

      {/* Content Rendering */}
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ flex: 1 }} />
      ) : isSearching ? (
        /* Search list override */
        searchFilteredCards.length === 0 ? (
          <EmptyState icon="search-outline" title="No matching cards" subtitle="Try another term or search globally" colors={colors} />
        ) : (
          <FlatList
            data={searchFilteredCards}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <FlashcardItem
                card={item}
                onPress={() => navigation.navigate('FlashcardEditor', { cardId: item.id })}
                onLongPress={() => handleLongPress(item)}
              />
            )}
          />
        )
      ) : !selectedSubject ? (
        /* Level 1: Subject Folders list */
        subjectsList.length === 0 ? (
          <EmptyState
            icon="layers-outline"
            title="No Flashcards Yet"
            subtitle="Organize your study deck! Tap + to add manual cards or spark AI flashcards."
            colors={colors}
          />
        ) : (
          <FlatList
            data={subjectsList}
            keyExtractor={(item) => item.name}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setSelectedSubject(item.name)}
                style={styles.folderCardWrap}
              >
                <GlassCard style={[styles.folderCard, { borderLeftColor: item.color, borderLeftWidth: 4 }]}>
                  <View style={styles.folderRow}>
                    <View style={[styles.iconCircle, { backgroundColor: `${item.color}1A` }]}>
                      <Ionicons name="folder" size={24} color={item.color} />
                    </View>
                    <View style={styles.folderText}>
                      <Text style={[Typography.h3, { color: colors.text }]}>{item.name}</Text>
                      <Text style={[Typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
                        {item.total} flashcard{item.total !== 1 ? 's' : ''}
                        {item.due > 0 ? ` · ` : ''}
                        {item.due > 0 && <Text style={{ color: colors.danger, fontWeight: '700' }}>{item.due} due</Text>}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                  </View>
                </GlassCard>
              </TouchableOpacity>
            )}
          />
        )
      ) : !selectedTopic ? (
        /* Level 2: Topic folders list */
        topicsList.length === 0 ? (
          <EmptyState icon="folder-open-outline" title="Empty Subject" subtitle="No topics generated in this subject folder yet." colors={colors} />
        ) : (
          <FlatList
            data={topicsList}
            keyExtractor={(item) => item.name}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setSelectedTopic(item.name)}
                style={styles.folderCardWrap}
              >
                <GlassCard style={styles.folderCard}>
                  <View style={styles.folderRow}>
                    <View style={[styles.iconCircle, { backgroundColor: `${colors.blueAccent}1A` }]}>
                      <Ionicons name="folder-outline" size={24} color={colors.blueAccent} />
                    </View>
                    <View style={styles.folderText}>
                      <Text style={[Typography.h3, { color: colors.text }]}>{item.name}</Text>
                      <Text style={[Typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
                        {item.total} card{item.total !== 1 ? 's' : ''}
                        {item.due > 0 ? ` · ` : ''}
                        {item.due > 0 && <Text style={{ color: colors.danger, fontWeight: '700' }}>{item.due} due</Text>}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                  </View>
                </GlassCard>
              </TouchableOpacity>
            )}
          />
        )
      ) : (
        /* Level 3: Cards scroll-down list inside selected topic */
        topicCardsList.length === 0 ? (
          <EmptyState icon="layers-outline" title="Empty Topic" subtitle="Add manual or AI flashcards to study this topic." colors={colors} />
        ) : (
          <FlatList
            data={topicCardsList}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <FlashcardItem
                card={item}
                onPress={() => navigation.navigate('FlashcardEditor', { cardId: item.id })}
                onLongPress={() => handleLongPress(item)}
              />
            )}
          />
        )
      )}

      {/* FAB links to editor and pre-populates category */}
      <FAB
        onPress={() =>
          navigation.navigate('FlashcardEditor', {
            subject: selectedSubject || '',
            topic: selectedTopic || '',
          })
        }
      />
    </SafeAreaView>
  );
}

const getStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  backBtn: { padding: 4 },
  titleWrap: { flex: 1, marginLeft: 12, justifyContent: 'center' },
  aiBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  statsRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginBottom: 14 },
  statCard: { flex: 1, alignItems: 'center', paddingVertical: 12, borderWidth: 1 },
  statValue: { fontSize: 24, fontWeight: '800' },
  statLabel: { fontSize: 12, marginTop: 2 },
  studyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 14,
    marginBottom: 14,
  },
  studyBtnText: { fontSize: 15, fontWeight: '700', color: '#000' },
  searchWrap: { paddingHorizontal: 20, marginBottom: 10 },
  list: { paddingHorizontal: 20, paddingBottom: 100, paddingTop: 10 },
  folderCardWrap: { marginBottom: 12 },
  folderCard: { padding: 16, borderWidth: 1 },
  folderRow: { flexDirection: 'row', alignItems: 'center' },
  iconCircle: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  folderText: { flex: 1, marginLeft: 12 },
});
