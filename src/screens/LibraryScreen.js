import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import HexagonBackground from '../components/HexagonBackground';
import GlassCard from '../components/GlassCard';
import { Ionicons } from '@expo/vector-icons';

const libraryItems = [
  {
    key: 'notes',
    title: 'Notes',
    subtitle: '12 notes',
    icon: 'document-text-outline',
    route: 'Notes',
  },
  {
    key: 'flashcards',
    title: 'Flashcards',
    subtitle: '30 cards',
    icon: 'layers-outline',
    route: 'Flashcards',
  },
  {
    key: 'quizzes',
    title: 'Quizzes',
    subtitle: '5 quizzes',
    icon: 'checkbox-outline',
    route: 'Quiz',
  },
  {
    key: 'weak-topics',
    title: 'Weak Topics / Revision',
    subtitle: '7 topics',
    icon: 'alert-circle-outline',
    route: 'WeakTopics',
  },
];

function LibraryItem({ item, onPress, isLast, colors, Typography }) {
  return (
    <TouchableOpacity
      activeOpacity={0.88}
      style={[
        styles.libraryItem,
        {
          backgroundColor: colors.shimmer,
          borderColor: `${colors.primary}33`,
        },
        !isLast && styles.libraryItemSpacing,
      ]}
      onPress={onPress}
    >
      <View style={styles.libraryItemLeft}>
        <View style={[styles.iconWrap, { backgroundColor: colors.shimmer, borderColor: colors.glassBorder }]}>
          <Ionicons name={item.icon} size={20} color={colors.text} />
        </View>

        <View style={styles.textWrap}>
          <Text style={[Typography.h3, { color: colors.text, marginBottom: 2 }]}>{item.title}</Text>
          <Text style={[Typography.caption, { color: colors.textSecondary }]}>{item.subtitle}</Text>
        </View>
      </View>

      <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
    </TouchableOpacity>
  );
}

export default function LibraryScreen({ navigation }) {
  const { colors, Typography } = useTheme();

  const handlePress = (route) => {
    navigation.navigate(route);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <HexagonBackground />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.headerCard, { backgroundColor: colors.shimmer, borderColor: colors.glassBorder }]}>
          <Text style={[Typography.h1, { color: colors.text, marginBottom: 4 }]}>Library</Text>
          <Text style={[Typography.body, { color: colors.textSecondary }]}>Your learning resources</Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.88}
          style={styles.studyRoomsCardWrap}
          onPress={() => navigation.navigate('StudyRooms')}
        >
          <GlassCard>
            <View style={styles.studyRoomsRow}>
              <View style={styles.libraryItemLeft}>
                <View style={[styles.iconWrap, { backgroundColor: colors.shimmer, borderColor: colors.glassBorder }]}>
                  <Ionicons name="people-outline" size={22} color={colors.text} />
                </View>
                <View style={styles.textWrap}>
                  <Text style={[Typography.h3, { color: colors.text, marginBottom: 2 }]}>Study Rooms</Text>
                  <Text style={[Typography.caption, { color: colors.textSecondary }]}>
                    Live collaborative hives — shared timers, tasks, and ambience with friends.
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </View>
          </GlassCard>
        </TouchableOpacity>

        <View style={styles.listContainer}>
          {libraryItems.map((item, index) => (
            <LibraryItem
              key={item.key}
              item={item}
              isLast={index === libraryItems.length - 1}
              onPress={() => handlePress(item.route)}
              colors={colors}
              Typography={Typography}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 32,
  },
  headerCard: {
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 20,
    borderWidth: 1,
    marginBottom: 18,
  },
  studyRoomsCardWrap: {
    marginBottom: 24,
  },
  studyRoomsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  listContainer: {
    marginTop: 2,
  },
  libraryItem: {
    minHeight: 74,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  libraryItemSpacing: {
    marginBottom: 14,
  },
  libraryItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginRight: 14,
  },
  textWrap: {
    flex: 1,
  },
});