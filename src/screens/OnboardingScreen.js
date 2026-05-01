import React from 'react';
import { View, Text, StyleSheet, Image, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography } from '../theme/colors';
import HoneyButton from '../components/HoneyButton';
import HexagonBackground from '../components/HexagonBackground';

export default function OnboardingScreen({ navigation }) {
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
            style={styles.logoImage}
          />
          <Text style={styles.title}>Hive Mind</Text>
          <Text style={styles.subtitle}>Your AI-powered study companion</Text>
        </View>

        <View style={styles.features}>
          <View style={styles.featureRow}>
            <Text style={styles.iconText}>🔥</Text>
            <Text style={styles.featureText}>Build daily study streaks</Text>
          </View>
          <View style={styles.featureRow}>
            <Text style={styles.iconText}>🐝</Text>
            <Text style={styles.featureText}>Ask Honey anything</Text>
          </View>
          <View style={styles.featureRow}>
            <Text style={styles.iconText}>🧠</Text>
            <Text style={styles.featureText}>Master weak topics</Text>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    height: '100%',
    backgroundColor: Colors.background,
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
    borderRadius: 70, // In case it's not perfectly transparent
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  title: {
    ...Typography.h1,
    color: Colors.primary,
    marginTop: 20,
  },
  subtitle: {
    ...Typography.body,
    marginTop: 10,
    textAlign: 'center',
  },
  features: {
    marginTop: 40,
    gap: 20,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  iconText: {
    fontSize: 28,
  },
  featureText: {
    ...Typography.h3,
    marginLeft: 16,
  },
  actionContainer: {
    marginBottom: 40,
  }
});
