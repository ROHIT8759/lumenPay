import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';

interface GlassViewProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export default function GlassView({ children, style }: GlassViewProps) {
  return <View style={[styles.container, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
});
