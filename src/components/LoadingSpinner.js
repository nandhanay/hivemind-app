import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';

export default function LoadingSpinner({ message = 'Loading...', colors }) {
  const spinnerColor = colors?.primary || '#FBC02D';
  const bgColor = colors?.background || '#0D0D0D';
  const textColor = colors?.textSecondary || '#A0A0A0';

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <ActivityIndicator size="large" color={spinnerColor} />
      {message && <Text style={[styles.message, { color: textColor }]}>{message}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  message: {
    marginTop: 16,
    fontSize: 15,
    fontWeight: '500',
  },
});
