import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, TextInput, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Defs, LinearGradient, Stop, G } from 'react-native-svg';
import { Colors, Typography } from '../theme/colors';
import HexagonBackground from '../components/HexagonBackground';

const TIMER_SIZE = 260;
const STROKE_WIDTH = 12;
const RADIUS = (TIMER_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function FocusTimerScreen({ navigation }) {
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState('pomodoro');
  const [focusInput, setFocusInput] = useState('25');
  const [breakInput, setBreakInput] = useState('5');
  const [sessionType, setSessionType] = useState('focus');
  const [timeLeft, setTimeLeft] = useState(25 * 60);

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
    } else if (timeLeft === 0) {
      setIsActive(false);
      if (sessionType === 'focus' && breakMinutes > 0) {
        setSessionType('break');
        setTimeLeft(breakMinutes * 60);
      } else {
        alert('Session Complete 🎉');
      }
    }

    return () => clearInterval(interval);
  }, [isActive, timeLeft, sessionType, breakMinutes]);

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

  const applyMode = (selectedMode) => {
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
  };

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
        <Text style={styles.subjectTitle}>Binary Search Trees</Text>

        <View style={styles.modeSelector}>
          <TouchableOpacity
            style={[styles.modeChip, mode === 'focus' && styles.modeChipActive]}
            onPress={() => applyMode('focus')}
          >
            <Text style={[styles.modeChipText, mode === 'focus' && styles.modeChipTextActive]}>
              Focus
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeChip, mode === 'pomodoro' && styles.modeChipActive]}
            onPress={() => applyMode('pomodoro')}
          >
            <Text style={[styles.modeChipText, mode === 'pomodoro' && styles.modeChipTextActive]}>
              Pomodoro
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeChip, mode === 'long' && styles.modeChipActive]}
            onPress={() => applyMode('long')}
          >
            <Text style={[styles.modeChipText, mode === 'long' && styles.modeChipTextActive]}>
              Long Focus
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeChip, mode === 'custom' && styles.modeChipActive]}
            onPress={() => setMode('custom')}
          >
            <Text style={[styles.modeChipText, mode === 'custom' && styles.modeChipTextActive]}>
              Custom
            </Text>
          </TouchableOpacity>
        </View>

        {mode === 'custom' && (
          <View style={styles.customRow}>
            <TextInput
              value={focusInput}
              onChangeText={handleCustomFocus}
              placeholder="Focus"
              placeholderTextColor={Colors.textSecondary}
              keyboardType="numeric"
              style={styles.customInput}
            />
            <TextInput
              value={breakInput}
              onChangeText={handleCustomBreak}
              placeholder="Break"
              placeholderTextColor={Colors.textSecondary}
              keyboardType="numeric"
              style={styles.customInput}
            />
          </View>
        )}

        <View style={styles.timerWrapper}>
          <View style={styles.timerGlow} />

          <Svg width={TIMER_SIZE} height={TIMER_SIZE} style={styles.timerSvg}>
            <Defs>
              <LinearGradient id="timerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor={Colors.primary} />
                <Stop offset="0.65" stopColor="#F0B94A" />
                <Stop offset="1" stopColor="#FFD36B" />
              </LinearGradient>
            </Defs>

            <G rotation="-90" origin={`${TIMER_SIZE / 2}, ${TIMER_SIZE / 2}`}>
              <Circle
                cx={TIMER_SIZE / 2}
                cy={TIMER_SIZE / 2}
                r={RADIUS}
                stroke="rgba(255,255,255,0.08)"
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
              fill={Colors.background}
              stroke="rgba(255,255,255,0.05)"
              strokeWidth="1"
            />
          </Svg>

          <View style={styles.timerCenterContent}>
            <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>
            <Text style={styles.timerLabel}>
              {sessionType === 'focus' ? 'Focus Time' : 'Break Time'}
            </Text>
          </View>
        </View>

        <Text style={styles.greetingText}>
          {isActive ? 'Stay focused 🔥' : 'Ready to start?'}
        </Text>

        <View style={styles.controlsContainer}>
          <TouchableOpacity style={styles.playButton} onPress={toggleTimer}>
            <Ionicons
              name={isActive ? 'pause' : 'play'}
              size={32}
              color="#000"
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.stopButton} onPress={resetTimer}>
            <Ionicons name="stop" size={24} color={Colors.text} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.musicButton}>
          <Ionicons
            name="musical-notes-outline"
            size={18}
            color={Colors.textSecondary}
          />
          <Text style={styles.musicButtonText}>Ambient Music</Text>
          <View style={styles.toggleDot} />
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },

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
    color: Colors.textSecondary,
    fontSize: 18,
  },

  focusingOn: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginBottom: 8,
  },

  subjectTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.primary,
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
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },

  modeChipActive: {
    backgroundColor: 'rgba(251, 192, 45, 0.14)',
    borderColor: Colors.primary,
  },

  modeChipText: {
    ...Typography.body,
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },

  modeChipTextActive: {
    color: Colors.primary,
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
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    color: Colors.text,
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
    backgroundColor: 'rgba(251, 192, 45, 0.06)',
    shadowColor: Colors.primary,
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
    color: Colors.text,
    fontSize: 60,
    fontWeight: '300',
    marginBottom: 8,
  },

  timerLabel: {
    color: Colors.textSecondary,
    fontSize: 14,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },

  greetingText: {
    ...Typography.h3,
    color: Colors.text,
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
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 24,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },

  stopButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },

  musicButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    gap: 10,
  },

  musicButtonText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },

  toggleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
    marginLeft: 4,
  },
});