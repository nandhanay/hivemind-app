import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, FlatList, Image, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography } from '../theme/colors';
import { useUser } from '../context/UserContext';
import GlassCard from '../components/GlassCard';
import HexagonBackground from '../components/HexagonBackground';
import HoneyButton from '../components/HoneyButton';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const FEATURE_CARD_WIDTH = Math.max(SCREEN_WIDTH - 48, 300);

const FEATURES = [
  { key: 'focus-timer', title: 'Focus Timer', subtitle: 'Stay locked in with deep work sessions.', icon: 'timer-outline' },
  { key: 'mood-recommendations', title: 'Mood-based recommendations', subtitle: 'Get personalized study guidance for your energy.', icon: 'sparkles-outline' },
  { key: 'progress-tracking', title: 'Progress tracking', subtitle: 'See streaks, consistency, and growth over time.', icon: 'analytics-outline' },
  { key: 'ambient-music', title: 'Ambient music for focus', subtitle: 'Tune out distractions with calm background audio.', icon: 'musical-notes-outline' },
];

const LOOP_MULTIPLIER = 12;
const LOOPED_FEATURES = Array.from({ length: LOOP_MULTIPLIER }).flatMap((_, loopIndex) =>
  FEATURES.map((item, featureIndex) => ({
    ...item,
    key: `${item.key}-${loopIndex}-${featureIndex}`,
    baseIndex: featureIndex,
  }))
);

export default function AuthLandingScreen({ navigation }) {
  const { enterGuestMode } = useUser();
  const listRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const [activeIndex, setActiveIndex] = useState(FEATURES.length * 3);
  const initialIndex = useMemo(() => FEATURES.length * 3, []);

  useEffect(() => {
    const list = listRef.current;
    if (list) {
      requestAnimationFrame(() => {
        list.scrollToOffset({ offset: initialIndex * SCREEN_WIDTH, animated: false });
      });
    }
  }, [initialIndex]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setActiveIndex((previous) => previous + 1);
    }, 3000);
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    list.scrollToOffset({ offset: activeIndex * SCREEN_WIDTH, animated: true });
    if (activeIndex >= LOOPED_FEATURES.length - FEATURES.length - 1) {
      const newIndex = FEATURES.length * 2;
      setTimeout(() => {
        list.scrollToOffset({ offset: newIndex * SCREEN_WIDTH, animated: false });
        setActiveIndex(newIndex);
      }, 400);
    }
  }, [activeIndex]);

  const renderFeature = ({ item, index }) => {
    const inputRange = [(index - 1) * SCREEN_WIDTH, index * SCREEN_WIDTH, (index + 1) * SCREEN_WIDTH];
    const cardOpacity = scrollX.interpolate({ inputRange, outputRange: [0.18, 0.34, 0.18], extrapolate: 'clamp' });
    const translateY = scrollX.interpolate({ inputRange, outputRange: [18, 0, 18], extrapolate: 'clamp' });
    const scale = scrollX.interpolate({ inputRange, outputRange: [0.94, 1, 0.94], extrapolate: 'clamp' });

    return (
      <View style={styles.slide}>
        <Animated.View style={[styles.featureCardWrapper, { opacity: cardOpacity, transform: [{ translateY }, { scale }] }]}>
          <View style={styles.featureGlow} />
          <GlassCard style={styles.featureCard} intensity={28}>
            <View style={styles.featureHeader}>
              <Ionicons name={item.icon} size={22} color={Colors.primary} />
              <Text style={styles.featureTitle}>{item.title}</Text>
            </View>
            <Text style={styles.featureSubtitle}>{item.subtitle}</Text>
          </GlassCard>
        </Animated.View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <HexagonBackground />
      <View style={styles.backgroundCarousel} pointerEvents="none">
        <Animated.FlatList ref={listRef} data={LOOPED_FEATURES} horizontal pagingEnabled bounces={false} keyExtractor={(item) => item.key} renderItem={renderFeature} showsHorizontalScrollIndicator={false} scrollEventThrottle={16} onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: true })} />
      </View>
      <View style={styles.overlay}>
        <View style={styles.centerContent}>
          <Image source={require('../assets/bee_mascot.png')} style={styles.beeIcon} />
          <LinearGradient colors={[Colors.primaryLight, Colors.primary, Colors.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.titleGradient}>
            <Text style={styles.title}>HiveMind</Text>
          </LinearGradient>
          <Text style={styles.tagline}>Your AI-powered focus companion</Text>
        </View>
        <View style={styles.bottomActions}>
          <HoneyButton title="Get Started" icon="arrow-forward" onPress={() => navigation.navigate('AuthScreen')} style={styles.primaryButton} />
          <HoneyButton title="Continue without login" icon="log-in-outline" variant="secondary" onPress={enterGuestMode} style={styles.secondaryButton} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  backgroundCarousel: { height: 180, marginTop: 40, justifyContent: 'center' },
  slide: { width: SCREEN_WIDTH, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  featureCardWrapper: { width: FEATURE_CARD_WIDTH },
  featureGlow: { position: 'absolute', top: 10, left: 12, right: 12, bottom: 10, borderRadius: 22, backgroundColor: 'rgba(251, 192, 45, 0.1)', shadowColor: Colors.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.18, shadowRadius: 18, elevation: 4 },
  featureCard: { padding: 18, borderRadius: 20, backgroundColor: 'rgba(26, 26, 26, 0.42)', borderColor: 'rgba(251, 192, 45, 0.2)', borderWidth: 1 },
  featureHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  featureTitle: { ...Typography.h3, color: Colors.primaryLight, flex: 1 },
  featureSubtitle: { ...Typography.body, color: 'rgba(255, 255, 255, 0.72)', lineHeight: 22 },
  overlay: { flex: 1, zIndex: 2, justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 36, paddingBottom: 28 },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  beeIcon: { width: 132, height: 132, resizeMode: 'contain', marginBottom: 18, borderWidth: 2, borderColor: 'rgba(251, 192, 45, 0.6)', borderRadius: 66 },
  titleGradient: { borderRadius: 14, paddingVertical: 6, paddingHorizontal: 16, marginBottom: 10 },
  title: { ...Typography.h1, color: '#140f05', letterSpacing: 0.6 },
  tagline: { ...Typography.body, textAlign: 'center' },
  bottomActions: { gap: 14, marginBottom: 8 },
  primaryButton: { shadowOpacity: 0.42, shadowRadius: 14, elevation: 9 },
  secondaryButton: { backgroundColor: 'rgba(26, 26, 26, 0.78)', borderColor: 'rgba(251, 192, 45, 0.5)', shadowOpacity: 0.25, shadowRadius: 10 },
});
