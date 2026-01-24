import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
} from 'react-native-reanimated';
import { Check } from 'lucide-react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import { RootStackParamList } from '../../navigation/types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Success'>;
type SuccessRouteProp = RouteProp<RootStackParamList, 'Success'>;

export default function SuccessScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<SuccessRouteProp>();
  const { amount } = route.params;

  const scale = useSharedValue(0);

  useEffect(() => {
    scale.value = withDelay(300, withSpring(1));
  }, [scale]);

  const circleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <SafeAreaView style={styles.container}>
      <ConfettiCannon count={200} origin={{ x: -10, y: 0 }} fadeOut />

      <Animated.View style={[styles.successCircle, circleStyle]}>
        <Check size={60} color="#22C55E" strokeWidth={3} />
      </Animated.View>

      <Text style={styles.title}>Payment Sent!</Text>
      <Text style={styles.subtitle}>You sent ${amount} USDC</Text>

      <TouchableOpacity
        onPress={() => navigation.navigate('Main', { screen: 'Home' })}
        style={styles.button}>
        <Text style={styles.buttonText}>Done</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successCircle: {
    width: 128,
    height: 128,
    backgroundColor: '#FFFFFF',
    borderRadius: 64,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 18,
    marginBottom: 48,
  },
  button: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonText: {
    color: '#22C55E',
    fontWeight: 'bold',
    fontSize: 18,
  },
});
