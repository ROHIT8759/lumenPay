import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, ShieldCheck, ArrowRight, Fingerprint } from 'lucide-react-native';

const Icons = {
    ArrowLeft: ArrowLeft as any,
    ShieldCheck: ShieldCheck as any,
    ArrowRight: ArrowRight as any,
    Fingerprint: Fingerprint as any,
};
import Animated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS } from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { loadWallet } from '../../lib/stellar';
import { useBiometrics } from '../../hooks/useBiometrics';
import { walletAuth } from '../../../lib/lumenVault';
import { API } from '../../../lib/config';
import { TransactionBuilder, Networks } from '@stellar/stellar-sdk';

export default function ConfirmScreen() {
    const router = useRouter();
    const { address, amount } = useLocalSearchParams();
    const [status, setStatus] = useState<'idle' | 'authenticating' | 'processing' | 'success' | 'failed'>('idle');


    const { isEnabled: biometricsEnabled, authenticateForPayment, biometricType } = useBiometrics();


    const offset = useSharedValue(0);
    const width = 300;
    const threshold = width * 0.7;

    const pan = Gesture.Pan()
        .onChange((event) => {
            if (status !== 'idle') return;
            offset.value = Math.min(Math.max(event.translationX, 0), width - 60);
        })
        .onFinalize(() => {
            if (offset.value > threshold) {
                offset.value = withSpring(width - 60);
                runOnJS(initiatePayment)();
            } else {
                offset.value = withSpring(0);
            }
        });

    const slideStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: offset.value }]
    }));


    async function initiatePayment() {
        if (!address || !amount) return;


        if (biometricsEnabled) {
            setStatus('authenticating');
            const authResult = await authenticateForPayment(String(amount), String(address));

            if (!authResult.success) {
                setStatus('idle');
                offset.value = withSpring(0);
                Alert.alert(
                    'Authentication Required',
                    authResult.error || 'Please authenticate to confirm payment',
                    [{ text: 'OK' }]
                );
                return;
            }
        }


        await handlePay();
    }

    async function handlePay() {
        setStatus('processing');

        try {
            // New Flow: 
            // 1. Build TX (Init)
            // 2. Sign Local
            // 3. Submit TX (Confirm)

            const buildResponse = await walletAuth.authenticatedFetch(API.TX.BUILD, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    destination: address,
                    amount: amount,
                    assetCode: 'USDC', // Assuming USDC based on UI, or make dynamic
                })
            });

            if (!buildResponse.ok) throw new Error('Failed to build transaction');
            const { xdr, networkPassphrase } = await buildResponse.json();

            // Sign
            const walletKeys = await loadWallet();
            if (!walletKeys) throw new Error('No local wallet found');

            const tx = TransactionBuilder.fromXDR(xdr, networkPassphrase || Networks.TESTNET);
            tx.sign(walletKeys);
            const signedXdr = tx.toXDR();

            // Submit
            const submitResponse = await walletAuth.authenticatedFetch(API.TX.SUBMIT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ signedXdr })
            });

            if (!submitResponse.ok) {
                const errData = await submitResponse.json();
                throw new Error(errData.error || 'Payment submission failed');
            }

            setStatus('success');
            setTimeout(() => {
                router.replace({ pathname: '/pay/success', params: { amount: String(amount) } });
            }, 500);
        } catch (e: any) {
            console.error(e);
            setStatus('failed');
            offset.value = withSpring(0);
            Alert.alert('Payment Failed', e.message);
        }
    }

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaView className="flex-1 bg-primary px-6 py-6">
                <View className="flex-row items-center mb-8">
                    <TouchableOpacity onPress={() => router.back()} disabled={status !== 'idle'}>
                        <Icons.ArrowLeft color="white" size={24} />
                    </TouchableOpacity>
                    <Text className="text-white font-bold text-lg ml-4">Review Payment</Text>
                </View>

                { }
                <View className="bg-surface rounded-3xl p-6 border border-white/5 space-y-6">
                    <View className="items-center">
                        <Text className="text-gray-400 text-xs uppercase tracking-wider mb-2">Total Amount</Text>
                        <View className="flex-row items-baseline">
                            <Text className="text-4xl font-bold text-white">${amount}</Text>
                            <Text className="text-gray-500 ml-2">USDC</Text>
                        </View>
                    </View>

                    <View className="space-y-4 pt-6 border-t border-white/5">
                        <View className="flex-row justify-between">
                            <Text className="text-gray-400">To</Text>
                            <Text className="text-white font-mono text-xs w-32 text-right" numberOfLines={1} ellipsizeMode="middle">
                                {address}
                            </Text>
                        </View>
                        <View className="flex-row justify-between">
                            <Text className="text-gray-400">Network Fee</Text>
                            <Text className="text-accent">0.00001 XLM</Text>
                        </View>
                        <View className="flex-row justify-between">
                            <Text className="text-gray-400">Time</Text>
                            <Text className="text-white">~3 seconds</Text>
                        </View>
                    </View>

                    <View className="bg-accent/10 p-4 rounded-xl flex-row items-center gap-3">
                        <Icons.ShieldCheck color="#00E5FF" size={20} />
                        <Text className="text-accent text-xs flex-1">
                            Secured by Stellar Network. Verified.
                        </Text>
                    </View>

                    { }
                    {biometricsEnabled && (
                        <View className="bg-green-500/10 p-4 rounded-xl flex-row items-center gap-3 mt-3">
                            <Icons.Fingerprint color="#22C55E" size={20} />
                            <Text className="text-green-400 text-xs flex-1">
                                {biometricType} verification enabled
                            </Text>
                        </View>
                    )}
                </View>

                <View className="flex-1" />

                { }
                <View className="bg-surface h-16 rounded-full justify-center relative border border-white/10 overflow-hidden">
                    <Text className="text-center text-white/50 font-bold ml-12">
                        {status === 'authenticating' ? `Verifying ${biometricType}...` :
                            status === 'processing' ? 'Processing...' : 'Slide to Pay'}
                    </Text>

                    <GestureDetector gesture={pan}>
                        <Animated.View className="absolute left-1 w-14 h-14 bg-accent rounded-full items-center justify-center shadow-lg shadow-accent/50" style={slideStyle}>
                            <Icons.ArrowRight color="#0B1C2D" size={24} />
                        </Animated.View>
                    </GestureDetector>
                </View>

                {status === 'failed' && (
                    <Text className="text-red-500 text-center mt-4">Payment Failed. Try again.</Text>
                )}
            </SafeAreaView>
        </GestureHandlerRootView>
    );
}
