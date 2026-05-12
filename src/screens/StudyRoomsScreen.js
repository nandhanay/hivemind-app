import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import { useUser } from '../context/UserContext';
import HexagonBackground from '../components/HexagonBackground';
import GlassCard from '../components/GlassCard';
import HoneyButton from '../components/HoneyButton';
import { Ionicons } from '@expo/vector-icons';
import { STUDY_ROOMS } from '../data/studyRooms';
import { subscribePublicRooms } from '../firebase/services/studyRoomService';
import { getThemePreset, getAmbiencePreset } from '../constants/studyRoomPresets';
import { getRecentStudyRooms } from '../utils/studyRoomsRecent';

function formatTimerLabel(room) {
  if (!room) return 'Idle';
  if (room.sessionActive) return 'Focus live';
  const r = room.sessionPausedRemainingSec ?? room.sessionTotalSec;
  if (r > 0) return `Paused · ${Math.ceil(r / 60)}m`;
  return 'Ready';
}

export default function StudyRoomsScreen({ navigation }) {
  const { colors, Typography } = useTheme();
  const { userId, isGuest, showMessage } = useUser();
  const [search, setSearch] = useState('');
  const [publicRooms, setPublicRooms] = useState([]);
  const [publicError, setPublicError] = useState(null);
  const [recent, setRecent] = useState([]);
  const [loadingRecent, setLoadingRecent] = useState(true);

  useEffect(() => {
    const unsub = subscribePublicRooms(
      (list) => {
        setPublicRooms(list);
        setPublicError(null);
      },
      (err) => setPublicError(err.message || 'Could not load public hives')
    );
    return unsub;
  }, []);

  const loadRecent = useCallback(async () => {
    setLoadingRecent(true);
    const r = await getRecentStudyRooms();
    setRecent(r);
    setLoadingRecent(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadRecent();
    }, [loadRecent])
  );

  const filteredPublic = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return publicRooms;
    return publicRooms.filter(
      (r) =>
        (r.roomName || '').toLowerCase().includes(q) ||
        (r.roomCode || '').toLowerCase().includes(q)
    );
  }, [publicRooms, search]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <HexagonBackground />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} accessibilityRole="button">
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[Typography.h2, { color: colors.text }]}>Study Rooms</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[Typography.body, { color: colors.textSecondary, marginBottom: 14 }]}>
          Collaborative hives — shared timers, tasks, and ambience. Golden honey vibes, zero web-only UI.
        </Text>

        <View style={styles.heroActions}>
          <HoneyButton
            title="Create room"
            icon="add-circle-outline"
            onPress={() => navigation.navigate('CreateRoom')}
            style={styles.halfBtn}
          />
          <HoneyButton
            title="Join room"
            icon="key-outline"
            variant="secondary"
            onPress={() => navigation.navigate('JoinRoom')}
            style={styles.halfBtn}
          />
        </View>

        {isGuest && (
          <GlassCard style={styles.notice}>
            <View style={styles.noticeRow}>
              <Ionicons name="lock-closed-outline" size={20} color={colors.primary} />
              <Text style={[Typography.caption, { color: colors.textSecondary, flex: 1, marginLeft: 10 }]}>
                Sign in for live Firestore hives. Featured previews below still work offline.
              </Text>
            </View>
          </GlassCard>
        )}

        <GlassCard style={styles.searchCard}>
          <View style={styles.searchRow}>
            <Ionicons name="search-outline" size={20} color={colors.textSecondary} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search public rooms…"
              placeholderTextColor={colors.textTertiary}
              style={[styles.searchInput, { color: colors.text }]}
            />
          </View>
        </GlassCard>

        <Text style={[Typography.h3, { color: colors.text, marginBottom: 10, marginTop: 8 }]}>Recently joined</Text>
        {loadingRecent ? (
          <ActivityIndicator color={colors.primary} style={{ marginBottom: 16 }} />
        ) : recent.length === 0 ? (
          <Text style={[Typography.caption, { color: colors.textSecondary, marginBottom: 16 }]}>
            No recents yet — join a hive and it will land here.
          </Text>
        ) : (
          recent.map((r) => (
            <TouchableOpacity
              key={r.id}
              style={[styles.recentRow, { borderColor: colors.glassBorder, backgroundColor: colors.shimmer }]}
              onPress={() => {
                if (isGuest) {
                  showMessage?.('Sign in to open a live hive.', 'error');
                  return;
                }
                navigation.navigate('StudyRoomDetail', { roomId: r.id, isDemo: false });
              }}
            >
              <Ionicons name="time-outline" size={18} color={colors.primary} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={[Typography.body, { color: colors.text, fontWeight: '700' }]}>{r.roomName}</Text>
                <Text style={[Typography.caption, { color: colors.textSecondary }]}>{r.roomCode}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          ))
        )}

        <Text style={[Typography.h3, { color: colors.text, marginTop: 12, marginBottom: 10 }]}>Explore · public hives</Text>
        {publicError ? (
          <Text style={[Typography.caption, { color: colors.danger, marginBottom: 12 }]}>{publicError}</Text>
        ) : null}

        {filteredPublic.length === 0 && !publicError ? (
          <Text style={[Typography.caption, { color: colors.textSecondary, marginBottom: 16 }]}>
            No public rooms yet — be the first to create one.
          </Text>
        ) : (
          filteredPublic.map((room) => {
            const theme = getThemePreset(room.theme);
            const amb = getAmbiencePreset(room.ambience);
            return (
              <GlassCard key={room.id} style={styles.roomCardOuter} contentStyle={{ padding: 0 }}>
                <Image source={{ uri: room.bannerUrl }} style={styles.banner} resizeMode="cover" />
                <View style={[styles.roomBody, { borderTopColor: colors.glassBorder }]}>
                  <Text style={[Typography.h3, { color: colors.text, marginBottom: 4 }]}>{room.roomName}</Text>
                  <Text style={[Typography.caption, { color: colors.textSecondary, marginBottom: 6 }]}>
                    Queen: {room.creatorName || 'Bee'} · {theme.label}
                  </Text>
                  <View style={styles.metaRow}>
                    <Ionicons name={amb.icon} size={16} color={colors.primary} />
                    <Text style={[Typography.caption, { color: colors.textSecondary, marginLeft: 6, flex: 1 }]}>
                      {amb.label}
                    </Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Ionicons name="pulse-outline" size={16} color={colors.greenAccent} />
                    <Text style={[Typography.caption, { color: colors.textSecondary, marginLeft: 6 }]}>
                      {formatTimerLabel(room)}
                    </Text>
                  </View>
                  <HoneyButton
                    title="Enter hive"
                    icon="arrow-forward-circle-outline"
                    onPress={() => {
                      if (isGuest) {
                        showMessage?.('Sign in to enter a live hive.', 'error');
                        return;
                      }
                      navigation.navigate('StudyRoomDetail', { roomId: room.id, isDemo: false });
                    }}
                    style={styles.joinBtn}
                  />
                </View>
              </GlassCard>
            );
          })
        )}

        <Text style={[Typography.h3, { color: colors.text, marginTop: 20, marginBottom: 10 }]}>Featured moods</Text>
        <Text style={[Typography.caption, { color: colors.textSecondary, marginBottom: 12 }]}>
          Offline previews inspired by the studyroom designs — same names & energy, no sync.
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.featuredRow}>
          {STUDY_ROOMS.map((room) => (
            <TouchableOpacity
              key={room.id}
              style={[styles.featuredCard, { backgroundColor: colors.shimmer, borderColor: colors.glassBorder }]}
              onPress={() => navigation.navigate('StudyRoomDetail', { roomId: room.id, isDemo: true })}
            >
              <Image source={{ uri: room.bannerUrl }} style={styles.featuredImg} />
              <Text style={[Typography.caption, { color: colors.text, fontWeight: '800', marginTop: 8 }]} numberOfLines={1}>
                {room.title}
              </Text>
              <Text style={[Typography.caption, { color: colors.textSecondary, marginTop: 2 }]} numberOfLines={1}>
                {room.ambientTheme}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backBtn: { padding: 4 },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  heroActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
  },
  halfBtn: { flex: 1, minWidth: 0 },
  notice: { marginBottom: 14 },
  noticeRow: { flexDirection: 'row', alignItems: 'center' },
  searchCard: { marginBottom: 16 },
  searchRow: { flexDirection: 'row', alignItems: 'center' },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 16, paddingVertical: 4 },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  roomCardOuter: {
    marginBottom: 16,
    overflow: 'hidden',
  },
  banner: {
    width: '100%',
    height: 132,
    backgroundColor: '#111',
  },
  roomBody: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  joinBtn: {
    marginTop: 12,
    alignSelf: 'stretch',
  },
  featuredRow: {
    paddingBottom: 8,
    gap: 12,
  },
  featuredCard: {
    width: 160,
    marginRight: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 10,
    overflow: 'hidden',
  },
  featuredImg: {
    width: '100%',
    height: 88,
    borderRadius: 12,
    backgroundColor: '#111',
  },
});
