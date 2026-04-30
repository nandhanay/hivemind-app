import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { Colors, Typography } from '../theme/colors';
import HexagonBackground from '../components/HexagonBackground';

export default function FocusTimerScreen({ navigation }) {
  const [isActive, setIsActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(25 * 60);

  useEffect(() => {
    let interval = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((time) => time - 1);
      }, 1000);
    } else if (!isActive && timeLeft !== 0) {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const toggleTimer = () => setIsActive(!isActive);
  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(25 * 60);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <HexagonBackground />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.topBar}>
          <Text style={styles.topBarTitle}>Focus Session</Text>
        </View>

        <Text style={styles.focusingOn}>Focusing on</Text>
        <Text style={styles.subjectTitle}>Binary Search Trees</Text>

        <View style={styles.timerWrapper}>
          <View style={styles.timerCircle}>
            <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>
            <Text style={styles.timerLabel}>Focus Time</Text>
          </View>
        </View>

        <Text style={styles.greetingText}>Keep going, Nandhana! ✨</Text>

        <View style={styles.controlsContainer}>
          <TouchableOpacity 
            style={styles.playButton} 
            onPress={toggleTimer}
          >
            <Ionicons name={isActive ? "pause" : "play"} size={32} color="#000" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.stopButton} onPress={resetTimer}>
            <Ionicons name="stop" size={24} color={Colors.text} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.musicButton}>
          <Ionicons name="musical-notes-outline" size={18} color={Colors.textSecondary} />
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
    marginBottom: 48,
  },
  timerWrapper: {
    marginBottom: 40,
  },
  timerCircle: {
    width: 260,
    height: 260,
    borderRadius: 130,
    borderWidth: 4,
    borderColor: Colors.primary, 
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(251, 192, 45, 0.05)',
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
  }
});
