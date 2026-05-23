import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, Image, TouchableOpacity, Modal,
  TextInput, FlatList, KeyboardAvoidingView, Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useUser } from '../context/UserContext';
import GlassCard from './GlassCard';
import { generateContent } from '../services/aiService';

export default function FloatingBeeAssistant() {
  const { colors, Typography } = useTheme();
  const { userId } = useUser();

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

  if (!userId) return null; // Only show for logged in / guest active sessions

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

      const systemPrompt = `You are HoneyBee, a friendly, warm, and encouraging study mascot for the HiveMind productivity app. Your job is to help users with their study questions, notes, or planner tasks. Keep answers concise, clear, and well-organized. Always sprinkle in 1-2 fun honeybee or hive-related puns (e.g. 'bzz', 'sweet', 'hive-five', 'bee-lieve', 'honey', 'comb') to keep it delightful!
      
      Conversation History:
      ${chatHistory}
      
      User's new message:
      "${text}"
      
      HoneyBee:`;

      const result = await generateContent(systemPrompt, { json: false });

      const reply = result.success && result.text
        ? result.text.trim()
        : "Bzz... I'm having trouble flying through the web right now. Let's try again in a bit! 🐝";

      setMessages((prev) => [
        ...prev,
        { id: String(Date.now() + 1), sender: 'assistant', text: reply },
      ]);
    } catch (e) {
      console.error(e);
      setMessages((prev) => [
        ...prev,
        { id: String(Date.now() + 1), sender: 'assistant', text: "Bzz... My wings are tired. Let me rest and try again!" },
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
        <Image
          source={require('../../assets/i.png')}
          style={styles.beeImage}
          resizeMode="contain"
        />
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
              <Image source={require('../../assets/i.png')} style={styles.headerMascot} />
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
                    <Image source={require('../../assets/i.png')} style={styles.msgAvatar} />
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
  beeImage: {
    width: 46,
    height: 46,
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
  headerMascot: {
    width: 44,
    height: 44,
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
  msgAvatar: {
    width: 32,
    height: 32,
    marginRight: 8,
    marginBottom: 4,
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
