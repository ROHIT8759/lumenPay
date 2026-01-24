













import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Dimensions, Alert } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    withRepeat,
    Easing,
    runOnJS
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { Check, Key, Shield } from 'lucide-react-native';

const Icons = {
    Check: Check as any,
    Key: Key as any,
    Shield: Shield as any,
};
import { createWallet, loadWallet } from '../lib/stellar'
import { walletAuth } from '../../lib/lumenVault';
import { Keypair } from '@stellar/stellar-sdk';
const { width } = Dimensions.get('window');

type SetupStatus = 'idle' | 'generating' | 'funding' | 'linking' | 'success' | 'error';

export default function WalletSetup() {
    const router = useRouter();
    const [status, setStatus] = useState<SetupStatus>('idle');
    const [publicKey, setPublicKey] = useState<string>('');
    const [errorMessage, setErrorMessage] = useState<string>('');


    const spin = useSharedValue(0);
    const scale = useSharedValue(1);
    const lockOpacity = useSharedValue(0);
    const buttonOpacity = useSharedValue(1);
    const keyScale = useSharedValue(0);

    const handleCreate = async () => {
        setStatus('generating');
        buttonOpacity.value = withTiming(0, { duration: 300 });


        spin.value = withRepeat(
            withTiming(360, { duration: 1000, easing: Easing.linear }),
            -1,
            false
        );

        try {

            const existingWallet = await loadWallet();
            if (existingWallet) {

                await handleLinkAndFinish(existingWallet);
                return;
            }


            setStatus('generating');
            const walletData = await createWallet(); // returns { publicKey, secret }

            const keypair = Keypair.fromSecret(walletData.secret);

            setPublicKey(walletData.publicKey);

            await handleLinkAndFinish(keypair);

        } catch (error: any) {
            console.error('Wallet creation failed:', error);
            setStatus('error');
            setErrorMessage(error.message || 'Failed to create wallet');
            spin.value = 0;
            buttonOpacity.value = withTiming(1, { duration: 300 });
        }
    };

    const handleLinkAndFinish = async (keypair: Keypair) => {
        try {
            setStatus('linking');
            const linkResult = await walletAuth.linkWalletWithKeypair(keypair);

            if (!linkResult.success) {
                console.warn("Linking failed, but wallet created/loaded locally.", linkResult.error);
                // Optional: fail strict or allow proceeding? 
                // User requirement implies Link is mandatory for Auth Mismatch Phase 2.
                // However, if backend is down, we might want to let them in? 
                // For now, let's treat it as critical or just log it?
                // The prompt says "Link Wallet ... to associate".
                // I'll throw to be safe.
                throw new Error(linkResult.error || 'Failed to link wallet');
            }

            handleSuccess(keypair.publicKey());
        } catch (e: any) {
            console.error(e);
            setStatus('error');
            setErrorMessage(e.message);
            spin.value = 0;
            buttonOpacity.value = withTiming(1, { duration: 300 });
        }
    }

    const handleSuccess = (pubKey: string) => {
        setStatus('success');
        setPublicKey(pubKey);


        spin.value = 0;
        scale.value = withSpring(1.2, { damping: 10 });
        lockOpacity.value = withTiming(1, { duration: 500 });
        keyScale.value = withSpring(1, { damping: 12 });


        setTimeout(() => {
            router.replace('/(tabs)/home');
        }, 2000);
    };

    const handleRetry = () => {
        setStatus('idle');
        setErrorMessage('');
        buttonOpacity.value = withTiming(1, { duration: 300 });
    };

    const particleStyle = useAnimatedStyle(() => ({
        transform: [{ rotate: `${spin.value}deg` }, { scale: scale.value }]
    }));

    const lockStyle = useAnimatedStyle(() => ({
        opacity: lockOpacity.value,
        transform: [{ scale: lockOpacity.value }]
    }));

    const buttonStyle = useAnimatedStyle(() => ({
        opacity: buttonOpacity.value
    }));

    const keyStyle = useAnimatedStyle(() => ({
        opacity: keyScale.value,
        transform: [{ scale: keyScale.value }]
    }));

    const getStatusText = () => {
        switch (status) {
            case 'generating':
                return 'Generating secure keys...';
            case 'funding':
                return 'Funding your account...';
            case 'success':
                return 'Wallet Created!';
            case 'error':
                return 'Something went wrong';
            default:
                return '';
        }
    };

    return (
        <View className="flex-1 bg-primary items-center justify-center px-6">
            { }
            <View className="items-center mb-12 space-y-4">
                <Text className="text-3xl font-bold text-white text-center">Your Money.</Text>
                <Text className="text-3xl font-bold text-accent text-center">Your Keys.</Text>
                <Text className="text-gray-400 text-center mt-4">
                    No emails. No passwords. Just you and the network.
                </Text>
            </View>

            { }
            <View className="h-40 w-40 items-center justify-center mb-8">
                { }
                <Animated.View style={[particleStyle, { position: 'absolute' }]}>
                    <View className="w-32 h-32 border-4 border-accent/30 rounded-full border-t-accent" />
                </Animated.View>

                { }
                <Animated.View style={[lockStyle]}>
                    <View className="w-20 h-20 bg-success rounded-full items-center justify-center shadow-lg shadow-success/50">
                        <Icons.Check size={40} color="white" />
                    </View>
                </Animated.View>
            </View>

            { }
            {status !== 'idle' && (
                <View className="mb-4">
                    <Text className={`text-center text-lg ${status === 'error' ? 'text-red-400' : 'text-gray-300'}`}>
                        {getStatusText()}
                    </Text>
                    {status === 'error' && (
                        <Text className="text-center text-red-400 text-sm mt-2">
                            {errorMessage}
                        </Text>
                    )}
                </View>
            )}

            { }
            {status === 'success' && publicKey && (
                <Animated.View style={keyStyle} className="mb-8 px-4">
                    <View className="bg-surface/50 rounded-xl p-4 border border-accent/20">
                        <View className="flex-row items-center gap-2 mb-2">
                            <Icons.Key size={16} color="#00E5FF" />
                            <Text className="text-accent text-sm font-medium">Your Public Key</Text>
                        </View>
                        <Text className="text-white font-mono text-xs" numberOfLines={2}>
                            {publicKey}
                        </Text>
                    </View>
                </Animated.View>
            )}

            { }
            <View className="flex-row items-center gap-2 mb-8 px-4 py-2 bg-success/10 rounded-full">
                <Icons.Shield size={16} color="#22C55E" />
                <Text className="text-success text-sm">Keys stored only on this device</Text>
            </View>

            { }
            <Animated.View style={[buttonStyle, { width: '100%' }]}>
                {status === 'error' ? (
                    <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={handleRetry}
                        className="w-full py-4 bg-red-500 rounded-2xl items-center shadow-lg"
                    >
                        <Text className="text-white font-bold text-lg">Try Again</Text>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={handleCreate}
                        disabled={status !== 'idle'}
                        className="w-full py-4 bg-white rounded-2xl items-center shadow-lg"
                    >
                        <Text className="text-primary font-bold text-lg">Create One-Tap Wallet</Text>
                    </TouchableOpacity>
                )}
                <Text className="text-gray-500 text-center mt-6 text-xs">
                    By creating a wallet, you agree to manage your own keys responsibly.
                </Text>
            </Animated.View>

            { }
            <TouchableOpacity
                className="mt-4"
                onPress={() => Alert.alert('Coming Soon', 'Import from secret key or mnemonic coming soon!')}
            >
                <Text className="text-accent text-sm">Already have a wallet? Import</Text>
            </TouchableOpacity>
        </View>
    );
}
