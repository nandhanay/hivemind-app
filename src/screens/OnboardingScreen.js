import React from 'react';
import { View, Text, StyleSheet, Image, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import HoneyButton from '../components/HoneyButton';
import HexagonBackground from '../components/HexagonBackground';

export default function OnboardingScreen({ navigation }) {
  const { colors, Typography } = useTheme();
  const styles = getStyles(colors, Typography);

  return (
    <SafeAreaView style={styles.container}>
      <HexagonBackground />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.logoContainer}>
          <Image
            source={require("../assets/bee_mascot.png")}
            style={[styles.logoImage, { borderColor: colors.primary }]}
          />
          <Text style={[styles.title, { color: colors.primary }]}>Hive Mind</Text>
          <Text style={[Typography.body, { marginTop: 10, textAlign: 'center' }]}>
            Your AI-powered study companion
          </Text>
        </View>

        <View style={styles.features}>
          <View style={[styles.featureRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={styles.iconText}>🔥</Text>
            <Text style={[Typography.h3, { marginLeft: 16 }]}>Build daily study streaks</Text>
          </View>
          <View style={[styles.featureRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={styles.iconText}>🐝</Text>
            <Text style={[Typography.h3, { marginLeft: 16 }]}>Ask Honey anything</Text>
          </View>
          <View style={[styles.featureRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={styles.iconText}>🧠</Text>
            <Text style={[Typography.h3, { marginLeft: 16 }]}>Master weak topics</Text>
          </View>
        </View>

        <View style={styles.actionContainer}>
          <HoneyButton
            title="Get Started"
            onPress={() => navigation.navigate("MainTabs")}
            icon="arrow-forward"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (colors, Typography) => StyleSheet.create({
  container: {
    flex: 1,
    height: '100%',
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingBottom: 60,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 60,
  },
  logoImage: {
    width: 140,
    height: 140,
    resizeMode: 'contain',
    borderRadius: 70,
    borderWidth: 2,
  },
  title: {
    ...Typography.h1,
    marginTop: 20,
  },
  features: {
    marginTop: 40,
    gap: 20,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  iconText: {
    fontSize: 28,
  },
  actionContainer: {
    marginBottom: 40,
  },
});
