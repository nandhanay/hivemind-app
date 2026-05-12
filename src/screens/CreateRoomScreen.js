import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useUser } from '../context/UserContext';
import HexagonBackground from '../components/HexagonBackground';
import GlassCard from '../components/GlassCard';
import HoneyButton from '../components/HoneyButton';
import { Ionicons } from '@expo/vector-icons';
import { ROOM_THEMES, ROOM_AMBIENCE } from '../constants/studyRoomPresets';
import { createStudyRoom } from '../firebase/services/studyRoomService';

export default function CreateRoomScreen({ navigation }) {
  const { colors, Typography } = useTheme();
  const { userId, userName, isGuest, showMessage } = useUser();

  const [roomName, setRoomName] = useState('');
  const [theme, setTheme] = useState(ROOM_THEMES[0].id);
  const [ambience, setAmbience] = useState(ROOM_AMBIENCE[0].id);
  const [isPublic, setIsPublic] = useState(true);
  const [focusGoal, setFocusGoal] = useState('');
  const [loading, setLoading] = useState(false);

  const onCreate = async () => {
    if (isGuest || !userId) {
      showMessage?.('Sign in to create a live hive room.', 'error');
      return;
    }
    setLoading(true);
    const res = await createStudyRoom({
      creatorId: userId,
      creatorName: userName,
      roomName: roomName || 'My Study Hive',
      theme,
      ambience,
      isPublic,
      focusGoal,
    });
    setLoading(false);
    if (!res.success) {
      showMessage?.(res.error || 'Could not create room', 'error');
      return;
    }
    showMessage?.(`Hive ready! Code ${res.roomCode}`, 'success');
    navigation.replace('StudyRoomDetail', { roomId: res.roomId, isDemo: false });
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      <HexagonBackground />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[Typography.h2, { color: colors.text }]}>Create hive</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <GlassCard style={styles.card}>
          <Text style={[Typography.caption, { color: colors.textSecondary, marginBottom: 8 }]}>
            You’ll be Queen Bee — crown & hive glow for you.
          </Text>
          <Text style={[Typography.h3, { color: colors.text, marginBottom: 10 }]}>Room name</Text>
          <TextInput
            value={roomName}
            onChangeText={setRoomName}
            placeholder="e.g. Finals crunch hive"
            placeholderTextColor={colors.textTertiary}
            style={[styles.input, { color: colors.text, borderColor: colors.glassBorder, backgroundColor: colors.shimmer }]}
          />
        </GlassCard>

        <GlassCard style={styles.card}>
          <Text style={[Typography.h3, { color: colors.text, marginBottom: 12 }]}>Room theme</Text>
          <View style={styles.chips}>
            {ROOM_THEMES.map((t) => (
              <TouchableOpacity
                key={t.id}
                onPress={() => setTheme(t.id)}
                style={[
                  styles.chip,
                  {
                    borderColor: theme === t.id ? colors.primary : colors.glassBorder,
                    backgroundColor: theme === t.id ? `${colors.primary}22` : colors.shimmer,
                  },
                ]}
              >
                <Text style={[Typography.caption, { color: colors.text, fontWeight: '700' }]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </GlassCard>

        <GlassCard style={styles.card}>
          <Text style={[Typography.h3, { color: colors.text, marginBottom: 12 }]}>Ambience</Text>
          <View style={styles.chips}>
            {ROOM_AMBIENCE.map((a) => (
              <TouchableOpacity
                key={a.id}
                onPress={() => setAmbience(a.id)}
                style={[
                  styles.chip,
                  {
                    borderColor: ambience === a.id ? colors.primary : colors.glassBorder,
                    backgroundColor: ambience === a.id ? `${colors.primary}22` : colors.shimmer,
                  },
                ]}
              >
                <Ionicons name={a.icon} size={16} color={colors.primary} style={{ marginRight: 6 }} />
                <Text style={[Typography.caption, { color: colors.text, fontWeight: '600' }]}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </GlassCard>

        <GlassCard style={styles.card}>
          <View style={styles.rowBetween}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={[Typography.h3, { color: colors.text }]}>Public hive</Text>
              <Text style={[Typography.caption, { color: colors.textSecondary, marginTop: 4 }]}>
                Listed in Explore so others can buzz in.
              </Text>
            </View>
            <Switch value={isPublic} onValueChange={setIsPublic} trackColor={{ false: colors.border, true: `${colors.primary}88` }} thumbColor={isPublic ? colors.primary : colors.textSecondary} />
          </View>
        </GlassCard>

        <GlassCard style={styles.card}>
          <Text style={[Typography.h3, { color: colors.text, marginBottom: 10 }]}>Focus goal (optional)</Text>
          <TextInput
            value={focusGoal}
            onChangeText={setFocusGoal}
            placeholder="What is this hive chasing today?"
            placeholderTextColor={colors.textTertiary}
            multiline
            style={[styles.input, styles.multiline, { color: colors.text, borderColor: colors.glassBorder, backgroundColor: colors.shimmer }]}
          />
        </GlassCard>

        <HoneyButton
          title={loading ? 'Spawning hive…' : 'Create room'}
          icon="add-circle-outline"
          onPress={onCreate}
          disabled={loading}
          style={styles.cta}
        />
        {loading && <ActivityIndicator color={colors.primary} style={{ marginTop: 12 }} />}
      </ScrollView>
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
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  card: { marginBottom: 14 },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  multiline: { minHeight: 88, textAlignVertical: 'top' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 4,
  },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cta: { marginTop: 8 },
});
