import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography } from '../theme/colors';
import GlassCard from '../components/GlassCard';
import HexagonBackground from '../components/HexagonBackground';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

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
  const today = new Date();

  const [currentMonth, setCurrentMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(today);
  const [showForm, setShowForm] = useState(false);

  const [plansByDate, setPlansByDate] = useState({
    [formatDateKey(today)]: [
  {
    id: '1',
    subject: 'Data Structures',
    topic: 'Binary Search Trees',
    startTime: '10:00',
    endTime: '10:45',
    duration: '45 min',
    difficulty: 'Medium',
    status: 'Active',
    progress: 65,
    color: Colors.primary,
  },
  {
    id: '2',
    subject: 'Algorithms',
    topic: 'Sorting & Searching',
    startTime: '14:30',
    endTime: '15:30',
    duration: '60 min',
    difficulty: 'Hard',
    status: 'Upcoming',
    progress: 35,
    color: Colors.danger,
  },
],
  });

  const [newPlan, setNewPlan] = useState({
  subject: '',
  topic: '',
  startTime: '',
  endTime: '',
  difficulty: 'Medium',
  status: 'Upcoming',
});

  const selectedKey = formatDateKey(selectedDate);
  const selectedPlans = plansByDate[selectedKey] || [];

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

  const handleAddPlan = () => {
  // 1. Safety check for the object itself
  if (!newPlan) return;

  // 2. Safely get times, default to empty if undefined
  const start = newPlan.startTime || '';
  const end = newPlan.endTime || '';
  const duration = getDurationFromTimes(start, end);

  // 3. Simple validation
  if (!newPlan.subject || !newPlan.topic || !start || !end || !duration) {
    console.log('Validation failed:', { subject: !!newPlan.subject, topic: !!newPlan.topic, start: !!start, end: !!end, duration: !!duration });
    return;
  }

  const dateKey = formatDateKey(selectedDate);
  const planToAdd = {
    id: Date.now().toString(),
    subject: newPlan.subject,
    topic: newPlan.topic,
    startTime: start,
    endTime: end,
    duration: duration,
    difficulty: newPlan.difficulty || 'Medium',
    status: newPlan.status || 'Upcoming',
    progress: 0,
    color: Colors.primary,
  };

  setPlansByDate((prev) => ({
    ...prev,
    [dateKey]: [...(prev[dateKey] || []), planToAdd],
  }));

  setNewPlan({
    subject: '',
    topic: '',
    startTime: '',
    endTime: '',
    difficulty: 'Medium',
    status: 'Upcoming',
  });

  setShowForm(false);
};

  const handleDeletePlan = (id) => {
    const key = formatDateKey(selectedDate);
    setPlansByDate((prev) => ({
      ...prev,
      [key]: (prev[key] || []).filter((plan) => plan.id !== id),
    }));
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
              Today’s study plan
            </Text>
          </View>

          <TouchableOpacity style={styles.newButton} onPress={() => setShowForm(true)}>
            <Text style={styles.newButtonText}>+ New Plan</Text>
          </TouchableOpacity>
        </View>

        <GlassCard style={styles.calendarCard}>
  <View style={styles.calendarTopGlow} />
          <View style={styles.calendarHeader}>
            <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.monthNav}>
              <Ionicons name="chevron-back" size={18} color={Colors.textSecondary} />
            </TouchableOpacity>

            <Text style={styles.calendarTitle}>
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </Text>

            <TouchableOpacity onPress={() => changeMonth(1)} style={styles.monthNav}>
              <Ionicons name="chevron-forward" size={18} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.weekRow}>
            {weekDays.map((day) => (
              <Text key={day} style={styles.weekDayText}>
                {day}
              </Text>
            ))}
          </View>

          <View style={styles.daysGrid}>
            {calendarDays.map((item, index) => {
              const isSelected = isSameDate(item.date, selectedDate);
              const isToday = isSameDate(item.date, today);
              const hasPlans = (plansByDate[formatDateKey(item.date)] || []).length > 0;

              return (
                <TouchableOpacity
                  key={`${item.day}-${index}`}
                  style={[
                    styles.dayCell,
                    isSelected && styles.selectedDayCell,
                    isToday && !isSelected && styles.todayCell,
                  ]}
                  onPress={() => setSelectedDate(item.date)}
                >
                  <Text
                    style={[
                      styles.dayText,
                      !item.currentMonth && styles.outsideMonthText,
                      isSelected && styles.selectedDayText,
                    ]}
                  >
                    {item.day}
                  </Text>

                  {hasPlans && <View style={styles.planDot} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </GlassCard>

        <GlassCard style={styles.planSectionCard}>
          <Text style={styles.planSectionTitle}>
            Plan for {getReadableDate(selectedDate)}
          </Text>

          {selectedPlans.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={28} color={Colors.textSecondary} />
              <Text style={styles.emptyTitle}>No plans for this day</Text>
              <Text style={styles.emptySub}>
                Tap “New Plan” to create one for {getReadableDate(selectedDate)}
              </Text>
            </View>
          ) : (
            selectedPlans.map((plan, index) => (
              <GlassCard key={plan.id} style={styles.taskCard}>
                <View style={styles.taskTopRow}>
                  <Text style={styles.taskMeta}>
                    Task {index + 1}: {plan.startTime}–{plan.endTime}
                  </Text>

                  <View style={styles.taskStatusWrap}>
                    <Text
                      style={[
                        styles.taskStatus,
                        {
                          color:
                            plan.status === 'Completed'
                              ? Colors.greenAccent
                              : plan.status === 'Active'
                              ? Colors.primary
                              : Colors.textSecondary,
                        },
                      ]}
                    >
                      {plan.status}
                    </Text>

                    <TouchableOpacity onPress={() => handleDeletePlan(plan.id)}>
                      <Ionicons name="trash-outline" size={16} color={Colors.danger} />
                    </TouchableOpacity>
                  </View>
                </View>

                <Text style={styles.subjectLine}>{plan.subject}</Text>
<Text style={styles.topicLine}>Topic: {plan.topic}</Text>

<View style={styles.planMetaRow}>
  <View style={styles.metaPill}>
    <Ionicons name="time-outline" size={13} color={Colors.primary} />
    <Text style={styles.metaPillText}>
      {plan.startTime}–{plan.endTime}
    </Text>
  </View>

  <View style={styles.metaPill}>
    <Ionicons name="hourglass-outline" size={13} color={Colors.primary} />
    <Text style={styles.metaPillText}>{plan.duration}</Text>
  </View>
</View>

<View style={styles.planBottomRow}>
  <View
    style={[
      styles.difficultyBadge,
      plan.difficulty === 'Easy' && styles.easyBadge,
      plan.difficulty === 'Medium' && styles.mediumBadge,
      plan.difficulty === 'Hard' && styles.hardBadge,
    ]}
  >
    <Text
      style={[
        styles.difficultyText,
        plan.difficulty === 'Easy' && styles.easyText,
        plan.difficulty === 'Medium' && styles.mediumText,
        plan.difficulty === 'Hard' && styles.hardText,
      ]}
    >
      {plan.difficulty}
    </Text>
  </View>

  <View style={styles.progressWrap}>
    <View style={styles.progressTrack}>
      <View
        style={[
          styles.progressFill,
          {
            width: `${plan.progress}%`,
            backgroundColor: plan.color,
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

      <Modal visible={showForm} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <GlassCard style={styles.modalCard}>
            <Text style={styles.modalTitle}>Create New Plan</Text>

            <TextInput
              placeholder="Subject"
              placeholderTextColor={'rgba(255,243,214,0.55)'}
              style={styles.input}
              value={newPlan.subject}
              onChangeText={(text) => setNewPlan({ ...newPlan, subject: text })}
            />

            <TextInput
              placeholder="Topic"
              placeholderTextColor={'rgba(255,243,214,0.55)'}
              style={styles.input}
              value={newPlan.topic}
              onChangeText={(text) => setNewPlan({ ...newPlan, topic: text })}
            />

            <TextInput
              placeholder="Start Time (e.g. 10:00)"
              placeholderTextColor={'rgba(255,243,214,0.55)'}
              style={styles.input}
              value={newPlan.startTime}
              onChangeText={(text) => setNewPlan({ ...newPlan, startTime: text })}
            />

            <TextInput
              placeholder="End Time (e.g. 10:45)"
              placeholderTextColor={'rgba(255,243,214,0.55)'}
              style={styles.input}
              value={newPlan.endTime}
              onChangeText={(text) => setNewPlan({ ...newPlan, endTime: text })}
            />
            
            <View style={styles.statusLabelWrap}>
  <Text style={styles.sectionMiniLabel}>Difficulty</Text>
</View>

<View style={styles.statusRow}>
  {['Easy', 'Medium', 'Hard'].map((difficulty) => (
    <TouchableOpacity
      key={difficulty}
      style={[
        styles.statusChip,
        newPlan.difficulty === difficulty && styles.statusChipActive,
      ]}
      onPress={() => setNewPlan({ ...newPlan, difficulty })}
    >
      <Text
        style={[
          styles.statusChipText,
          newPlan.difficulty === difficulty && styles.statusChipTextActive,
        ]}
      >
        {difficulty}
      </Text>
    </TouchableOpacity>
  ))}
</View>
<View style={styles.statusLabelWrap}>
  <Text style={styles.sectionMiniLabel}>Status</Text>
</View>
            <View style={styles.statusRow}>
              {['Upcoming', 'Active', 'Completed'].map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.statusChip,
                    newPlan.status === status && styles.statusChipActive,
                  ]}
                  onPress={() => setNewPlan({ ...newPlan, status })}
                >
                  <Text
                    style={[
                      styles.statusChipText,
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
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.saveButton} onPress={handleAddPlan}>
                <Text style={styles.saveButtonText}>Save Plan</Text>
              </TouchableOpacity>
            </View>
          </GlassCard>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
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
    backgroundColor: Colors.primary,
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
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
    color: '#F4C86A',
  fontSize: 20,
  fontWeight: '800',
  letterSpacing: 0.3,

  },
  monthNav: {
    padding: 6,
  },
  calendarTitle: {
    color: Colors.text,
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
    color: Colors.textSecondary,
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
    color: Colors.text,
    fontSize: 16,
  },
  outsideMonthText: {
    color: 'rgba(255,255,255,0.20)',
  },
  selectedDayCell: {
  backgroundColor: Colors.primary,
  borderRadius: 21,
  borderWidth: 1,
  borderColor: 'rgba(255, 232, 180, 0.75)',
  shadowColor: Colors.primary,
  shadowOpacity: 0.4,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 0 },
  elevation: 8,
},
  selectedDayText: {
    color: '#000',
    fontWeight: 'bold',
  },
  todayCell: {
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 21,
  },
  planDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: Colors.primary,
    position: 'absolute',
    bottom: 4,
  },
  planSectionCard: {
    padding: 18,
    marginBottom: 20,
  },
  planSectionTitle: {
    color: Colors.text,
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
    color: Colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginTop: 10,
  },
  emptySub: {
    color: Colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
  },
  taskCard: {
  padding: 16,
  marginBottom: 14,
  backgroundColor: 'rgba(255,255,255,0.03)',
  borderWidth: 1,
  borderColor: 'rgba(233, 179, 72, 0.32)',
  shadowOpacity: 0,
  shadowRadius: 0,
  elevation: 0,
},
  taskTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  taskMeta: {
    color: Colors.textSecondary,
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
    color: Colors.text,
    fontSize: 21,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  topicLine: {
    color: Colors.textSecondary,
    fontSize: 15,
    marginBottom: 12,
  },
  progressTrack: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
  width: '100%',
  padding: 22,
  backgroundColor: 'rgba(255,255,255,0.085)',
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.12)',
},
  modalTitle: {
  color: '#FFF3D6',
  fontSize: 22,
  fontWeight: '800',
  marginBottom: 18,
},
  input: {
  backgroundColor: 'rgba(255,255,255,0.08)',
  borderRadius: 14,
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.16)',
  color: '#FFF8E7',
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
  backgroundColor: 'rgba(255,255,255,0.06)',
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.10)',
},
  statusChipActive: {
    backgroundColor: Colors.primary,
  },
  statusChipText: {
  color: '#EDE7DA',
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
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#000',
    fontWeight: 'bold',
  },
  calendarTopGlow: {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  height: 56,
  borderTopLeftRadius: 18,
  borderTopRightRadius: 18,
  backgroundColor: 'rgba(244, 200, 106, 0.20)',
},

calendarCard: {
  padding: 18,
  marginBottom: 20,
  backgroundColor: 'rgba(255,255,255,0.03)',
  borderWidth: 1,
  borderColor: 'rgba(251, 192, 45, 0.22)',
  overflow: 'hidden',
},

planSectionCard: {
  padding: 18,
  marginBottom: 20,
  borderWidth: 1,
  borderColor: 'rgba(233, 179, 72, 0.14)',
},

taskCard: {
  padding: 16,
  marginBottom: 14,
  backgroundColor: 'rgba(255,255,255,0.04)',
  borderWidth: 1,
  borderColor: 'rgba(251, 192, 45, 0.18)',
  shadowColor: Colors.primary,
  shadowOpacity: 0.12,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 4 },
  elevation: 3,
},

subjectLine: {
  color: Colors.text,
  fontSize: 22,
  fontWeight: 'bold',
  marginBottom: 4,
},

topicLine: {
  color: Colors.textSecondary,
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
  backgroundColor: 'rgba(255,255,255,0.05)',
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.08)',
},

metaPillText: {
  color: Colors.text,
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

easyBadge: {
  backgroundColor: 'rgba(76, 175, 80, 0.14)',
  borderColor: 'rgba(76, 175, 80, 0.55)',
},

mediumBadge: {
  backgroundColor: 'rgba(251, 192, 45, 0.14)',
  borderColor: 'rgba(251, 192, 45, 0.55)',
},

hardBadge: {
  backgroundColor: 'rgba(244, 67, 54, 0.14)',
  borderColor: 'rgba(244, 67, 54, 0.55)',
},

easyText: {
  color: Colors.greenAccent,
},

mediumText: {
  color: Colors.primary,
},

hardText: {
  color: Colors.danger,
},

sectionMiniLabel: {
  color: '#F3D089',
  fontSize: 13,
  fontWeight: '700',
  marginBottom: 8,
},

statusLabelWrap: {
  marginTop: 4,
},
});