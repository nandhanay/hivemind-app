import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography } from '../theme/colors';
import HexagonBackground from '../components/HexagonBackground';
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

function LibraryItem({ item, onPress, isLast }) {
  return (
    <TouchableOpacity
      activeOpacity={0.88}
      style={[styles.libraryItem, !isLast && styles.libraryItemSpacing]}
      onPress={onPress}
    >
      <View style={styles.libraryItemLeft}>
        <View style={styles.iconWrap}>
          <Ionicons name={item.icon} size={20} color={Colors.text} />
        </View>

        <View style={styles.textWrap}>
          <Text style={styles.itemTitle}>{item.title}</Text>
          <Text style={styles.itemSubtitle}>{item.subtitle}</Text>
        </View>
      </View>

      <Ionicons name="chevron-forward" size={18} color={Colors.textSecondary} />
    </TouchableOpacity>
  );
}

export default function LibraryScreen({ navigation }) {
  const handlePress = (route) => {
    navigation.navigate(route);
  };

  return (
    <SafeAreaView style={styles.container}>
      <HexagonBackground />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerCard}>
          <Text style={styles.headerTitle}>Library</Text>
          <Text style={styles.headerSubtitle}>Your learning resources</Text>
        </View>

        <View style={styles.listContainer}>
          {libraryItems.map((item, index) => (
            <LibraryItem
              key={item.key}
              item={item}
              isLast={index === libraryItems.length - 1}
              onPress={() => handlePress(item.route)}
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
    backgroundColor: Colors.background,
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
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    marginBottom: 32,
  },
  headerTitle: {
    ...Typography.h1,
    color: Colors.text,
    marginBottom: 4,
  },
  headerSubtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  listContainer: {
    marginTop: 2,
  },
  libraryItem: {
    minHeight: 74,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: 'rgba(255,255,255,0.035)',
    borderWidth: 1,
    borderColor: 'rgba(251, 192, 45, 0.20)',
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
    backgroundColor: 'rgba(255,255,255,0.025)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    marginRight: 14,
  },
  textWrap: {
    flex: 1,
  },
  itemTitle: {
    ...Typography.h3,
    color: Colors.text,
    marginBottom: 2,
  },
  itemSubtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
});