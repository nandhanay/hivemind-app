import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal,
  TextInput, FlatList, KeyboardAvoidingView, Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useUser } from '../context/UserContext';
import GlassCard from './GlassCard';
import { generateContent } from '../services/aiService';
import { navigate } from '../navigation/RootNavigation';
import { getWorkspaces } from '../firebase/services/workspaceService';
import { getWeakTopics } from '../firebase/services/weakTopicService';
import { getAllTasks } from '../firebase/services/taskService';
import { getStreak, getTotalStudyTime } from '../firebase/services/sessionService';
import { getQuizAnalytics } from '../firebase/services/quizService';

const NAV_LABELS = {
  Home: 'Go to Home Screen',
  Focus: 'Start Focus Timer',
  Planner: 'Open Study Planner',
  Library: 'Go to Library',
  Profile: 'View My Profile',
  Settings: 'Open Settings',
  Notes: 'Manage Study Notes',
  Flashcards: 'Study Flashcards',
  Quiz: 'Take AI Quiz',
  WeakTopics: 'Review Weak Topics',
  StudyRooms: 'Go to Study Rooms',
};

const getNavLabel = (screen) => {
  return NAV_LABELS[screen] || `Go to ${screen}`;
};

const getOfflineFallbackResponse = (userInput) => {
  const input = userInput.toLowerCase();
  
  // Keyword mapping for navigation intent when offline
  if (input.includes('focus') || input.includes('timer') || input.includes('pomodoro') || input.includes('clock')) {
    return {
      text: "Bzz... I'm offline right now, but you can start a Pomodoro focus session to keep your momentum going! Click the button below to fly over to the Focus Timer. 🐝",
      navigationAction: 'Focus',
      navigationLabel: 'Start Focus Timer',
    };
  }
  if (input.includes('plan') || input.includes('calendar') || input.includes('schedule') || input.includes('task') || input.includes('todo')) {
    return {
      text: "Bzz... My connection is down, but you can manage your daily study tasks on the Planner. Let's schedule your studies! 🍯",
      navigationAction: 'Planner',
      navigationLabel: 'Open Study Planner',
    };
  }
  if (input.includes('weak') || input.includes('struggle') || input.includes('fail') || input.includes('mistake')) {
    return {
      text: "Bzz... I'm currently disconnected, but I highly recommend checking out your Weak Topics. Let's review the concepts that need some extra care! 🐝",
      navigationAction: 'WeakTopics',
      navigationLabel: 'Review Weak Topics',
    };
  }
  if (input.includes('quiz') || input.includes('test') || input.includes('exam') || input.includes('question')) {
    return {
      text: "Bzz... I'm currently offline, but you can still take quizzes to test your knowledge. Let's head over to the Quiz area! 🧠",
      navigationAction: 'Quiz',
      navigationLabel: 'Take AI Quiz',
    };
  }
  if (input.includes('note') || input.includes('write') || input.includes('summarize')) {
    return {
      text: "Bzz... My network connection is down, but your notes are safe! Let's view or organize your study notes. 📝",
      navigationAction: 'Notes',
      navigationLabel: 'Manage Study Notes',
    };
  }
  if (input.includes('card') || input.includes('flashcard') || input.includes('recall') || input.includes('deck')) {
    return {
      text: "Bzz... I'm offline, but active recall is key! Let's practice with your Flashcard decks. 📇",
      navigationAction: 'Flashcards',
      navigationLabel: 'Study Flashcards',
    };
  }
  if (input.includes('room') || input.includes('study together') || input.includes('lobby') || input.includes('friend') || input.includes('co-study') || input.includes('co study')) {
    return {
      text: "Bzz... I can't reach the hive network, but you can study with others in our Study Rooms. Let's go there! 🐝",
      navigationAction: 'StudyRooms',
      navigationLabel: 'Go to Study Rooms',
    };
  }
  if (input.includes('setting') || input.includes('dark mode') || input.includes('theme') || input.includes('logout') || input.includes('log out')) {
    return {
      text: "Bzz... Need to adjust something? Let's take you to the Settings screen. ⚙️",
      navigationAction: 'Settings',
      navigationLabel: 'Open Settings',
    };
  }
  if (input.includes('profile') || input.includes('progress') || input.includes('stat') || input.includes('streak')) {
    return {
      text: "Bzz... You can view your current study stats and overall learning progress on your Profile page. Let's check it out! 🐝",
      navigationAction: 'Profile',
      navigationLabel: 'View My Profile',
    };
  }
  if (input.includes('library') || input.includes('material') || input.includes('file') || input.includes('pdf')) {
    return {
      text: "Bzz... Let's browse your saved study materials in the Library. 📚",
      navigationAction: 'Library',
      navigationLabel: 'Go to Library',
    };
  }

  // General offline tips / study help
  const fallbackAnswers = [
    "Bzz... I'm temporarily offline, but I'm here to cheer you on! Try breaking your study topic into smaller, manageable chunks. What subject are we focusing on today? 🍯",
    "Bzz... I'm offline right now, but don't lose focus! A good study tip is the Feynman technique: try explaining your topic out loud as if teaching it to someone else. 🐝",
    "Bzz... My network wings are resting, but I believe in you! Keep studying, take short walks to recharge, and stay hydrated. Let me know if you need to navigate to any app screens! 💧",
    "Bzz... Connection issue detected, but don't fret! Try writing down three key bullet points you want to memorize today, then test yourself on them later. 📝",
    "Bzz... I can't reach the internet, but I can help you navigate around! Try asking me to open the timer, planner, notes, or flashcards. 🐝"
  ];
  
  // Pick one randomly
  const randomIndex = Math.floor(Math.random() * fallbackAnswers.length);
  return {
    text: fallbackAnswers[randomIndex]
  };
};

export default function FloatingBeeAssistant() {
  const { colors, Typography } = useTheme();
  const { userId, userName, isGuest } = useUser();

  const [visible, setVisible] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'assistant',
      text: "Bzz... Hello! I'm your HoneyBee study mascot. How can I help you study, summarize notes, or stay productive today? 🍯",
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const listRef = useRef(null);

  const [userData, setUserData] = useState(null);
  const [dataLoading, setDataLoading] = useState(false);

  const loadUserData = async () => {
    if (!userId) {
      setUserData({
        workspaces: [],
        weakTopics: [],
        tasks: [],
        streak: 0,
        studyTime: 0,
        quizAnalytics: { totalQuizzes: 0, averageScore: 0, weakSubjects: [], recentScores: [] },
      });
      return;
    }
    setDataLoading(true);
    try {
      const [workspaces, weakTopics, tasks, streak, studyTime, quizAnalytics] = await Promise.all([
        getWorkspaces(userId),
        getWeakTopics(userId),
        getAllTasks(userId),
        getStreak(userId),
        getTotalStudyTime(userId),
        getQuizAnalytics(userId),
      ]);

      setUserData({
        workspaces,
        weakTopics,
        tasks,
        streak,
        studyTime,
        quizAnalytics,
      });
    } catch (error) {
      console.error('Error fetching assistant user data:', error);
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      loadUserData();
    }
  }, [visible]);

  if (!userId && !isGuest) return null; // Only show for logged in / guest active sessions

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text) return;

    const userMsg = { id: String(Date.now()), sender: 'user', text };
    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setLoading(true);

    // Scroll to end
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      // Build conversation history context
      const chatHistory = messages.slice(-6).map((m) => 
        `${m.sender === 'user' ? 'User' : 'HoneyBee'}: ${m.text}`
      ).join('\n');

      // Build user data context string
      const studyHours = Math.floor((userData?.studyTime || 0) / 3600);
      const studyMins = Math.floor(((userData?.studyTime || 0) % 3600) / 60);
      const studyTimeStr = studyHours > 0 ? `${studyHours}h ${studyMins}m` : `${studyMins}m`;

      let userDataString = `User Status:
- Name: ${userName || 'HiveMind User'}
- Is Guest: ${isGuest ? 'Yes' : 'No'}
- Study Streak: ${userData?.streak || 0} days
- Total Study Time: ${studyTimeStr}
`;

      if (userData?.workspaces?.length > 0) {
        userDataString += `\nWorkspaces:\n` + userData.workspaces.map(w => `- ${w.name}`).join('\n') + '\n';
      }

      if (userData?.weakTopics?.length > 0) {
        userDataString += `\nWeak Topics / Struggles:\n` + userData.weakTopics.slice(0, 5).map(wt => `- "${wt.topicName}" in ${wt.subject} (Score: ${wt.weaknessScore}/100, Mastery: ${wt.masteryProgress}%)`).join('\n') + '\n';
      } else {
        userDataString += `\nWeak Topics: None detected yet.\n`;
      }

      if (userData?.tasks?.length > 0) {
        const pending = userData.tasks.filter(t => t.status !== 'Completed').slice(0, 5);
        if (pending.length > 0) {
          userDataString += `\nUpcoming Planner Tasks:\n` + pending.map(t => `- [${t.status}] ${t.subject}: ${t.topic || 'General'} (Due: ${t.date} ${t.startTime})`).join('\n') + '\n';
        } else {
          userDataString += `\nUpcoming Tasks: None scheduled.\n`;
        }
      }

      if (userData?.quizAnalytics) {
        userDataString += `\nQuiz Stats:\n- Quizzes Taken: ${userData.quizAnalytics.totalQuizzes || 0}\n- Average Score: ${userData.quizAnalytics.averageScore || 0}%\n`;
        if (userData.quizAnalytics.weakSubjects?.length > 0) {
          userDataString += `- Struggling Subjects: ${userData.quizAnalytics.weakSubjects.join(', ')}\n`;
        }
      }

      const systemPrompt = `You are HoneyBee, a friendly, warm, and encouraging study mascot for the HiveMind productivity app. Your job is to help users with their study questions, notes, or planner tasks, and to provide relevant study suggestions using their logged-in context and stats.
      
Here is the current user's profile and learning data:
${userDataString}

Guidelines:
1. Address the user by name (${userName || 'User'}) in a warm, welcoming way if appropriate.
2. Provide personalized recommendations using their weak topics or upcoming planner tasks. For example, if they ask what to do, look at their struggles/tasks and suggest reviewing a specific topic or starting a scheduled task.
3. Keep answers concise, clear, and well-organized.
4. Sprinkle in 1-2 fun honeybee or hive-related puns (e.g. 'bzz', 'sweet', 'hive-five', 'bee-lieve', 'honey', 'comb') to keep it delightful!
5. App Navigation: You can navigate the user to different areas of the app! If the user wants to go to, open, or study something, or if it fits your recommendation, recommend a screen by appending a navigation tag at the very end of your response, formatted exactly as \`[NAV: ScreenName]\`. 
   The available screen names are:
   - \`Home\` (Dashboard with quick statistics and welcome card)
   - \`Focus\` (Focus timer, Pomodoro sessions, and relaxing sounds)
   - \`Planner\` (Calendar view and task list scheduling)
   - \`Library\` (Study files and reference materials library)
   - \`Profile\` (User summary, study statistics, and history)
   - \`Settings\` (Account preferences, app options, dark mode toggle)
   - \`Notes\` (Lists of notes, editing notes, or using the AI Notes Generator)
   - \`Flashcards\` (Vocabulary and revision flashcard sets)
   - \`Quiz\` (AI quiz creator and taking mode)
   - \`WeakTopics\` (Details of detected topics needing revision)
   - \`StudyRooms\` (Collaborative virtual study sessions)

   Examples:
   - "Bzz... Sure thing! Let's go to your planner so you can schedule that. 🐝 [NAV: Planner]"
   - "How about we start a timer to focus on your upcoming task? Hive-five! 🍯 [NAV: Focus]"
   - "Let's review the areas you are struggling with to get you back on track! [NAV: WeakTopics]"

Ensure the navigation tag is at the very end of your message, formatted exactly as [NAV: ScreenName].

Conversation History:
${chatHistory}

User's new message:
"${text}"

HoneyBee:`;

      const result = await generateContent(systemPrompt, { json: false, useChatModel: true });

      let reply = result.success && result.text
        ? result.text.trim()
        : "";

      // Parse navigation tags
      const navRegex = /\[NAV:\s*(\w+)\]/i;
      let navAction = null;
      let navLabel = null;

      if (reply) {
        if (navRegex.test(reply)) {
          const match = reply.match(navRegex);
          navAction = match[1];
          navLabel = getNavLabel(navAction);
          reply = reply.replace(navRegex, '').trim();
        }
      } else {
        // AI failed temporarily or offline, use local offline helper response
        const fallback = getOfflineFallbackResponse(text);
        reply = fallback.text;
        navAction = fallback.navigationAction;
        navLabel = fallback.navigationLabel;
      }

      setMessages((prev) => [
        ...prev,
        { 
          id: String(Date.now() + 1), 
          sender: 'assistant', 
          text: reply,
          ...(navAction && { navigationAction: navAction, navigationLabel: navLabel })
        },
      ]);
    } catch (e) {
      console.error("HoneyBee API error:", e);
      // Catch blocks should also fallback gracefully to the offline helper
      const fallback = getOfflineFallbackResponse(text);
      setMessages((prev) => [
        ...prev,
        { 
          id: String(Date.now() + 1), 
          sender: 'assistant', 
          text: fallback.text,
          ...(fallback.navigationAction && { navigationAction: fallback.navigationAction, navigationLabel: fallback.navigationLabel })
        },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  return (
    <View style={styles.container}>
      {/* Floating Bee Mascot Button */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => setVisible(true)}
        style={[styles.floatingBadge, { backgroundColor: colors.surface, borderColor: colors.primary }]}
      >
        <Text style={styles.beeEmojiFloating}>🐝</Text>
        <View style={[styles.glowRing, { borderColor: `${colors.primary}66` }]} />
      </TouchableOpacity>

      {/* Chat Assistant Modal */}
      <Modal visible={visible} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalBackdrop}
        >
          <View style={[styles.chatSheet, { backgroundColor: colors.surface, borderColor: colors.glassBorder }]}>
            {/* Header */}
            <View style={styles.header}>
              <View style={[styles.headerMascotContainer, { backgroundColor: colors.surfaceHighlight || colors.shimmer }]}>
                <Text style={{ fontSize: 24 }}>🐝</Text>
              </View>
              <View style={styles.headerText}>
                <Text style={[Typography.h3, { color: colors.text }]}>HoneyBee Mascot</Text>
                <Text style={[Typography.caption, { color: colors.primary }]}>Active Study Assistant</Text>
              </View>
              <TouchableOpacity onPress={() => setVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close-circle" size={28} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Chat Messages */}
            <FlatList
              ref={listRef}
              data={messages}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.messageList}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <View
                  style={[
                    styles.messageRow,
                    item.sender === 'user' ? styles.userRow : styles.assistantRow,
                  ]}
                >
                  {item.sender === 'assistant' && (
                    <View style={[styles.msgAvatarContainer, { backgroundColor: colors.surfaceHighlight || colors.shimmer }]}>
                      <Text style={{ fontSize: 18 }}>🐝</Text>
                    </View>
                  )}
                  <View
                    style={[
                      styles.bubble,
                      item.sender === 'user'
                        ? [styles.userBubble, { backgroundColor: colors.primary }]
                        : [styles.assistantBubble, { backgroundColor: colors.shimmer, borderColor: colors.glassBorder }],
                    ]}
                  >
                    <Text
                      style={[
                        styles.bubbleText,
                        { color: item.sender === 'user' ? '#000' : colors.text },
                      ]}
                    >
                      {item.text}
                    </Text>
                    {item.navigationAction && (
                      <TouchableOpacity
                        activeOpacity={0.8}
                        style={[styles.navActionBtn, { backgroundColor: colors.primary }]}
                        onPress={() => {
                          setVisible(false);
                          navigate(item.navigationAction);
                        }}
                      >
                        <Text style={styles.navActionText}>🐝 {item.navigationLabel}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}
            />

            {/* Typing Indicator */}
            {loading && (
              <View style={styles.typingIndicator}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[Typography.caption, { color: colors.textSecondary, marginLeft: 8 }]}>
                  HoneyBee is thinking... bzz
                </Text>
              </View>
            )}

            {/* Input Row */}
            <View style={[styles.inputRow, { borderTopColor: colors.border }]}>
              <TextInput
                value={inputText}
                onChangeText={setInputText}
                placeholder="Ask HoneyBee a study question..."
                placeholderTextColor={colors.textTertiary}
                style={[styles.input, { color: colors.text, borderColor: colors.glassBorder, backgroundColor: colors.shimmer }]}
                onSubmitEditing={handleSend}
                returnKeyType="send"
              />
              <TouchableOpacity
                onPress={handleSend}
                style={[styles.sendBtn, { backgroundColor: colors.primary }]}
              >
                <Ionicons name="send" size={16} color="#000" />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    zIndex: 9999,
  },
  floatingBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    overflow: 'hidden',
  },
  beeEmojiFloating: {
    fontSize: 32,
  },
  glowRing: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 30,
    borderWidth: 2,
  },
  // Modal chat layout
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  chatSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    height: '75%',
    paddingTop: 16,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  headerMascotContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  headerText: {
    flex: 1,
    marginLeft: 12,
  },
  closeBtn: {
    padding: 4,
  },
  messageList: {
    padding: 20,
    paddingBottom: 40,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-end',
    maxWidth: '85%',
  },
  userRow: {
    alignSelf: 'flex-end',
    justifyContent: 'flex-end',
  },
  assistantRow: {
    alignSelf: 'flex-start',
  },
  msgAvatarContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  bubble: {
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  userBubble: {
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    borderBottomLeftRadius: 4,
    borderWidth: 1,
  },
  bubbleText: {
    fontSize: 14.5,
    lineHeight: 20,
  },
  navActionBtn: {
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  navActionText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 13,
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    gap: 10,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14.5,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
