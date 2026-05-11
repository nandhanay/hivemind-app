import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Image, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { Colors, Typography } from '../theme/colors';
import { auth } from '../config/firebase';
import HexagonBackground from '../components/HexagonBackground';
import GlassCard from '../components/GlassCard';
import HoneyButton from '../components/HoneyButton';

const getFriendlyError = (error) => {
  const code = error?.code || '';
  const map = {
    'auth/user-not-found': 'No account found with this email.',
    'auth/wrong-password': 'Incorrect password. Please try again.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/email-already-in-use': 'This email is already registered. Try logging in.',
    'auth/weak-password': 'Password must be at least 6 characters.',
    'auth/too-many-requests': 'Too many attempts. Please wait and try again.',
    'auth/network-request-failed': 'Network error. Check your connection.',
    'auth/invalid-credential': 'Invalid email or password.',
  };
  return map[code] || error.message || 'Something went wrong. Please try again.';
};

export default function AuthScreen({ navigation }) {
  const [mode, setMode] = useState('login');
  const [focusedField, setFocusedField] = useState('');
  const [loginForm, setLoginForm] = useState({ emailOrUsername: '', password: '' });
  const [signUpForm, setSignUpForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const isLogin = mode === 'login';

  const handlePrimaryAction = async () => {
    setErrorMessage('');
    if (isLogin) {
      if (!loginForm.emailOrUsername.trim() || !loginForm.password) {
        setErrorMessage('Please enter your email and password.');
        return;
      }
      setLoading(true);
      try {
        await signInWithEmailAndPassword(auth, loginForm.emailOrUsername.trim(), loginForm.password);
      } catch (error) {
        setErrorMessage(getFriendlyError(error));
      }
      setLoading(false);
      return;
    }
    if (!signUpForm.name.trim() || !signUpForm.email.trim() || !signUpForm.password) {
      setErrorMessage('Please fill all signup fields.');
      return;
    }
    setLoading(true);
    try {
      const credential = await createUserWithEmailAndPassword(auth, signUpForm.email.trim(), signUpForm.password);
      await updateProfile(credential.user, { displayName: signUpForm.name.trim() });
    } catch (error) {
      setErrorMessage(getFriendlyError(error));
    }
    setLoading(false);
  };

  const handleForgotPassword = async () => {
    const email = loginForm.emailOrUsername.trim();
    if (!email) {
      setErrorMessage('Enter your email above, then tap "Forgot Password?"');
      return;
    }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      Alert.alert('Reset Email Sent', `We've sent a password reset link to ${email}. Check your inbox.`);
      setErrorMessage('');
    } catch (error) {
      setErrorMessage(getFriendlyError(error));
    }
    setLoading(false);
  };

  const getInputStyle = (fieldName) => [
    styles.input,
    focusedField === fieldName && styles.inputFocused,
  ];

  return (
    <SafeAreaView style={styles.container}>
      <HexagonBackground />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Image source={require('../assets/bee_mascot.png')} style={styles.logo} />
          <Text style={styles.title}>Welcome to HiveMind</Text>
          <Text style={styles.subtitle}>Focus smarter, not harder</Text>
        </View>

        <GlassCard style={styles.card} intensity={26}>
          <View style={styles.toggleWrap}>
            <TouchableOpacity style={[styles.toggleButton, isLogin && styles.toggleButtonActive]} onPress={() => { setMode('login'); setErrorMessage(''); }} activeOpacity={0.85}>
              <Text style={[styles.toggleText, isLogin && styles.toggleTextActive]}>Login</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.toggleButton, !isLogin && styles.toggleButtonActive]} onPress={() => { setMode('signup'); setErrorMessage(''); }} activeOpacity={0.85}>
              <Text style={[styles.toggleText, !isLogin && styles.toggleTextActive]}>Sign Up</Text>
            </TouchableOpacity>
          </View>

          {isLogin ? (
            <View style={styles.formWrap}>
              <TextInput style={getInputStyle('login-email')} value={loginForm.emailOrUsername} onChangeText={(text) => setLoginForm((prev) => ({ ...prev, emailOrUsername: text }))} placeholder="Email" placeholderTextColor="rgba(255,255,255,0.5)" autoCapitalize="none" keyboardType="email-address" onFocus={() => setFocusedField('login-email')} onBlur={() => setFocusedField('')} />
              <TextInput style={getInputStyle('login-password')} value={loginForm.password} onChangeText={(text) => setLoginForm((prev) => ({ ...prev, password: text }))} placeholder="Password" placeholderTextColor="rgba(255,255,255,0.5)" secureTextEntry autoCapitalize="none" onFocus={() => setFocusedField('login-password')} onBlur={() => setFocusedField('')} />
              <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotButton}>
                <Text style={styles.forgotText}>Forgot Password?</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.formWrap}>
              <TextInput style={getInputStyle('signup-name')} value={signUpForm.name} onChangeText={(text) => setSignUpForm((prev) => ({ ...prev, name: text }))} placeholder="Name" placeholderTextColor="rgba(255,255,255,0.5)" onFocus={() => setFocusedField('signup-name')} onBlur={() => setFocusedField('')} />
              <TextInput style={getInputStyle('signup-email')} value={signUpForm.email} onChangeText={(text) => setSignUpForm((prev) => ({ ...prev, email: text }))} placeholder="Email" placeholderTextColor="rgba(255,255,255,0.5)" autoCapitalize="none" keyboardType="email-address" onFocus={() => setFocusedField('signup-email')} onBlur={() => setFocusedField('')} />
              <TextInput style={getInputStyle('signup-password')} value={signUpForm.password} onChangeText={(text) => setSignUpForm((prev) => ({ ...prev, password: text }))} placeholder="Password" placeholderTextColor="rgba(255,255,255,0.5)" secureTextEntry autoCapitalize="none" onFocus={() => setFocusedField('signup-password')} onBlur={() => setFocusedField('')} />
            </View>
          )}

          <HoneyButton title={loading ? 'Please wait...' : isLogin ? 'Login' : 'Sign Up'} icon={isLogin ? 'log-in-outline' : 'person-add-outline'} onPress={handlePrimaryAction} style={styles.primaryAction} disabled={loading} />

          {loading && (<ActivityIndicator size="small" color={Colors.primary} style={styles.loader} />)}
          {!!errorMessage && (<View style={styles.errorBox}><Text style={styles.errorText}>{errorMessage}</Text></View>)}
        </GlassCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollView: { flex: 1, backgroundColor: Colors.background },
  content: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 20, backgroundColor: Colors.background },
  header: { alignItems: 'center', marginBottom: 20 },
  logo: { width: 100, height: 100, resizeMode: 'contain', borderWidth: 2, borderColor: 'rgba(251, 192, 45, 0.6)', borderRadius: 50, marginBottom: 14 },
  card: { backgroundColor: 'rgba(26, 26, 26, 0.8)', borderColor: 'rgba(251, 192, 45, 0.22)', borderWidth: 1, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.2, shadowRadius: 14, elevation: 7 },
  title: { ...Typography.h2, color: Colors.primaryLight, textAlign: 'center', marginBottom: 8 },
  subtitle: { ...Typography.body, textAlign: 'center' },
  toggleWrap: { flexDirection: 'row', borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', padding: 4, marginBottom: 16 },
  toggleButton: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  toggleButtonActive: { backgroundColor: 'rgba(251, 192, 45, 0.18)', borderWidth: 1, borderColor: 'rgba(251, 192, 45, 0.45)' },
  toggleText: { ...Typography.body, color: Colors.textSecondary, fontWeight: '600' },
  toggleTextActive: { color: Colors.primaryLight },
  formWrap: { gap: 12, marginBottom: 16 },
  input: { color: Colors.text, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.12)', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, backgroundColor: 'transparent' },
  inputFocused: { borderColor: Colors.primary, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 3 },
  forgotButton: { alignSelf: 'flex-end', marginTop: 2 },
  forgotText: { ...Typography.caption, color: Colors.primaryLight, fontWeight: '600' },
  primaryAction: { marginTop: 2 },
  loader: { marginTop: 10 },
  errorBox: { marginTop: 12, borderWidth: 1, borderColor: `${Colors.danger}55`, backgroundColor: `${Colors.danger}20`, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  errorText: { ...Typography.caption, color: Colors.danger, textAlign: 'center' },
});
