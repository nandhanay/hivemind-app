import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ScrollView,
} from "react-native";
import { Colors, Typography } from "../theme/colors";

export default function SettingsScreen() {
  const [darkMode, setDarkMode] = useState(true);
  const [notifications, setNotifications] = useState(false);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
            {/* Profile */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Profile</Text>
        <Text style={styles.name}>Nandhana</Text>
      </View>

      {/* Preferences */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preferences</Text>

        <View style={styles.row}>
          <Text style={styles.label}>Dark Mode</Text>
          <Switch value={darkMode} onValueChange={setDarkMode} />
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Notifications</Text>
          <Switch value={notifications} onValueChange={setNotifications} />
        </View>
      </View>

      {/* App Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>App</Text>

        <View style={styles.row}>
          <Text style={styles.label}>Version</Text>
          <Text style={styles.value}>1.0.0</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>About</Text>
          <Text style={styles.value}>HiveMind</Text>
        </View>
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutButton}>
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>

      {/* Danger Zone */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Danger Zone</Text>

        <TouchableOpacity style={styles.resetButton}>
          <Text style={styles.resetText}>Reset All Data</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: 20,
    paddingTop: 40,
  },

  title: {
    ...Typography.h1,
    marginBottom: 28,
  },

  section: {
    marginBottom: 28,
  },

  sectionTitle: {
    ...Typography.h3,
    marginBottom: 16,
    color: Colors.textSecondary,
  },

  name: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.text,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },

  label: {
    fontSize: 16,
    color: Colors.text,
  },

  value: {
    color: Colors.textSecondary,
  },

  logoutButton: {
    padding: 14,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    marginBottom: 24,
  },

  logoutText: {
    color: Colors.text,
    fontWeight: "600",
  },

  resetButton: {
    marginTop: 10,
    padding: 14,
    borderRadius: 10,
    backgroundColor: "rgba(255,0,0,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,0,0,0.2)",
    alignItems: "center",
  },

  resetText: {
    color: Colors.danger,
    fontWeight: "bold",
  },
});
