import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Typography } from '../theme/colors';

export default function NotesScreen() {
  return (
    <View style={styles.container}>
      <Text style={Typography.h2}>Notes</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: 20, justifyContent: 'center', alignItems: 'center' }
});
