import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography } from '../theme/colors';
import HoneyButton from '../components/HoneyButton';
import GlassCard from '../components/GlassCard';
import { Ionicons } from '@expo/vector-icons';

export default function CreatePlanScreen({ navigation }) {
  const [subject, setSubject] = useState('');

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Ionicons name="arrow-back" size={28} color={Colors.text} onPress={() => navigation.goBack()} />
          <Text style={styles.headerTitle}>Create Today's Plan</Text>
          <View style={{ width: 28 }} />
        </View>

        <GlassCard style={styles.card}>
          <Text style={Typography.h3}>What are we studying today?</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="book" size={20} color={Colors.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="E.g. Biology, Math, History..."
              placeholderTextColor={Colors.textSecondary}
              value={subject}
              onChangeText={setSubject}
            />
          </View>
        </GlassCard>

        <View style={styles.modesContainer}>
          <Text style={[Typography.h2, { marginBottom: 16 }]}>Quick Start</Text>
          <View style={styles.modeRow}>
            <GlassCard style={[styles.modeCard, { borderColor: Colors.primary }]}>
              <Ionicons name="school" size={32} color={Colors.primary} />
              <Text style={[Typography.h3, { marginTop: 12 }]}>Exam Prep</Text>
              <Text style={[Typography.caption, { marginTop: 4 }]}>Intense focus mode</Text>
            </GlassCard>
            <GlassCard style={styles.modeCard}>
              <Ionicons name="refresh-circle" size={32} color={Colors.blueAccent} />
              <Text style={[Typography.h3, { marginTop: 12 }]}>Revision</Text>
              <Text style={[Typography.caption, { marginTop: 4 }]}>Active recall & flashcards</Text>
            </GlassCard>
          </View>
        </View>

      </ScrollView>
      <View style={styles.footer}>
        <HoneyButton title="Generate Plan with Honey" icon="sparkles" onPress={() => navigation.goBack()} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
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
  headerTitle: {
    ...Typography.h2,
  },
  card: {
    marginBottom: 24,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceHighlight,
    borderRadius: 12,
    marginTop: 16,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    color: Colors.text,
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
    borderTopColor: Colors.border,
    backgroundColor: Colors.surface,
  }
});
