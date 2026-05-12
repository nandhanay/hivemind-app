import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useUser } from '../context/UserContext';
import HexagonBackground from '../components/HexagonBackground';
import GlassCard from '../components/GlassCard';
import HoneyButton from '../components/HoneyButton';
import { Ionicons } from '@expo/vector-icons';
import { findRoomByCode, joinStudyRoomMember } from '../firebase/services/studyRoomService';
import { pushRecentStudyRoom } from '../utils/studyRoomsRecent';

export default function JoinRoomScreen({ navigation }) {
  const { colors, Typography } = useTheme();
  const { userId, userName, isGuest, showMessage } = useUser();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const normalize = (t) => t.replace(/\s/g, '').toUpperCase();

  const onJoin = async () => {
    if (isGuest || !userId) {
      showMessage?.('Sign in to join a live hive.', 'error');
      return;
    }
    const c = normalize(code);
    if (!/^HIVE-\d{4}$/.test(c)) {
      showMessage?.('Enter a code like HIVE-4821', 'error');
      return;
    }
    setLoading(true);
    const found = await findRoomByCode(c);
    if (!found.success) {
      setLoading(false);
      showMessage?.(found.error, 'error');
      return;
    }
    const { roomId, room } = found;
    const isQueen = room.creatorId === userId;
    const joinRes = await joinStudyRoomMember(roomId, userId, userName, isQueen);
    setLoading(false);
    if (!joinRes.success) {
      showMessage?.(joinRes.error || 'Could not join', 'error');
      return;
    }
    await pushRecentStudyRoom({
      id: roomId,
      roomName: room.roomName,
      roomCode: room.roomCode,
    });
    showMessage?.(`Joined ${room.roomName}`, 'success');
    navigation.replace('StudyRoomDetail', { roomId, isDemo: false });
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      <HexagonBackground />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[Typography.h2, { color: colors.text }]}>Join hive</Text>
        <View style={{ width: 24 }} />
      </View>

      <GlassCard style={styles.card}>
        <Text style={[Typography.body, { color: colors.textSecondary, marginBottom: 16 }]}>
          Paste the hive code from your friend or host. Format: HIVE-1234 (letters and numbers).
        </Text>
        <Text style={[Typography.h3, { color: colors.text, marginBottom: 8 }]}>Room code</Text>
        <TextInput
          value={code}
          onChangeText={(t) => setCode(t.toUpperCase())}
          autoCapitalize="characters"
          placeholder="HIVE-4821"
          placeholderTextColor={colors.textTertiary}
          style={[styles.input, { color: colors.text, borderColor: colors.glassBorder, backgroundColor: colors.shimmer }]}
        />
        <HoneyButton title={loading ? 'Landing…' : 'Join room'} icon="enter-outline" onPress={onJoin} disabled={loading} style={{ marginTop: 18 }} />
        {loading && <ActivityIndicator color={colors.primary} style={{ marginTop: 14 }} />}
      </GlassCard>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backBtn: { padding: 4 },
  card: { marginHorizontal: 20, marginTop: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 1,
  },
});
