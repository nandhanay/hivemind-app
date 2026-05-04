import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function EmptyState({
  icon = 'folder-open-outline',
  title = 'Nothing here yet',
  subtitle = '',
  colors,
}) {
  const textColor = colors?.text || '#FFFFFF';
  const subColor = colors?.textSecondary || '#A0A0A0';
  const iconColor = colors?.textTertiary || '#666666';

  return (
    <View style={styles.container}>
      <Ionicons name={icon} size={48} color={iconColor} />
      <Text style={[styles.title, { color: textColor }]}>{title}</Text>
      {subtitle ? (
        <Text style={[styles.subtitle, { color: subColor }]}>{subtitle}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 14,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
});
