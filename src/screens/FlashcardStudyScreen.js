import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useUser } from '../context/UserContext';
import HexagonBackground from '../components/HexagonBackground';
import GlassCard from '../components/GlassCard';
import ConfidenceSelector from '../components/ConfidenceSelector';
import ProgressBar from '../components/ProgressBar';
import { getDueFlashcards, getFlashcards, reviewFlashcard } from '../firebase/services/flashcardService';
import { detectWeakTopicFromFlashcard } from '../firebase/services/weakTopicService';

export default function FlashcardStudyScreen({ navigation, route }) {
  const { colors, Typography } = useTheme();
  const { userId, showMessage } = useUser();

  const [cards, setCards] = useState([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [confidence, setConfidence] = useState(0);
  const [finished, setFinished] = useState(false);
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState([]);

  const flipAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    (async () => {
      setLoading(true);
      let data;
      if (route.params?.topic) {
        const all = await getFlashcards(userId);
        data = all.filter((c) => c.topic?.toLowerCase() === route.params.topic.toLowerCase());
      } else if (route.params?.subject) {
        const all = await getFlashcards(userId);
        data = all.filter((c) => c.subject?.toLowerCase() === route.params.subject.toLowerCase());
      } else {
        data = await getDueFlashcards(userId);
        if (data.length === 0) data = await getFlashcards(userId);
      }
      // Shuffle
      data.sort(() => Math.random() - 0.5);
      setCards(data.slice(0, 20)); // Max 20 per session
      setLoading(false);
    })();
  }, [userId, route.params?.topic, route.params?.subject]);

  const currentCard = cards[index];

  const handleFlip = useCallback(() => {
    Animated.timing(flipAnim, {
      toValue: flipped ? 0 : 1,
      duration: 300,
      easing: Easing.ease,
      useNativeDriver: true,
    }).start();
    setFlipped(!flipped);
  }, [flipped, flipAnim]);

  const handleNext = async () => {
    if (confidence === 0) return;

    // Save review
    if (currentCard) {
      await reviewFlashcard(userId, currentCard.id, confidence);
      // Auto-detect weak topic if difficulty is low
      if (confidence <= 2 && currentCard.topic) {
        await detectWeakTopicFromFlashcard(userId, currentCard);
      }
      setResults([...results, { cardId: currentCard.id, confidence }]);
    }

    if (index + 1 >= cards.length) {
      setFinished(true);
      return;
    }

    setIndex(index + 1);
    setFlipped(false);
    setConfidence(0);
    flipAnim.setValue(0);
  };

  const frontInterpolate = flipAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  const backInterpolate = flipAnim.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '360deg'] });

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <HexagonBackground />
        <View style={styles.center}>
          <Text style={[Typography.body, { color: colors.textSecondary }]}>Loading cards...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (cards.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <HexagonBackground />
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.center}>
          <Text style={[Typography.h3, { color: colors.text }]}>No cards to study</Text>
          <Text style={[Typography.body, { color: colors.textSecondary, marginTop: 8, textAlign: 'center' }]}>
            All caught up! Create more flashcards or come back later.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (finished) {
    const avgConf = results.length > 0 ? (results.reduce((s, r) => s + r.confidence, 0) / results.length).toFixed(1) : 0;
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <HexagonBackground />
        <View style={styles.center}>
          <Text style={{ fontSize: 48, marginBottom: 16 }}>🎉</Text>
          <Text style={[Typography.h2, { color: colors.text, marginBottom: 8 }]}>Session Complete!</Text>
          <Text style={[Typography.body, { color: colors.textSecondary, marginBottom: 24, textAlign: 'center' }]}>
            Reviewed {results.length} card{results.length !== 1 ? 's' : ''} · Avg confidence: {avgConf}/5
          </Text>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[styles.doneBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <HexagonBackground />

      {/* Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[Typography.body, { color: colors.textSecondary }]}>
          {index + 1} / {cards.length}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ProgressBar progress={(index + 1) / cards.length} height={4} />

      {/* Card */}
      <View style={styles.cardArea}>
        <TouchableOpacity activeOpacity={0.9} onPress={handleFlip} style={styles.cardTouch}>
          {/* Front */}
          <Animated.View
            style={[
              styles.card,
              { backgroundColor: colors.shimmer, borderColor: `${colors.primary}33`, transform: [{ rotateY: frontInterpolate }] },
            ]}
          >
            <Text style={[styles.cardLabel, { color: colors.textTertiary }]}>QUESTION</Text>
            <Text style={[styles.cardText, { color: colors.text }]}>{currentCard?.question}</Text>
            <Text style={[styles.tapHint, { color: colors.textTertiary }]}>Tap to flip</Text>
          </Animated.View>

          {/* Back */}
          <Animated.View
            style={[
              styles.card, styles.cardBack,
              { backgroundColor: `${colors.primary}0D`, borderColor: `${colors.primary}44`, transform: [{ rotateY: backInterpolate }] },
            ]}
          >
            <Text style={[styles.cardLabel, { color: colors.primary }]}>ANSWER</Text>
            <Text style={[styles.cardText, { color: colors.text }]}>{currentCard?.answer}</Text>
            {currentCard?.explanation ? (
              <Text style={[styles.explanation, { color: colors.textSecondary }]}>{currentCard.explanation}</Text>
            ) : null}
          </Animated.View>
        </TouchableOpacity>
      </View>

      {/* Confidence + Next */}
      {flipped && (
        <View style={styles.bottomSection}>
          <ConfidenceSelector value={confidence} onChange={setConfidence} />
          <TouchableOpacity
            onPress={handleNext}
            disabled={confidence === 0}
            style={[
              styles.nextBtn,
              { backgroundColor: confidence > 0 ? colors.primary : colors.shimmer },
            ]}
          >
            <Text style={[styles.nextBtnText, { color: confidence > 0 ? '#000' : colors.textTertiary }]}>
              {index + 1 >= cards.length ? 'Finish' : 'Next Card'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  headerRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
  },
  cardArea: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  cardTouch: { width: '100%', height: 280 },
  card: {
    position: 'absolute', width: '100%', height: '100%',
    borderRadius: 20, borderWidth: 1.5, padding: 28,
    justifyContent: 'center', alignItems: 'center',
    backfaceVisibility: 'hidden',
  },
  cardBack: { position: 'absolute', top: 0, left: 0 },
  cardLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 2, marginBottom: 16 },
  cardText: { fontSize: 20, fontWeight: '600', textAlign: 'center', lineHeight: 30 },
  explanation: { fontSize: 14, marginTop: 16, textAlign: 'center', lineHeight: 20, fontStyle: 'italic' },
  tapHint: { position: 'absolute', bottom: 20, fontSize: 12 },
  bottomSection: { paddingHorizontal: 20, paddingBottom: 24 },
  nextBtn: { paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginTop: 8 },
  nextBtnText: { fontSize: 16, fontWeight: '700' },
  doneBtn: { paddingHorizontal: 40, paddingVertical: 16, borderRadius: 14 },
  doneBtnText: { fontSize: 16, fontWeight: '700', color: '#000' },
});
