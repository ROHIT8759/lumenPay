import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView as RNSafeAreaView } from 'react-native-safe-area-context';
const SafeAreaView = RNSafeAreaView as any;
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withDelay } from 'react-native-reanimated';
const AnimatedView = Animated.View as any;
import { Check as CheckIcon } from 'lucide-react-native';
const Check = CheckIcon as any;
import { default as ExpoConfettiCannon } from 'react-native-confetti-cannon';
const ConfettiCannon = ExpoConfettiCannon as any;

export default function SuccessScreen() {
    const router = useRouter();
    const { amount } = useLocalSearchParams();

    const scale = useSharedValue(0);

    useEffect(() => {
        scale.value = withDelay(300, withSpring(1));
    }, []);

    const circleStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }]
    }));

    return (
        <SafeAreaView className="flex-1 bg-success items-center justify-center">
            <ConfettiCannon count={200} origin={{ x: -10, y: 0 }} fadeOut={true} />

            <AnimatedView style={[circleStyle]} className="w-32 h-32 bg-white rounded-full items-center justify-center mb-8 shadow-2xl">
                <Check size={60} color="#00C896" strokeWidth={3} />
            </AnimatedView>

            <Text className="text-white text-3xl font-bold mb-2">Payment Sent!</Text>
            <Text className="text-white/80 text-lg mb-12">You sent ${amount} USDC</Text>

            <TouchableOpacity
                onPress={() => router.push('/(tabs)/home')}
                className="bg-white px-12 py-4 rounded-2xl shadow-lg"
            >
                <Text className="text-success font-bold text-lg">Done</Text>
            </TouchableOpacity>
        </SafeAreaView>
    );
}
