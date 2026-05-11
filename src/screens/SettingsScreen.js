import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Switch, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeContext";
import { useUser } from "../context/UserContext";
import { resetUserData } from "../firebase/services/userService";
import HexagonBackground from "../components/HexagonBackground";

export default function SettingsScreen({ navigation }) {
  const { colors, Typography, isDarkMode, toggleTheme } = useTheme();
  const { userName, userId, isGuest, logout } = useUser();
  const [notifications, setNotifications] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const styles = getStyles(colors, Typography);

  const handleResetData = () => {
    if (isGuest) {
      Alert.alert('Guest Mode', 'No data to reset in guest mode.');
      return;
    }
    Alert.alert(
      'Reset All Data',
      'This will permanently delete all your sessions and tasks. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            const res = await resetUserData(userId);
            if (res.success) {
              Alert.alert('Done', 'All data has been reset.');
            } else {
              Alert.alert('Error', 'Failed to reset data: ' + res.error);
            }
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    const title = isGuest ? 'Exit Guest Mode' : 'Log Out';
    const message = isGuest
      ? 'Any unsaved data from this session will be lost. Continue?'
      : 'Are you sure you want to log out?';

    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: isGuest ? 'Exit' : 'Log Out',
        style: 'destructive',
        onPress: async () => {
          try {
            setLoggingOut(true);
            await logout();
          } catch (error) {
            console.error("Logout error:", error);
            Alert.alert("Error", error.message);
          } finally {
            setLoggingOut(false);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
      <HexagonBackground />
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Profile */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile</Text>
          <Text style={[styles.name, { color: colors.text }]}>{userName}</Text>
          {isGuest && (
            <Text style={[styles.guestBadge, { color: colors.textSecondary }]}>
              Guest Mode — data won't be saved
            </Text>
          )}
        </View>

        {/* Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          <View style={styles.row}>
            <Text style={[styles.label, { color: colors.text }]}>Dark Mode</Text>
            <Switch value={isDarkMode} onValueChange={toggleTheme} trackColor={{ false: colors.border, true: `${colors.primary}80` }} thumbColor={isDarkMode ? colors.primary : '#f4f3f4'} />
          </View>
          <View style={styles.row}>
            <Text style={[styles.label, { color: colors.text }]}>Notifications</Text>
            <Switch value={notifications} onValueChange={setNotifications} trackColor={{ false: colors.border, true: `${colors.primary}80` }} thumbColor={notifications ? colors.primary : '#f4f3f4'} />
          </View>
        </View>

        {/* App Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App</Text>
          <View style={styles.row}>
            <Text style={[styles.label, { color: colors.text }]}>Version</Text>
            <Text style={[styles.value, { color: colors.textSecondary }]}>1.0.0</Text>
          </View>
          <View style={styles.row}>
            <Text style={[styles.label, { color: colors.text }]}>About</Text>
            <Text style={[styles.value, { color: colors.textSecondary }]}>HiveMind</Text>
          </View>
        </View>

        {/* Logout */}
        <TouchableOpacity style={[styles.logoutButton, { backgroundColor: colors.shimmer }]} onPress={handleLogout} disabled={loggingOut}>
          <Text style={[styles.logoutText, { color: colors.text }]}>
            {loggingOut ? 'Logging out...' : isGuest ? 'Exit Guest Mode' : 'Log Out'}
          </Text>
        </TouchableOpacity>

        {/* Danger Zone — only for authenticated users */}
        {!isGuest && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Danger Zone</Text>
            <TouchableOpacity style={[styles.resetButton, { borderColor: `${colors.danger}33`, backgroundColor: `${colors.danger}14` }]} onPress={handleResetData}>
              <Text style={[styles.resetText, { color: colors.danger }]}>Reset All Data</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (colors, Typography) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  section: { marginBottom: 28 },
  sectionTitle: { ...Typography.h3, marginBottom: 16, color: colors.textSecondary },
  name: { fontSize: 18, fontWeight: "bold" },
  guestBadge: { fontSize: 13, marginTop: 6, fontStyle: 'italic' },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.glassBorder },
  label: { fontSize: 16 },
  value: {},
  logoutButton: { padding: 14, borderRadius: 10, alignItems: "center", marginBottom: 24 },
  logoutText: { fontWeight: "600" },
  resetButton: { marginTop: 10, padding: 14, borderRadius: 10, borderWidth: 1, alignItems: "center" },
  resetText: { fontWeight: "bold" },
});
