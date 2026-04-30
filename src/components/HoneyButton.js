import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Colors } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';

export default function HoneyButton({ title, onPress, icon, style, variant = 'primary' }) {
  const isPrimary = variant === 'primary';
  
  return (
    <TouchableOpacity 
      style={[
        styles.button, 
        isPrimary ? styles.primaryBg : styles.secondaryBg,
        style
      ]} 
      onPress={onPress}
      activeOpacity={0.8}
    >
      {icon && <Ionicons name={icon} size={20} color={isPrimary ? '#000' : Colors.primary} style={styles.icon} />}
      <Text style={[
        styles.text, 
        isPrimary ? styles.primaryText : styles.secondaryText
      ]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 30,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  primaryBg: {
    backgroundColor: Colors.primary,
  },
  secondaryBg: {
    backgroundColor: Colors.surfaceHighlight,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  icon: {
    marginRight: 8,
  },
  text: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  primaryText: {
    color: '#000',
  },
  secondaryText: {
    color: Colors.primary,
  }
});
