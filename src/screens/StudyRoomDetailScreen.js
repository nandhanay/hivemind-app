import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Share,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import Slider from '@react-native-community/slider';
import { useTheme } from '../theme/ThemeContext';
import { useUser } from '../context/UserContext';
import HexagonBackground from '../components/HexagonBackground';
import GlassCard from '../components/GlassCard';
import HoneyButton from '../components/HoneyButton';
import ProgressBar from '../components/ProgressBar';
import FloatingBeesRow from '../components/FloatingBeesRow';
import StudyRoomAmbientBackground from '../components/StudyRoomAmbientBackground';
import StudyRoomWhiteboardModal from '../components/StudyRoomWhiteboardModal';
import { Ionicons } from '@expo/vector-icons';
import { getStudyRoomById, MOCK_ROOM_IDS } from '../data/studyRooms';
import {
  ROOM_THEMES,
  ROOM_AMBIENCE,
  DEFAULT_FOCUS_SECONDS,
  getThemePreset,
  BEE_STATUSES,
} from '../constants/studyRoomPresets';
import { getThemeAudioSubtitle } from '../constants/roomThemes';
import {
  subscribeRoom,
  subscribeMembers,
  subscribeTasks,
  joinStudyRoomMember,
  leaveStudyRoomMember,
  addRoomTask,
  toggleRoomTask,
  updateRoomAmbience,
  updateRoomTheme,
  startRoomSession,
  pauseRoomSession,
  resumeRoomSession,
  resetRoomSession,
  setMemberStudying,
  updateMemberPresence,
} from '../firebase/services/studyRoomService';
import { pushRecentStudyRoom } from '../utils/studyRoomsRecent';
import { useRoomAmbience } from '../hooks/useRoomAmbience';

function formatTime(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function useTick() {
  const [, setT] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setT((x) => x + 1), 1000);
    return () => clearInterval(id);
  }, []);
}

function computeLiveRemaining(room) {
  if (!room) return 0;
  if (room.sessionActive && room.sessionEndsAt?.toMillis) {
    return Math.max(0, Math.ceil((room.sessionEndsAt.toMillis() - Date.now()) / 1000));
  }
  const paused = room.sessionPausedRemainingSec;
  if (typeof paused === 'number') return Math.max(0, Math.floor(paused));
  return Math.max(0, Math.floor(room.sessionTotalSec || DEFAULT_FOCUS_SECONDS));
}

/* ─── Demo (offline) room — preserves prior mock experience ─── */
function DemoRoomBody({ room, navigation }) {
  const { colors, Typography, showMessage } = useTheme();
  const [tasks, setTasks] = useState([]);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  
  // Ambience State
  const [ambienceId, setAmbienceId] = useState(room.ambientTheme || 'lofi');
  const [muteAmbience, setMuteAmbience] = useState(false);
  const [ambientPaused, setAmbientPaused] = useState(false);
  const [ambientVol, setAmbientVol] = useState(0.65);
  const [screenFocused, setScreenFocused] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setScreenFocused(true);
      return () => setScreenFocused(false);
    }, [])
  );

  useRoomAmbience({
    firestoreThemeId: room.ambientTheme,
    firestoreAmbienceId: ambienceId,
    ambienceEnabled: ambienceId !== 'none',
    masterMuted: muteAmbience,
    userPaused: ambientPaused,
    volume: ambientVol,
    isScreenFocused: screenFocused,
  });

  useEffect(() => {
    setTasks(room.initialTasks.map((t) => ({ ...t })));
    setSecondsLeft(room.focusPresetMinutes * 60);
    setIsRunning(false);
  }, [room]);

  useEffect(() => {
    if (!isRunning || secondsLeft <= 0) return undefined;
    const id = setInterval(() => setSecondsLeft((prev) => (prev <= 1 ? 0 : prev - 1)), 1000);
    return () => clearInterval(id);
  }, [isRunning, secondsLeft]);

  useEffect(() => {
    if (secondsLeft === 0 && isRunning) setIsRunning(false);
  }, [secondsLeft, isRunning]);

  const toggleTask = useCallback((id) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)));
  }, []);

  const completedCount = tasks.filter((t) => t.completed).length;
  const taskProgress = tasks.length ? completedCount / tasks.length : 0;
  const timerProgress = room.focusPresetMinutes > 0 ? secondsLeft / (room.focusPresetMinutes * 60) : 0;
  const resetTimer = () => {
    setIsRunning(false);
    setSecondsLeft(room.focusPresetMinutes * 60);
  };

  return (
    <>
      <GlassCard style={styles.section} contentStyle={{ padding: 0 }}>
        <Image source={{ uri: room.bannerUrl }} style={styles.heroImage} resizeMode="cover" />
        <View style={[styles.heroCaption, { borderTopColor: colors.glassBorder }]}>
          <Text style={[Typography.caption, { color: colors.primary, letterSpacing: 2, marginBottom: 6 }]}>
            PREVIEW · {room.ambientTheme.toUpperCase()}
          </Text>
          <Text style={[Typography.body, { color: colors.textSecondary }]}>
            Offline moodboard — create a live hive from Study Rooms for realtime sync.
          </Text>
        </View>
      </GlassCard>

      <GlassCard style={styles.section}>
        <Text style={[Typography.h3, { color: colors.text, marginBottom: 16 }]}>Focus timer</Text>
        <View style={styles.timerCenter}>
          <View style={[styles.timerGlow, { shadowColor: colors.primary }]} />
          <Text style={[styles.timerDigits, { color: colors.text }]}>{formatTime(secondsLeft)}</Text>
        </View>
        <Text style={[Typography.caption, { color: colors.textSecondary, marginBottom: 20, letterSpacing: 2 }]}>
          LOCAL PREVIEW
        </Text>
        <ProgressBar progress={timerProgress} height={6} />
        <View style={styles.timerControls}>
          <TouchableOpacity
            style={[styles.playBtn, { backgroundColor: colors.primary, shadowColor: colors.primary }]}
            onPress={() => {
              if (secondsLeft <= 0) setSecondsLeft(room.focusPresetMinutes * 60);
              setIsRunning((r) => !r);
            }}
          >
            <Ionicons name={isRunning ? 'pause' : 'play'} size={28} color="#000" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.stopBtn, { backgroundColor: colors.shimmer, borderColor: colors.glassBorder, marginLeft: 20 }]}
            onPress={resetTimer}
          >
            <Ionicons name="refresh" size={22} color={colors.text} />
          </TouchableOpacity>
        </View>
      </GlassCard>

      <GlassCard style={styles.section}>
        <View style={styles.quoteRow}>
          <Ionicons name="chatbubble-ellipses-outline" size={22} color={colors.primary} style={{ marginRight: 10 }} />
          <Text style={[Typography.body, { color: colors.text, flex: 1, fontStyle: 'italic', lineHeight: 22 }]}>
            “{room.quote}”
          </Text>
        </View>
      </GlassCard>

      <GlassCard style={styles.section}>
        <View style={styles.onlineRow}>
          <Ionicons name="people" size={22} color={colors.greenAccent} />
          <Text style={[Typography.h3, { color: colors.text, marginLeft: 10 }]}>{room.onlineUsersLabel} bees online</Text>
        </View>
        <Text style={[Typography.caption, { color: colors.textSecondary, marginTop: 6 }]}>Illustrative — not synced.</Text>
      </GlassCard>

      <GlassCard style={styles.section}>
        <Text style={[Typography.h3, { color: colors.text, marginBottom: 14 }]}>Checklist</Text>
        {tasks.map((task) => (
          <TouchableOpacity
            key={task.id}
            style={[styles.taskRow, { borderColor: colors.glassBorder, backgroundColor: colors.shimmer }]}
            onPress={() => toggleTask(task.id)}
            activeOpacity={0.85}
          >
            <Ionicons name={task.completed ? 'checkbox' : 'square-outline'} size={22} color={task.completed ? colors.primary : colors.textSecondary} />
            <Text
              style={[
                Typography.body,
                {
                  color: task.completed ? colors.textSecondary : colors.text,
                  marginLeft: 12,
                  flex: 1,
                  textDecorationLine: task.completed ? 'line-through' : 'none',
                },
              ]}
            >
              {task.text}
            </Text>
          </TouchableOpacity>
        ))}
      </GlassCard>

      <GlassCard style={styles.section}>
        <Text style={[Typography.h3, { color: colors.text, marginBottom: 10 }]}>Progress</Text>
        <Text style={[Typography.caption, { color: colors.textSecondary, marginBottom: 10 }]}>
          Checklist {completedCount} / {tasks.length}
        </Text>
        <ProgressBar progress={taskProgress} height={10} />
      </GlassCard>

      <GlassCard style={styles.section}>
        <View style={styles.rowBetween}>
          <Text style={[Typography.h3, { color: colors.text }]}>Hive ambience</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity onPress={() => setAmbientPaused((p) => !p)} style={styles.iconBtn}>
              <Ionicons name={ambientPaused ? 'play' : 'pause'} size={20} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setMuteAmbience((m) => !m)} style={styles.iconBtn}>
              <Ionicons name={muteAmbience ? 'volume-mute' : 'volume-high'} size={22} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.volRow}>
          <Ionicons name="volume-low-outline" size={18} color={colors.textSecondary} />
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={1}
            value={ambientVol}
            onValueChange={setAmbientVol}
            minimumTrackTintColor={colors.primary}
            maximumTrackTintColor={colors.border}
            thumbTintColor={colors.primary}
          />
          <Ionicons name="volume-high-outline" size={18} color={colors.textSecondary} />
        </View>
        <View style={styles.chipsWrap}>
          {ROOM_AMBIENCE.map((a) => (
            <TouchableOpacity
              key={a.id}
              style={[
                styles.chip,
                {
                  borderColor: ambienceId === a.id ? colors.primary : colors.glassBorder,
                  backgroundColor: ambienceId === a.id ? `${colors.primary}22` : colors.shimmer,
                },
              ]}
              onPress={() => setAmbienceId(a.id)}
            >
              <Ionicons name={a.icon} size={16} color={colors.primary} style={{ marginRight: 6 }} />
              <Text style={[Typography.caption, { color: colors.text, fontWeight: '600' }]}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </GlassCard>

      <HoneyButton
        title="Create a live hive"
        icon="rocket-outline"
        variant="secondary"
        onPress={() => navigation.navigate('CreateRoom')}
        style={{ marginBottom: 28 }}
      />
    </>
  );
}

/* ─── Live Firestore collaborative room ─── */
function LiveRoomBody({ roomId, navigation }) {
  useTick();
  const { colors, Typography } = useTheme();
  const { userId, userName, showMessage } = useUser();

  const [room, setRoom] = useState(null);
  const [members, setMembers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState('');
  const [muteAmbience, setMuteAmbience] = useState(false);
  const [ambientPaused, setAmbientPaused] = useState(false);
  const [ambientVol, setAmbientVol] = useState(0.65);
  const [wbOpen, setWbOpen] = useState(false);
  const [durationPick, setDurationPick] = useState(25);
  const [screenFocused, setScreenFocused] = useState(true);
  const joinOnceRef = useRef(false);
  const autoPauseRef = useRef(false);

  const remaining = useMemo(() => computeLiveRemaining(room), [room]);

  useFocusEffect(
    useCallback(() => {
      setScreenFocused(true);
      return () => setScreenFocused(false);
    }, [])
  );

  useRoomAmbience({
    firestoreThemeId: room?.theme,
    firestoreAmbienceId: room?.ambience,
    ambienceEnabled: room?.ambience !== 'none',
    masterMuted: muteAmbience,
    userPaused: ambientPaused,
    volume: ambientVol,
    isScreenFocused: screenFocused,
  });

  useEffect(() => {
    joinOnceRef.current = false;
  }, [roomId]);

  useEffect(() => {
    const u1 = subscribeRoom(roomId, (r) => {
      setRoom(r);
      if (r && userId && !joinOnceRef.current) {
        joinOnceRef.current = true;
        joinStudyRoomMember(roomId, userId, userName, r.creatorId === userId).then((res) => {
          if (!res.success) {
            joinOnceRef.current = false;
            showMessage?.(res.error || 'Could not join hive', 'error');
          } else {
            pushRecentStudyRoom({
              id: roomId,
              roomName: r.roomName,
              roomCode: r.roomCode,
            });
          }
        });
      }
    });
    const u2 = subscribeMembers(roomId, setMembers);
    const u3 = subscribeTasks(roomId, setTasks);
    return () => {
      u1();
      u2();
      u3();
    };
  }, [roomId, userId, userName, showMessage]);

  useEffect(
    () => () => {
      if (userId) leaveStudyRoomMember(roomId, userId);
      joinOnceRef.current = false;
    },
    [roomId, userId]
  );

  useEffect(() => {
    if (!room?.sessionActive || !room.sessionEndsAt?.toMillis) {
      autoPauseRef.current = false;
      return undefined;
    }
    const id = setInterval(() => {
      const left = Math.ceil((room.sessionEndsAt.toMillis() - Date.now()) / 1000);
      if (left <= 0 && !autoPauseRef.current) {
        autoPauseRef.current = true;
        pauseRoomSession(roomId, 0);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [room?.sessionActive, room?.sessionEndsAt, roomId, room]);

  const themePreset = useMemo(() => getThemePreset(room?.theme), [room?.theme]);
  const timerProgress =
    room && (room.sessionTotalSec || DEFAULT_FOCUS_SECONDS) > 0
      ? remaining / (room.sessionTotalSec || DEFAULT_FOCUS_SECONDS)
      : 0;
  const completedCount = tasks.filter((t) => t.completed).length;
  const taskProgress = tasks.length ? completedCount / tasks.length : 0;

  const onCopyCode = async () => {
    if (!room?.roomCode) return;
    await Clipboard.setStringAsync(room.roomCode);
    showMessage?.('Room code copied', 'success');
  };

  const onInvite = async () => {
    if (!room) return;
    try {
      await Share.share({
        message: `Buzz into my HiveMind room “${room.roomName}” with code ${room.roomCode}`,
      });
    } catch (e) {
      console.warn(e);
    }
  };

  const onLeave = () => {
    Alert.alert('Leave hive?', 'Timer and tasks stay for other bees.', [
      { text: 'Stay', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: async () => {
          await leaveStudyRoomMember(roomId, userId);
          navigation.goBack();
        },
      },
    ]);
  };

  const toggleStudying = async () => {
    const me = members.find((m) => m.uid === userId);
    const next = !me?.isStudying;
    await setMemberStudying(roomId, userId, next);
    await updateMemberPresence(roomId, userId, { beeStatus: next ? 'studying' : 'idle', isStudying: next });
  };

  if (!room) {
    return (
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <GlassCard style={styles.section}>
          <Text style={[Typography.body, { color: colors.textSecondary }]}>Loading hive…</Text>
        </GlassCard>
      </View>
    );
  }

  const durSeconds = durationPick * 60;

  return (
    <View style={{ flex: 1 }}>
      <StudyRoomAmbientBackground themeId={room.theme} ambienceId={room.ambience} />
      <ScrollView
        style={{ flex: 1, zIndex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}
        keyboardShouldPersistTaps="handled"
      >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={[Typography.h2, { color: colors.text }]} numberOfLines={1}>
            {room.roomName}
          </Text>
          <Text
            style={[Typography.caption, { color: colors.textSecondary, marginTop: 2, fontSize: 12 }]}
            numberOfLines={1}
          >
            {getThemeAudioSubtitle(room.theme)}
          </Text>
          <TouchableOpacity onPress={onCopyCode}>
            <Text style={[Typography.caption, { color: colors.primary, fontWeight: '800', marginTop: 4 }]}>
              {room.roomCode}
            </Text>
          </TouchableOpacity>
        </View>
        <View style={{ width: 24 }} />
      </View>

      <GlassCard style={styles.section} contentStyle={{ padding: 0 }}>
        <View style={{ position: 'relative' }}>
          <Image source={{ uri: room.bannerUrl }} style={styles.heroImage} resizeMode="cover" />
          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.72)']} style={StyleSheet.absoluteFillObject} />
          <View style={[styles.heroTint, { backgroundColor: themePreset.tint }]} />
        </View>
        <View style={[styles.heroCaption, { borderTopColor: colors.glassBorder }]}>
          <Text style={[Typography.caption, { color: colors.primary, letterSpacing: 2, marginBottom: 6 }]}>
            LIVE HIVE · {themePreset.label.toUpperCase()}
          </Text>
          {room.focusGoal ? (
            <Text style={[Typography.body, { color: colors.text }]}>{room.focusGoal}</Text>
          ) : (
            <Text style={[Typography.body, { color: colors.textSecondary }]}>No goal set — flow together anyway.</Text>
          )}
        </View>
      </GlassCard>

      <GlassCard style={styles.section}>
        <View style={styles.rowBetween}>
          <Text style={[Typography.h3, { color: colors.text }]}>Hive members</Text>
          <TouchableOpacity onPress={toggleStudying} style={[styles.pill, { borderColor: colors.primary }]}>
            <Text style={[Typography.caption, { color: colors.primary, fontWeight: '800' }]}>I’m studying</Text>
          </TouchableOpacity>
        </View>
        <FloatingBeesRow members={members} themeId={room.theme} />
      </GlassCard>

      <GlassCard style={styles.section}>
        <Text style={[Typography.h3, { color: colors.text, marginBottom: 8 }]}>Hive signals</Text>
        <Text style={[Typography.caption, { color: colors.textSecondary, marginBottom: 12 }]}>
          Raise a doubt or show you are helping — everyone sees it on the bees.
        </Text>
        <View style={styles.signalRow}>
          <HoneyButton
            title={members.find((m) => m.uid === userId)?.needsHelp ? 'Doubt shared' : 'Need help?'}
            icon="help-circle-outline"
            variant="secondary"
            onPress={async () => {
              const me = members.find((m) => m.uid === userId);
              await updateMemberPresence(roomId, userId, { needsHelp: !me?.needsHelp });
            }}
            style={{ flex: 1, marginRight: 8, minWidth: 0 }}
          />
          <HoneyButton
            title="I’m explaining"
            icon="school-outline"
            variant="secondary"
            onPress={async () => {
              const me = members.find((m) => m.uid === userId);
              const next = !me?.isExplaining;
              await updateMemberPresence(roomId, userId, {
                isExplaining: next,
                beeStatus: next ? 'helping' : 'idle',
              });
            }}
            style={{ flex: 1, minWidth: 0 }}
          />
        </View>
        <View style={styles.statusChips}>
          {BEE_STATUSES.map((s) => (
            <TouchableOpacity
              key={s.id}
              style={[styles.miniChip, { borderColor: colors.glassBorder, backgroundColor: colors.shimmer }]}
              onPress={() => updateMemberPresence(roomId, userId, { beeStatus: s.id })}
            >
              <Ionicons name={s.icon} size={14} color={colors.primary} style={{ marginRight: 4 }} />
              <Text style={[Typography.caption, { color: colors.text, fontWeight: '600' }]}>{s.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </GlassCard>

      <GlassCard style={styles.section}>
        <Text style={[Typography.h3, { color: colors.text, marginBottom: 10 }]}>Shared focus timer</Text>
        <Text style={[Typography.caption, { color: colors.textSecondary, marginBottom: 12 }]}>
          Synced via Firestore — everyone sees the same countdown.
        </Text>
        <View style={styles.durRow}>
          {[15, 25, 45, 50].map((m) => (
            <TouchableOpacity
              key={m}
              onPress={() => setDurationPick(m)}
              style={[
                styles.durChip,
                {
                  borderColor: durationPick === m ? colors.primary : colors.glassBorder,
                  backgroundColor: durationPick === m ? `${colors.primary}22` : colors.shimmer,
                },
              ]}
            >
              <Text style={[Typography.caption, { color: colors.text, fontWeight: '700' }]}>{m}m</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.timerCenter}>
          <View style={[styles.timerGlow, { shadowColor: colors.primary }]} />
          <Text style={[styles.timerDigits, { color: colors.text }]}>{formatTime(remaining)}</Text>
        </View>
        <ProgressBar progress={timerProgress} height={6} />
        <View style={styles.timerControls}>
          <TouchableOpacity
            style={[styles.playBtn, { backgroundColor: colors.primary, shadowColor: colors.primary }]}
            onPress={async () => {
              if (room.sessionActive) {
                const r = await pauseRoomSession(roomId, remaining);
                if (!r.success) showMessage?.(r.error, 'error');
              } else if (remaining > 0) {
                const r = await resumeRoomSession(roomId, remaining, userId);
                if (!r.success) showMessage?.(r.error, 'error');
              } else {
                const r = await startRoomSession(roomId, durSeconds, userId);
                if (!r.success) showMessage?.(r.error, 'error');
              }
            }}
          >
            <Ionicons name={room.sessionActive ? 'pause' : 'play'} size={28} color="#000" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.stopBtn, { backgroundColor: colors.shimmer, borderColor: colors.glassBorder, marginLeft: 16 }]}
            onPress={async () => {
              const r = await resetRoomSession(roomId, durSeconds);
              if (!r.success) showMessage?.(r.error, 'error');
            }}
          >
            <Ionicons name="refresh" size={22} color={colors.text} />
          </TouchableOpacity>
        </View>
      </GlassCard>

      <GlassCard style={styles.section}>
        <View style={styles.quoteRow}>
          <Ionicons name="sparkles-outline" size={22} color={colors.primary} style={{ marginRight: 10 }} />
          <Text style={[Typography.body, { color: colors.text, flex: 1, fontStyle: 'italic', lineHeight: 22 }]}>
            “{room.quote || 'The hive is stronger together.'}”
          </Text>
        </View>
      </GlassCard>

      <GlassCard style={styles.section}>
        <Text style={[Typography.h3, { color: colors.text, marginBottom: 10 }]}>Hive stats</Text>
        <Text style={[Typography.caption, { color: colors.textSecondary }]}>
          Total focus logged (hive): {Math.floor((room.totalFocusSeconds || 0) / 60)}m · Streak: {room.streakDays || 0}d
        </Text>
      </GlassCard>

      <GlassCard style={styles.section}>
        <View style={styles.rowBetween}>
          <Text style={[Typography.h3, { color: colors.text }]}>Hive ambience</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity onPress={() => setAmbientPaused((p) => !p)} style={styles.iconBtn}>
              <Ionicons name={ambientPaused ? 'play' : 'pause'} size={20} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setMuteAmbience((m) => !m)} style={styles.iconBtn}>
              <Ionicons name={muteAmbience ? 'volume-mute' : 'volume-high'} size={22} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>
        <Text style={[Typography.caption, { color: colors.textSecondary, marginBottom: 10 }]}>
          Smooth crossfades when the hive switches sound. Mute silences for you only.
        </Text>
        <View style={styles.volRow}>
          <Ionicons name="volume-low-outline" size={18} color={colors.textSecondary} />
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={1}
            value={ambientVol}
            onValueChange={setAmbientVol}
            minimumTrackTintColor={colors.primary}
            maximumTrackTintColor={colors.border}
            thumbTintColor={colors.primary}
          />
          <Ionicons name="volume-high-outline" size={18} color={colors.textSecondary} />
        </View>
        <View style={styles.chipsWrap}>
          {ROOM_AMBIENCE.map((a) => (
            <TouchableOpacity
              key={a.id}
              style={[
                styles.chip,
                {
                  borderColor: room.ambience === a.id ? colors.primary : colors.glassBorder,
                  backgroundColor: room.ambience === a.id ? `${colors.primary}22` : colors.shimmer,
                },
              ]}
              onPress={async () => {
                const r = await updateRoomAmbience(roomId, a.id);
                if (!r.success) showMessage?.(r.error, 'error');
              }}
            >
              <Ionicons name={a.icon} size={16} color={colors.primary} style={{ marginRight: 6 }} />
              <Text style={[Typography.caption, { color: colors.text, fontWeight: '600' }]}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </GlassCard>

      <GlassCard style={styles.section}>
        <Text style={[Typography.h3, { color: colors.text, marginBottom: 10 }]}>Room theme</Text>
        <View style={styles.chipsWrap}>
          {ROOM_THEMES.map((t) => (
            <TouchableOpacity
              key={t.id}
              style={[
                styles.chip,
                {
                  borderColor: room.theme === t.id ? colors.primary : colors.glassBorder,
                  backgroundColor: room.theme === t.id ? `${colors.primary}22` : colors.shimmer,
                },
              ]}
              onPress={async () => {
                const r = await updateRoomTheme(roomId, t.id);
                if (!r.success) showMessage?.(r.error, 'error');
              }}
            >
              <Text style={[Typography.caption, { color: colors.text, fontWeight: '700' }]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </GlassCard>

      <GlassCard style={styles.section}>
        <Text style={[Typography.h3, { color: colors.text, marginBottom: 12 }]}>Shared checklist</Text>
        <View style={styles.addRow}>
          <TextInput
            value={newTask}
            onChangeText={setNewTask}
            placeholder="Add a hive task…"
            placeholderTextColor={colors.textTertiary}
            style={[styles.taskInput, { color: colors.text, borderColor: colors.glassBorder, backgroundColor: colors.shimmer }]}
          />
          <TouchableOpacity
            onPress={async () => {
              const r = await addRoomTask(roomId, newTask, userId);
              if (r.success) setNewTask('');
              else showMessage?.(r.error, 'error');
            }}
            style={[styles.addIcon, { backgroundColor: colors.primary }]}
          >
            <Ionicons name="add" size={26} color="#000" />
          </TouchableOpacity>
        </View>
        {tasks.map((task) => (
          <TouchableOpacity
            key={task.id}
            style={[styles.taskRow, { borderColor: colors.glassBorder, backgroundColor: colors.shimmer }]}
            onPress={async () => {
              const r = await toggleRoomTask(roomId, task.id, !task.completed);
              if (!r.success) showMessage?.(r.error, 'error');
            }}
          >
            <Ionicons name={task.completed ? 'checkbox' : 'square-outline'} size={22} color={task.completed ? colors.primary : colors.textSecondary} />
            <Text
              style={[
                Typography.body,
                {
                  color: task.completed ? colors.textSecondary : colors.text,
                  marginLeft: 12,
                  flex: 1,
                  textDecorationLine: task.completed ? 'line-through' : 'none',
                },
              ]}
            >
              {task.text}
            </Text>
          </TouchableOpacity>
        ))}
        <Text style={[Typography.caption, { color: colors.textSecondary, marginTop: 10 }]}>
          Progress {completedCount}/{tasks.length}
        </Text>
        <ProgressBar progress={taskProgress} height={8} />
      </GlassCard>

      <View style={styles.actionsRow}>
        <TouchableOpacity style={[styles.secondaryBtn, { borderColor: colors.primary }]} onPress={onCopyCode}>
          <Ionicons name="copy-outline" size={18} color={colors.primary} />
          <Text style={[Typography.caption, { color: colors.primary, marginLeft: 6, fontWeight: '700' }]}>Code</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.secondaryBtn, { borderColor: colors.primary }]} onPress={onInvite}>
          <Ionicons name="share-outline" size={18} color={colors.primary} />
          <Text style={[Typography.caption, { color: colors.primary, marginLeft: 6, fontWeight: '700' }]}>Invite</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.secondaryBtn, { borderColor: colors.danger }]} onPress={onLeave}>
          <Ionicons name="exit-outline" size={18} color={colors.danger} />
          <Text style={[Typography.caption, { color: colors.danger, marginLeft: 6, fontWeight: '700' }]}>Leave</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 32 }} />
      </ScrollView>
      <TouchableOpacity
        accessibilityLabel="Open hive canvas"
        onPress={() => setWbOpen(true)}
        style={[styles.fab, { backgroundColor: colors.primary, shadowColor: colors.primary }]}
        activeOpacity={0.9}
      >
        <Ionicons name="create-outline" size={26} color="#000" />
      </TouchableOpacity>
      <StudyRoomWhiteboardModal visible={wbOpen} onClose={() => setWbOpen(false)} roomId={roomId} userId={userId} />
    </View>
  );
}

/* ─── Screen ─── */
export default function StudyRoomDetailScreen({ route, navigation }) {
  const roomId = route.params?.roomId;
  const { colors, Typography } = useTheme();
  const forceDemo = route.params?.isDemo === true;
  const isDemoMode = forceDemo || MOCK_ROOM_IDS.has(roomId);
  const demoRoom = useMemo(() => (isDemoMode ? getStudyRoomById(roomId) : null), [isDemoMode, roomId]);

  if (!roomId) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <HexagonBackground />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[Typography.h2, { color: colors.text }]}>Study Room</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.emptyWrap}>
          <Text style={[Typography.body, { color: colors.textSecondary }]}>Missing room.</Text>
          <HoneyButton title="Go back" variant="secondary" onPress={() => navigation.goBack()} style={{ marginTop: 16 }} />
        </View>
      </SafeAreaView>
    );
  }

  if (isDemoMode && !demoRoom) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <HexagonBackground />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[Typography.h2, { color: colors.text }]}>Study Room</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.emptyWrap}>
          <Text style={[Typography.body, { color: colors.textSecondary }]}>Room not found.</Text>
          <HoneyButton title="Go back" variant="secondary" onPress={() => navigation.goBack()} style={{ marginTop: 16 }} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <HexagonBackground />
      {isDemoMode ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[Typography.h2, { color: colors.text, flex: 1, textAlign: 'center' }]} numberOfLines={1}>
              {demoRoom.title}
            </Text>
            <View style={{ width: 24 }} />
          </View>
          <DemoRoomBody room={demoRoom} navigation={navigation} />
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>
          <LiveRoomBody roomId={roomId} navigation={navigation} />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 24 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    marginBottom: 8,
  },
  backBtn: { padding: 4 },
  section: { marginBottom: 16 },
  heroImage: { width: '100%', height: 200, backgroundColor: '#111' },
  heroTint: { ...StyleSheet.absoluteFillObject },
  heroCaption: { padding: 16, borderTopWidth: StyleSheet.hairlineWidth },
  timerCenter: { alignItems: 'center', justifyContent: 'center', minHeight: 120, marginBottom: 8 },
  timerGlow: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.22,
    shadowRadius: 24,
    elevation: 6,
  },
  timerDigits: { fontSize: 56, fontWeight: '300', textAlign: 'center', marginBottom: 8 },
  timerControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 28 },
  playBtn: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  stopBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  quoteRow: { flexDirection: 'row', alignItems: 'flex-start' },
  onlineRow: { flexDirection: 'row', alignItems: 'center' },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  pill: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  durRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8, gap: 8 },
  durChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1 },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 12, borderWidth: 1 },
  addRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  taskInput: { flex: 1, borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, marginRight: 8, fontSize: 15 },
  addIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10, marginTop: 8 },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  iconBtn: { padding: 6 },
  fab: {
    position: 'absolute',
    right: 18,
    bottom: 28,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 40,
    elevation: 12,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  volRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  slider: { flex: 1, marginHorizontal: 10, height: 36 },
  signalRow: { flexDirection: 'row', marginBottom: 10 },
  miniChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    marginRight: 8,
    marginBottom: 8,
  },
  statusChips: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 },
});
