import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Animated, Easing } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Defs, LinearGradient, Stop, G } from 'react-native-svg';
import { useTheme } from '../theme/ThemeContext';
import { useUser } from '../context/UserContext';
import HexagonBackground from '../components/HexagonBackground';
import SessionCompleteModal from '../components/SessionCompleteModal';
import { addSession } from '../firebase/services/sessionService';

const TIMER_SIZE = 260;
const STROKE_WIDTH = 12;
const RADIUS = (TIMER_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function FocusTimerScreen({ navigation }) {
  const { colors, Typography } = useTheme();
  const { userId } = useUser();
  const styles = getStyles(colors, Typography);

  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState('pomodoro');
  const [focusInput, setFocusInput] = useState('25');
  const [breakInput, setBreakInput] = useState('5');
  const [sessionType, setSessionType] = useState('focus');
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [showComplete, setShowComplete] = useState(false);
  const [completedDuration, setCompletedDuration] = useState(0);
  const [saving, setSaving] = useState(false);

  const progressAnim = useRef(new Animated.Value(1)).current;
  const AnimatedCircle = Animated.createAnimatedComponent(Circle);

  const focusMinutes = parseInt(focusInput || '0', 10) || 0;
  const breakMinutes = parseInt(breakInput || '0', 10) || 0;

  const currentDuration = useMemo(() => {
    return sessionType === 'focus' ? focusMinutes * 60 : breakMinutes * 60;
  }, [sessionType, focusMinutes, breakMinutes]);

  useEffect(() => {
    let interval = null;

    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((time) => time - 1);
      }, 1000);
    } else if (timeLeft === 0 && isActive) {
      setIsActive(false);
      if (sessionType === 'focus') {
        // Focus session completed — show modal
        setCompletedDuration(focusMinutes * 60);
        setShowComplete(true);

        if (breakMinutes > 0) {
          // Break will start after modal is dismissed
        }
      } else {
        // Break completed
        setCompletedDuration(breakMinutes * 60);
        setShowComplete(true);
      }
    }

    return () => clearInterval(interval);
  }, [isActive, timeLeft, sessionType, breakMinutes, focusMinutes]);

  useEffect(() => {
    const progress = currentDuration > 0 ? timeLeft / currentDuration : 0;
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 300,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();
  }, [timeLeft, currentDuration, progressAnim]);

  const animatedStrokeDashoffset = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [CIRCUMFERENCE, 0],
  });

  const applyMode = useCallback((selectedMode) => {
    setIsActive(false);
    setSessionType('focus');
    setMode(selectedMode);

    if (selectedMode === 'focus') {
      setFocusInput('15');
      setBreakInput('0');
      setTimeLeft(15 * 60);
    } else if (selectedMode === 'pomodoro') {
      setFocusInput('25');
      setBreakInput('5');
      setTimeLeft(25 * 60);
    } else if (selectedMode === 'long') {
      setFocusInput('50');
      setBreakInput('10');
      setTimeLeft(50 * 60);
    } else if (selectedMode === 'custom') {
      setTimeLeft((parseInt(focusInput || '25', 10) || 25) * 60);
    }

    progressAnim.setValue(1);
  }, [focusInput, progressAnim]);

  const handleCustomFocus = (text) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    setMode('custom');
    setFocusInput(cleaned);
    setIsActive(false);
    setSessionType('focus');
    setTimeLeft((parseInt(cleaned || '0', 10) || 0) * 60);
    progressAnim.setValue(1);
  };

  const handleCustomBreak = (text) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    setMode('custom');
    setBreakInput(cleaned);
    setIsActive(false);
  };

  const toggleTimer = () => setIsActive(!isActive);

  const resetTimer = () => {
    setIsActive(false);
    setSessionType('focus');
    setTimeLeft(focusMinutes * 60);
    progressAnim.setValue(1);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSaveSession = async () => {
    setSaving(true);
    try {
      await addSession(userId, {
        duration: completedDuration,
        mode,
        subject: 'Study Session',
      });
    } catch (err) {
      console.error('Error saving session:', err);
    } finally {
      setSaving(false);
      setShowComplete(false);

      // Start break if available
      if (sessionType === 'focus' && breakMinutes > 0) {
        setSessionType('break');
        setTimeLeft(breakMinutes * 60);
        progressAnim.setValue(1);
      } else {
        resetTimer();
      }
    }
  };

  const handleDismissComplete = () => {
    setShowComplete(false);
    if (sessionType === 'focus' && breakMinutes > 0) {
      setSessionType('break');
      setTimeLeft(breakMinutes * 60);
      progressAnim.setValue(1);
    } else {
      resetTimer();
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <HexagonBackground />
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.topBar}>
          <Text style={styles.topBarTitle}>Focus Session</Text>
        </View>

        <Text style={styles.focusingOn}>Focusing on</Text>
        <Text style={[styles.subjectTitle, { color: colors.primary }]}>Study Session</Text>

        <View style={styles.modeSelector}>
          {[
            { key: 'focus', label: 'Focus' },
            { key: 'pomodoro', label: 'Pomodoro' },
            { key: 'long', label: 'Long Focus' },
            { key: 'custom', label: 'Custom' },
          ].map((m) => (
            <TouchableOpacity
              key={m.key}
              style={[
                styles.modeChip,
                mode === m.key && [styles.modeChipActive, { borderColor: colors.primary, backgroundColor: `${colors.primary}24` }],
              ]}
              onPress={() => m.key === 'custom' ? setMode('custom') : applyMode(m.key)}
            >
              <Text style={[styles.modeChipText, mode === m.key && { color: colors.primary }]}>
                {m.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {mode === 'custom' && (
          <View style={styles.customRow}>
            <TextInput
              value={focusInput}
              onChangeText={handleCustomFocus}
              placeholder="Focus"
              placeholderTextColor={colors.textSecondary}
              keyboardType="numeric"
              style={[styles.customInput, { color: colors.text }]}
            />
            <TextInput
              value={breakInput}
              onChangeText={handleCustomBreak}
              placeholder="Break"
              placeholderTextColor={colors.textSecondary}
              keyboardType="numeric"
              style={[styles.customInput, { color: colors.text }]}
            />
          </View>
        )}

        <View style={styles.timerWrapper}>
          <View style={[styles.timerGlow, { shadowColor: colors.primary }]} />

          <Svg width={TIMER_SIZE} height={TIMER_SIZE} style={styles.timerSvg}>
            <Defs>
              <LinearGradient id="timerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor={colors.primary} />
                <Stop offset="0.65" stopColor="#F0B94A" />
                <Stop offset="1" stopColor="#FFD36B" />
              </LinearGradient>
            </Defs>

            <G rotation="-90" origin={`${TIMER_SIZE / 2}, ${TIMER_SIZE / 2}`}>
              <Circle
                cx={TIMER_SIZE / 2}
                cy={TIMER_SIZE / 2}
                r={RADIUS}
                stroke={colors.shimmer}
                strokeWidth={STROKE_WIDTH}
                fill="none"
              />
              <AnimatedCircle
                cx={TIMER_SIZE / 2}
                cy={TIMER_SIZE / 2}
                r={RADIUS}
                stroke="url(#timerGradient)"
                strokeWidth={STROKE_WIDTH}
                strokeLinecap="round"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={animatedStrokeDashoffset}
                fill="none"
              />
            </G>

            <Circle
              cx={TIMER_SIZE / 2}
              cy={TIMER_SIZE / 2}
              r={RADIUS - 18}
              fill={colors.background}
              stroke={colors.shimmer}
              strokeWidth="1"
            />
          </Svg>

          <View style={styles.timerCenterContent}>
            <Text style={[styles.timerText, { color: colors.text }]}>{formatTime(timeLeft)}</Text>
            <Text style={[styles.timerLabel, { color: colors.textSecondary }]}>
              {sessionType === 'focus' ? 'Focus Time' : 'Break Time'}
            </Text>
          </View>
        </View>

        <Text style={[styles.greetingText, { color: colors.text }]}>
          {isActive ? 'Stay focused 🔥' : 'Ready to start?'}
        </Text>

        <View style={styles.controlsContainer}>
          <TouchableOpacity style={[styles.playButton, { backgroundColor: colors.primary, shadowColor: colors.primary }]} onPress={toggleTimer}>
            <Ionicons
              name={isActive ? 'pause' : 'play'}
              size={32}
              color="#000"
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.stopButton} onPress={resetTimer}>
            <Ionicons name="stop" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.musicButton}>
          <Ionicons
            name="musical-notes-outline"
            size={18}
            color={colors.textSecondary}
          />
          <Text style={[styles.musicButtonText, { color: colors.textSecondary }]}>Ambient Music</Text>
          <View style={[styles.toggleDot, { backgroundColor: colors.primary }]} />
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      <SessionCompleteModal
        visible={showComplete}
        duration={completedDuration}
        mode={mode}
        subject="Study Session"
        onSave={handleSaveSession}
        onDismiss={handleDismissComplete}
        colors={colors}
      />
    </SafeAreaView>
  );
}

const getStyles = (colors, Typography) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },

  container: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    flexGrow: 1,
  },

  topBar: {
    marginBottom: 40,
    width: '100%',
    alignItems: 'center',
  },

  topBarTitle: {
    ...Typography.h3,
    color: colors.textSecondary,
    fontSize: 18,
  },

  focusingOn: {
    ...Typography.body,
    color: colors.textSecondary,
    marginBottom: 8,
  },

  subjectTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 28,
  },

  modeSelector: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 24,
  },

  modeChip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 22,
    backgroundColor: colors.shimmer,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },

  modeChipActive: {},

  modeChipText: {
    ...Typography.body,
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },

  customRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 20,
  },

  customInput: {
    flex: 1,
    maxWidth: 140,
    backgroundColor: colors.shimmer,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },

  timerWrapper: {
    width: TIMER_SIZE,
    height: TIMER_SIZE,
    marginBottom: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },

  timerGlow: {
    position: 'absolute',
    width: TIMER_SIZE - 8,
    height: TIMER_SIZE - 8,
    borderRadius: TIMER_SIZE / 2,
    backgroundColor: `${colors.primary}0F`,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 22,
    elevation: 6,
  },

  timerSvg: {
    position: 'absolute',
  },

  timerCenterContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  timerText: {
    fontSize: 60,
    fontWeight: '300',
    marginBottom: 8,
  },

  timerLabel: {
    fontSize: 14,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },

  greetingText: {
    ...Typography.h3,
    marginBottom: 48,
  },

  controlsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },

  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 24,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },

  stopButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.shimmer,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },

  musicButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.shimmer,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    gap: 10,
  },

  musicButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },

  toggleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginLeft: 4,
  },
});