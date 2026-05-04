import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import HexagonBackground from '../components/HexagonBackground';
import { Ionicons } from '@expo/vector-icons';

export default function QuizScreen({ navigation }) {
  const { colors, Typography } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <HexagonBackground />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[Typography.h2, { color: colors.text }]}>Practice Quiz</Text>
        <View style={{ width: 24 }} />
      </View>
      <View style={styles.content}>
        <View style={[styles.iconCircle, { backgroundColor: `${colors.purpleAccent}1A` }]}>
          <Ionicons name="help-circle-outline" size={48} color={colors.purpleAccent} />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>Coming Soon</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          AI-generated quizzes tailored to your study topics and weak areas.
        </Text>
        <TouchableOpacity style={[styles.notifyBtn, { borderColor: colors.purpleAccent }]}>
          <Ionicons name="notifications-outline" size={16} color={colors.purpleAccent} />
          <Text style={[styles.notifyText, { color: colors.purpleAccent }]}>Notify Me</Text>
        </TouchableOpacity>
      </View>
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
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  notifyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    gap: 8,
  },
  notifyText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
