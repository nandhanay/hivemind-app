import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useUser } from '../context/UserContext';
import GlassCard from '../components/GlassCard';
import HexagonBackground from '../components/HexagonBackground';
import { Ionicons } from '@expo/vector-icons';
import { addTask, getTasksByDate, deleteTask, getDatesWithTasks } from '../firebase/services/taskService';

const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const formatDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getReadableDate = (date) => {
  return `${weekDays[date.getDay()]}, ${monthNames[date.getMonth()]} ${date.getDate()}`;
};

const getDurationFromTimes = (startTime, endTime) => {
  const startParts = startTime.split(':').map(Number);
  const endParts = endTime.split(':').map(Number);

  if (
    startParts.length !== 2 ||
    endParts.length !== 2 ||
    startParts.some(isNaN) ||
    endParts.some(isNaN)
  ) {
    return '';
  }

  const startMinutes = startParts[0] * 60 + startParts[1];
  const endMinutes = endParts[0] * 60 + endParts[1];
  const diff = endMinutes - startMinutes;

  if (diff <= 0) return '';
  return `${diff} min`;
};

export default function PlannerScreen() {
  const { colors, Typography } = useTheme();
  const { userId } = useUser();
  const styles = getStyles(colors, Typography);
  const today = new Date();

  const [currentMonth, setCurrentMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(today);
  const [showForm, setShowForm] = useState(false);
  const [selectedPlans, setSelectedPlans] = useState([]);
  const [datesWithPlans, setDatesWithPlans] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [newPlan, setNewPlan] = useState({
    subject: '',
    topic: '',
    startTime: '',
    endTime: '',
    difficulty: 'Medium',
    status: 'Upcoming',
  });

  const selectedKey = formatDateKey(selectedDate);

  // Load tasks for selected date
  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const tasks = await getTasksByDate(userId, selectedKey);
      setSelectedPlans(tasks);
    } catch (err) {
      console.error('Error loading tasks:', err);
    } finally {
      setLoading(false);
    }
  }, [userId, selectedKey]);

  // Load dates that have plans (for calendar dots)
  const loadDatesWithPlans = useCallback(async () => {
    try {
      const dates = await getDatesWithTasks(userId);
      setDatesWithPlans(new Set(dates));
    } catch (err) {
      console.error('Error loading plan dates:', err);
    }
  }, [userId]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    loadDatesWithPlans();
  }, [loadDatesWithPlans]);

  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const cells = [];

    for (let i = firstDay - 1; i >= 0; i--) {
      cells.push({
        day: prevMonthDays - i,
        currentMonth: false,
        date: new Date(year, month - 1, prevMonthDays - i),
      });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({
        day: d,
        currentMonth: true,
        date: new Date(year, month, d),
      });
    }

    while (cells.length % 7 !== 0) {
      const nextDay = cells.length - (firstDay + daysInMonth) + 1;
      cells.push({
        day: nextDay,
        currentMonth: false,
        date: new Date(year, month + 1, nextDay),
      });
    }

    return cells;
  }, [currentMonth]);

  const isSameDate = (a, b) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const changeMonth = (offset) => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + offset, 1)
    );
  };

  const handleAddPlan = async () => {
    if (!newPlan) return;

    const start = newPlan.startTime || '';
    const end = newPlan.endTime || '';
    const duration = getDurationFromTimes(start, end);

    if (!newPlan.subject || !newPlan.topic || !start || !end || !duration) {
      return;
    }

    setSaving(true);
    try {
      const taskData = {
        subject: newPlan.subject,
        topic: newPlan.topic,
        startTime: start,
        endTime: end,
        duration: duration,
        difficulty: newPlan.difficulty || 'Medium',
        status: newPlan.status || 'Upcoming',
        progress: 0,
        date: selectedKey,
      };

      await addTask(userId, taskData);
      await loadTasks();
      await loadDatesWithPlans();

      setNewPlan({
        subject: '',
        topic: '',
        startTime: '',
        endTime: '',
        difficulty: 'Medium',
        status: 'Upcoming',
      });
      setShowForm(false);
    } catch (err) {
      console.error('Error adding plan:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePlan = async (taskId) => {
    try {
      await deleteTask(userId, taskId);
      await loadTasks();
      await loadDatesWithPlans();
    } catch (err) {
      console.error('Error deleting plan:', err);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <HexagonBackground />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={Typography.h1}>Your Plan</Text>
            <Text style={[Typography.body, { marginTop: 4 }]}>
              Today's study plan
            </Text>
          </View>

          <TouchableOpacity style={[styles.newButton, { backgroundColor: colors.primary }]} onPress={() => setShowForm(true)}>
            <Text style={styles.newButtonText}>+ New Plan</Text>
          </TouchableOpacity>
        </View>

        <GlassCard style={styles.calendarCard}>
          <View style={[styles.calendarTopGlow, { backgroundColor: `${colors.primary}33` }]} />
          <View style={styles.calendarHeader}>
            <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.monthNav}>
              <Ionicons name="chevron-back" size={18} color={colors.textSecondary} />
            </TouchableOpacity>

            <Text style={[styles.calendarTitle, { color: colors.text }]}>
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </Text>

            <TouchableOpacity onPress={() => changeMonth(1)} style={styles.monthNav}>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.weekRow}>
            {weekDays.map((day) => (
              <Text key={day} style={[styles.weekDayText, { color: colors.textSecondary }]}>
                {day}
              </Text>
            ))}
          </View>

          <View style={styles.daysGrid}>
            {calendarDays.map((item, index) => {
              const isSelected = isSameDate(item.date, selectedDate);
              const isToday = isSameDate(item.date, today);
              const hasPlans = datesWithPlans.has(formatDateKey(item.date));

              return (
                <TouchableOpacity
                  key={`${item.day}-${index}`}
                  style={[
                    styles.dayCell,
                    isSelected && [styles.selectedDayCell, { backgroundColor: colors.primary, borderColor: `${colors.primary}BF`, shadowColor: colors.primary }],
                    isToday && !isSelected && { borderWidth: 1, borderColor: colors.primary, borderRadius: 21 },
                  ]}
                  onPress={() => setSelectedDate(item.date)}
                >
                  <Text
                    style={[
                      styles.dayText,
                      { color: colors.text },
                      !item.currentMonth && { color: `${colors.text}33` },
                      isSelected && styles.selectedDayText,
                    ]}
                  >
                    {item.day}
                  </Text>

                  {hasPlans && <View style={[styles.planDot, { backgroundColor: colors.primary }]} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </GlassCard>

        <GlassCard style={styles.planSectionCard}>
          <Text style={[styles.planSectionTitle, { color: colors.text }]}>
            Plan for {getReadableDate(selectedDate)}
          </Text>

          {loading ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ paddingVertical: 20 }} />
          ) : selectedPlans.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={28} color={colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No plans for this day</Text>
              <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                Tap "+ New Plan" to create one for {getReadableDate(selectedDate)}
              </Text>
            </View>
          ) : (
            selectedPlans.map((plan, index) => (
              <GlassCard key={plan.id} style={styles.taskCard}>
                <View style={styles.taskTopRow}>
                  <Text style={[styles.taskMeta, { color: colors.textSecondary }]}>
                    Task {index + 1}: {plan.startTime}–{plan.endTime}
                  </Text>

                  <View style={styles.taskStatusWrap}>
                    <Text
                      style={[
                        styles.taskStatus,
                        {
                          color:
                            plan.status === 'Completed'
                              ? colors.greenAccent
                              : plan.status === 'Active'
                                ? colors.primary
                                : colors.textSecondary,
                        },
                      ]}
                    >
                      {plan.status}
                    </Text>

                    <TouchableOpacity onPress={() => handleDeletePlan(plan.id)}>
                      <Ionicons name="trash-outline" size={16} color={colors.danger} />
                    </TouchableOpacity>
                  </View>
                </View>

                <Text style={[styles.subjectLine, { color: colors.text }]}>{plan.subject}</Text>
                <Text style={[styles.topicLine, { color: colors.textSecondary }]}>Topic: {plan.topic}</Text>

                <View style={styles.planMetaRow}>
                  <View style={styles.metaPill}>
                    <Ionicons name="time-outline" size={13} color={colors.primary} />
                    <Text style={[styles.metaPillText, { color: colors.text }]}>
                      {plan.startTime}–{plan.endTime}
                    </Text>
                  </View>

                  <View style={styles.metaPill}>
                    <Ionicons name="hourglass-outline" size={13} color={colors.primary} />
                    <Text style={[styles.metaPillText, { color: colors.text }]}>{plan.duration}</Text>
                  </View>
                </View>

                <View style={styles.planBottomRow}>
                  <View
                    style={[
                      styles.difficultyBadge,
                      plan.difficulty === 'Easy' && { backgroundColor: `${colors.greenAccent}24`, borderColor: `${colors.greenAccent}8C` },
                      plan.difficulty === 'Medium' && { backgroundColor: `${colors.primary}24`, borderColor: `${colors.primary}8C` },
                      plan.difficulty === 'Hard' && { backgroundColor: `${colors.danger}24`, borderColor: `${colors.danger}8C` },
                    ]}
                  >
                    <Text
                      style={[
                        styles.difficultyText,
                        plan.difficulty === 'Easy' && { color: colors.greenAccent },
                        plan.difficulty === 'Medium' && { color: colors.primary },
                        plan.difficulty === 'Hard' && { color: colors.danger },
                      ]}
                    >
                      {plan.difficulty}
                    </Text>
                  </View>

                  <View style={styles.progressWrap}>
                    <View style={[styles.progressTrack, { backgroundColor: colors.shimmer }]}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${plan.progress || 0}%`,
                            backgroundColor: colors.primary,
                          },
                        ]}
                      />
                    </View>
                  </View>
                </View>
              </GlassCard>
            ))
          )}
        </GlassCard>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* New Plan Modal */}
      <Modal visible={showForm} transparent animationType="slide">
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <GlassCard style={styles.modalCard}>
            <Text style={[styles.modalTitle, { color: colors.primaryLight || colors.text }]}>Create New Plan</Text>

            <TextInput
              placeholder="Subject"
              placeholderTextColor={colors.textSecondary}
              style={[styles.input, { color: colors.text, borderColor: colors.glassBorder }]}
              value={newPlan.subject}
              onChangeText={(text) => setNewPlan({ ...newPlan, subject: text })}
            />

            <TextInput
              placeholder="Topic"
              placeholderTextColor={colors.textSecondary}
              style={[styles.input, { color: colors.text, borderColor: colors.glassBorder }]}
              value={newPlan.topic}
              onChangeText={(text) => setNewPlan({ ...newPlan, topic: text })}
            />

            <TextInput
              placeholder="Start Time (e.g. 10:00)"
              placeholderTextColor={colors.textSecondary}
              style={[styles.input, { color: colors.text, borderColor: colors.glassBorder }]}
              value={newPlan.startTime}
              onChangeText={(text) => setNewPlan({ ...newPlan, startTime: text })}
            />

            <TextInput
              placeholder="End Time (e.g. 10:45)"
              placeholderTextColor={colors.textSecondary}
              style={[styles.input, { color: colors.text, borderColor: colors.glassBorder }]}
              value={newPlan.endTime}
              onChangeText={(text) => setNewPlan({ ...newPlan, endTime: text })}
            />

            <View style={styles.statusLabelWrap}>
              <Text style={[styles.sectionMiniLabel, { color: colors.primary }]}>Difficulty</Text>
            </View>

            <View style={styles.statusRow}>
              {['Easy', 'Medium', 'Hard'].map((difficulty) => (
                <TouchableOpacity
                  key={difficulty}
                  style={[
                    styles.statusChip,
                    newPlan.difficulty === difficulty && [styles.statusChipActive, { backgroundColor: colors.primary }],
                  ]}
                  onPress={() => setNewPlan({ ...newPlan, difficulty })}
                >
                  <Text
                    style={[
                      styles.statusChipText,
                      { color: colors.textSecondary },
                      newPlan.difficulty === difficulty && styles.statusChipTextActive,
                    ]}
                  >
                    {difficulty}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.statusLabelWrap}>
              <Text style={[styles.sectionMiniLabel, { color: colors.primary }]}>Status</Text>
            </View>

            <View style={styles.statusRow}>
              {['Upcoming', 'Active', 'Completed'].map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.statusChip,
                    newPlan.status === status && [styles.statusChipActive, { backgroundColor: colors.primary }],
                  ]}
                  onPress={() => setNewPlan({ ...newPlan, status })}
                >
                  <Text
                    style={[
                      styles.statusChipText,
                      { color: colors.textSecondary },
                      newPlan.status === status && styles.statusChipTextActive,
                    ]}
                  >
                    {status}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setShowForm(false)}>
                <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: colors.primary }]}
                onPress={handleAddPlan}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <Text style={styles.saveButtonText}>Save Plan</Text>
                )}
              </TouchableOpacity>
            </View>
          </GlassCard>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const getStyles = (colors, Typography) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    height: '100%',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    flexGrow: 1,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  newButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  newButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 14,
  },
  calendarCard: {
    padding: 18,
    marginBottom: 20,
    backgroundColor: colors.shimmer,
    borderWidth: 1,
    borderColor: `${colors.primary}38`,
    overflow: 'hidden',
  },
  calendarTopGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 56,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  monthNav: {
    padding: 6,
  },
  calendarTitle: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  weekDayText: {
    width: '14.2%',
    textAlign: 'center',
    fontSize: 13,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 14,
  },
  dayCell: {
    width: '14.2%',
    alignItems: 'center',
    justifyContent: 'center',
    height: 42,
    position: 'relative',
  },
  dayText: {
    fontSize: 16,
  },
  selectedDayCell: {
    borderRadius: 21,
    borderWidth: 1,
    shadowOpacity: 0.4,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  selectedDayText: {
    color: '#000',
    fontWeight: 'bold',
  },
  planDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    position: 'absolute',
    bottom: 4,
  },
  planSectionCard: {
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: `${colors.primary}24`,
  },
  planSectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 26,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 10,
  },
  emptySub: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
  },
  taskCard: {
    padding: 16,
    marginBottom: 14,
    backgroundColor: colors.shimmer,
    borderWidth: 1,
    borderColor: `${colors.primary}2E`,
    shadowColor: colors.primary,
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  taskTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  taskMeta: {
    fontSize: 13,
  },
  taskStatusWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  taskStatus: {
    fontSize: 13,
    fontWeight: '700',
  },
  subjectLine: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  topicLine: {
    fontSize: 15,
    marginBottom: 12,
  },
  planMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: colors.shimmer,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  metaPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  planBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  progressWrap: {
    flex: 1,
  },
  difficultyBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    minWidth: 78,
    alignItems: 'center',
  },
  difficultyText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    padding: 22,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 18,
  },
  input: {
    backgroundColor: colors.shimmer,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 18,
    marginTop: 4,
  },
  statusChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: colors.shimmer,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  statusChipActive: {},
  statusChipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  statusChipTextActive: {
    color: '#000',
    fontWeight: 'bold',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.shimmer,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#000',
    fontWeight: 'bold',
  },
  sectionMiniLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  statusLabelWrap: {
    marginTop: 4,
  },
});