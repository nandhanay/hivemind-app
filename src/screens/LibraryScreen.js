import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography } from '../theme/colors';
import GlassCard from '../components/GlassCard';
import { Ionicons } from '@expo/vector-icons';

export default function LibraryScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={Typography.h1}>Library</Text>
        </View>

        <View style={styles.grid}>
          <TouchableOpacity style={styles.gridItem}>
            <GlassCard style={styles.card}>
              <Ionicons name="document-text" size={32} color={Colors.blueAccent} />
              <Text style={[Typography.h3, styles.cardTitle]}>Notes</Text>
              <Text style={Typography.caption}>24 items</Text>
            </GlassCard>
          </TouchableOpacity>

          <TouchableOpacity style={styles.gridItem}>
            <GlassCard style={styles.card}>
              <Ionicons name="copy" size={32} color={Colors.primary} />
              <Text style={[Typography.h3, styles.cardTitle]}>Flashcards</Text>
              <Text style={Typography.caption}>8 decks</Text>
            </GlassCard>
          </TouchableOpacity>

          <TouchableOpacity style={styles.gridItem}>
            <GlassCard style={styles.card}>
              <Ionicons name="help-circle" size={32} color={Colors.greenAccent} />
              <Text style={[Typography.h3, styles.cardTitle]}>Practice Quizzes</Text>
              <Text style={Typography.caption}>New available!</Text>
            </GlassCard>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    marginBottom: 24,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  gridItem: {
    width: '47%',
  },
  card: {
    padding: 20,
    alignItems: 'center',
    height: 140,
    justifyContent: 'center',
  },
  cardTitle: {
    marginTop: 12,
    marginBottom: 4,
  }
});
