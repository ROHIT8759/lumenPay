import React from 'react';
import { StyleSheet, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

interface BackgroundGradientProps {
  children: React.ReactNode;
}

export default function BackgroundGradient({ children }: BackgroundGradientProps) {
  return (
    <View style={styles.container}>
      {/* Base dark background */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#030014' }]} />

      {/* Purple glow from top */}
      <LinearGradient
        colors={['rgba(88, 28, 135, 0.4)', 'transparent']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.6 }}
        style={[StyleSheet.absoluteFill, { opacity: 0.6 }]}
      />

      {/* Blue accent from left */}
      <LinearGradient
        colors={['rgba(56, 189, 248, 0.2)', 'transparent']}
        start={{ x: 0, y: 0.4 }}
        end={{ x: 0.8, y: 0.8 }}
        style={[StyleSheet.absoluteFill, { opacity: 0.4 }]}
      />

      {/* Pink accent from right */}
      <LinearGradient
        colors={['rgba(236, 72, 153, 0.2)', 'transparent']}
        start={{ x: 1, y: 0.3 }}
        end={{ x: 0, y: 1 }}
        style={[StyleSheet.absoluteFill, { opacity: 0.3 }]}
      />

      {/* Content */}
      <View style={{ flex: 1 }}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#030014',
  },
});
