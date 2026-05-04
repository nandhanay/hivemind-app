import React from 'react';
import { View, Text, StyleSheet, TextInput, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import GlassCard from '../components/GlassCard';
import { Ionicons } from '@expo/vector-icons';

export default function ChatScreen() {
  const { colors, Typography } = useTheme();
  const styles = getStyles(colors, Typography);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="chatbubbles" size={28} color={colors.primary} />
        <Text style={[Typography.h2, { marginLeft: 12, color: colors.text }]}>Ask Honey</Text>
      </View>

      <ScrollView contentContainerStyle={styles.chatArea}>
        <GlassCard style={styles.botMessage}>
          <Text style={[Typography.body, { color: colors.textSecondary }]}>
            Bzz! Hi Scholar! I'm Honey. Need help with Biology today?
          </Text>
        </GlassCard>

        <View style={[styles.userMessage, { backgroundColor: colors.primary }]}>
          <Text style={[Typography.body, { color: '#000' }]}>Yes, explain Mitosis please.</Text>
        </View>

        <GlassCard style={styles.botMessage}>
          <Text style={[Typography.body, { color: colors.textSecondary }]}>
            Mitosis is a process of cell duplication, where one cell divides into two genetically identical daughter cells. Want me to break down the phases?
          </Text>
        </GlassCard>
      </ScrollView>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surfaceHighlight, color: colors.text }]}
            placeholder="Type your question..."
            placeholderTextColor={colors.textSecondary}
          />
          <View style={[styles.sendButton, { backgroundColor: colors.primary }]}>
            <Ionicons name="send" size={20} color="#000" />
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const getStyles = (colors, Typography) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  chatArea: {
    padding: 20,
    flexGrow: 1,
  },
  botMessage: {
    alignSelf: 'flex-start',
    maxWidth: '80%',
    marginBottom: 16,
    borderTopLeftRadius: 4,
  },
  userMessage: {
    alignSelf: 'flex-end',
    padding: 16,
    borderRadius: 20,
    borderTopRightRadius: 4,
    maxWidth: '80%',
    marginBottom: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    ...Typography.body,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
});
