import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import HoneyButton from '../components/HoneyButton';
import GlassCard from '../components/GlassCard';
import HexagonBackground from '../components/HexagonBackground';
import { Ionicons } from '@expo/vector-icons';

export default function CreatePlanScreen({ navigation }) {
  const { colors, Typography } = useTheme();
  const styles = getStyles(colors, Typography);
  const [subject, setSubject] = useState('');

  return (
    <SafeAreaView style={styles.container}>
      <HexagonBackground />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Ionicons name="arrow-back" size={28} color={colors.text} onPress={() => navigation.goBack()} />
          <Text style={[Typography.h2, { color: colors.text }]}>Create Today's Plan</Text>
          <View style={{ width: 28 }} />
        </View>

        <GlassCard style={styles.card}>
          <Text style={[Typography.h3, { color: colors.text }]}>What are we studying today?</Text>
          <View style={[styles.inputContainer, { backgroundColor: colors.surfaceHighlight, borderColor: colors.border }]}>
            <Ionicons name="book" size={20} color={colors.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="E.g. Biology, Math, History..."
              placeholderTextColor={colors.textSecondary}
              value={subject}
              onChangeText={setSubject}
            />
          </View>
        </GlassCard>

        <View style={styles.modesContainer}>
          <Text style={[Typography.h2, { color: colors.text, marginBottom: 16 }]}>Quick Start</Text>
          <View style={styles.modeRow}>
            <GlassCard style={[styles.modeCard, { borderColor: colors.primary }]}>
              <Ionicons name="school" size={32} color={colors.primary} />
              <Text style={[Typography.h3, { color: colors.text, marginTop: 12 }]}>Exam Prep</Text>
              <Text style={[Typography.caption, { marginTop: 4 }]}>Intense focus mode</Text>
            </GlassCard>
            <GlassCard style={styles.modeCard}>
              <Ionicons name="refresh-circle" size={32} color={colors.blueAccent} />
              <Text style={[Typography.h3, { color: colors.text, marginTop: 12 }]}>Revision</Text>
              <Text style={[Typography.caption, { marginTop: 4 }]}>Active recall & flashcards</Text>
            </GlassCard>
          </View>
        </View>
      </ScrollView>
      <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.surface }]}>
        <HoneyButton title="Generate Plan with Honey" icon="sparkles" onPress={() => navigation.goBack()} />
      </View>
    </SafeAreaView>
  );
}

const getStyles = (colors, Typography) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  card: {
    marginBottom: 24,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    marginTop: 16,
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    ...Typography.body,
  },
  modesContainer: {
    marginTop: 10,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 16,
  },
  modeCard: {
    flex: 1,
    alignItems: 'center',
    padding: 20,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
  },
});
