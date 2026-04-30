import React from 'react';
import { View, Text, StyleSheet, TextInput, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography } from '../theme/colors';
import GlassCard from '../components/GlassCard';
import { Ionicons } from '@expo/vector-icons';

export default function ChatScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="chatbubbles" size={28} color={Colors.primary} />
        <Text style={[Typography.h2, { marginLeft: 12 }]}>Ask Honey</Text>
      </View>

      <ScrollView contentContainerStyle={styles.chatArea}>
        <GlassCard style={styles.botMessage}>
          <Text style={Typography.body}>Bzz! Hi Scholar! I'm Honey. Need help with Biology today?</Text>
        </GlassCard>

        <View style={styles.userMessage}>
          <Text style={[Typography.body, { color: '#000' }]}>Yes, explain Mitosis please.</Text>
        </View>

        <GlassCard style={styles.botMessage}>
          <Text style={Typography.body}>Mitosis is a process of cell duplication, where one cell divides into two genetically identical daughter cells. Want me to break down the phases?</Text>
        </GlassCard>
      </ScrollView>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Type your question..."
            placeholderTextColor={Colors.textSecondary}
          />
          <View style={styles.sendButton}>
            <Ionicons name="send" size={20} color="#000" />
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
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
    backgroundColor: Colors.primary,
    padding: 16,
    borderRadius: 20,
    borderTopRightRadius: 4,
    maxWidth: '80%',
    marginBottom: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: Colors.surfaceHighlight,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: Colors.text,
    ...Typography.body,
  },
  sendButton: {
    backgroundColor: Colors.primary,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  }
});
