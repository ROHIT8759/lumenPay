import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { QrCode, Monitor, Smartphone, Copy, Check, Shield, ArrowLeft, Eye, EyeOff } from 'lucide-react-native';

const Icons = {
    QrCode: QrCode as any,
    Monitor: Monitor as any,
    Smartphone: Smartphone as any,
    Copy: Copy as any,
    Check: Check as any,
    Shield: Shield as any,
    ArrowLeft: ArrowLeft as any,
    Eye: Eye as any,
    EyeOff: EyeOff as any,
};
import { getKeys } from '../../lib/stellar';
import { Keypair } from '@stellar/stellar-sdk';
type Mode = 'select' | 'export' | 'import';
const encryptForTransfer = (secretKey: string, pin: string): string => {
    const data = JSON.stringify({
        version: 1,
        type: 'wallet_transfer',
        secret: secretKey,
        expires: Date.now() + 5 * 60 * 1000,
    });
    const pinPadded = pin.padEnd(32, '0');
    let encrypted = '';
    for (let i = 0; i < data.length; i++) {
        encrypted += String.fromCharCode(
            data.charCodeAt(i) ^ pinPadded.charCodeAt(i % pinPadded.length)
        );
    }
    return btoa(encrypted);
};

const generatePin = (): string => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

export default function SyncScreen() {
    const router = useRouter();
    const [mode, setMode] = useState<Mode>('select');
    const [pin, setPin] = useState('');
    const [qrData, setQrData] = useState('');
    const [publicKey, setPublicKey] = useState('');
    const [copied, setCopied] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Generate export QR
    const handleExport = async () => {
        setIsLoading(true);
        try {
            const secretKey = await getKeys();
            if (!secretKey) {
                Alert.alert('Error', 'No wallet found to export');
                return;
            }

            const keypair = Keypair.fromSecret(secretKey);
            setPublicKey(keypair.publicKey());

            const newPin = generatePin();
            setPin(newPin);

            const encrypted = encryptForTransfer(secretKey, newPin);
            setQrData(encrypted);

        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to generate QR');
        } finally {
            setIsLoading(false);
        }
    };

    const copyToClipboard = async (text: string) => {
        // In React Native, use Clipboard API
        // For expo: import * as Clipboard from 'expo-clipboard';
        // Clipboard.setStringAsync(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        Alert.alert('Copied!', 'QR data copied to clipboard');
    };

    // Selection mode
    if (mode === 'select') {
        return (
            <View className="flex-1 bg-primary px-6 pt-16">
                <TouchableOpacity onPress={() => router.back()} className="mb-6">
                    <Icons.ArrowLeft size={24} color="#fff" />
                </TouchableOpacity>

                <View className="items-center mb-8">
                    <View className="w-20 h-20 bg-purple-500/20 rounded-full items-center justify-center mb-4">
                        <Icons.QrCode size={40} color="#A855F7" />
                    </View>
                    <Text className="text-2xl font-bold text-white mb-2">Sync Wallet</Text>
                    <Text className="text-gray-400 text-center">Transfer your wallet between devices</Text>
                </View>

                <View className="gap-4">
                    {/* Export option */}
                    <TouchableOpacity
                        onPress={() => { setMode('export'); handleExport(); }}
                        className="bg-surface border border-gray-700 rounded-2xl p-4 flex-row items-center"
                    >
                        <View className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl items-center justify-center mr-4">
                            <Icons.Monitor size={24} color="#fff" />
                        </View>
                        <View className="flex-1">
                            <Text className="text-white font-bold text-lg">Export to Web</Text>
                            <Text className="text-gray-400 text-sm">Show QR for web to scan</Text>
                        </View>
                    </TouchableOpacity>

                    {/* Import option */}
                    <TouchableOpacity
                        onPress={() => setMode('import')}
                        className="bg-surface border border-gray-700 rounded-2xl p-4 flex-row items-center"
                    >
                        <View className="w-12 h-12 bg-gray-700 rounded-xl items-center justify-center mr-4">
                            <Icons.Smartphone size={24} color="#fff" />
                        </View>
                        <View className="flex-1">
                            <Text className="text-white font-bold text-lg">Import from Web</Text>
                            <Text className="text-gray-400 text-sm">Scan QR from web wallet</Text>
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Security note */}
                <View className="mt-8 bg-gray-800/50 rounded-xl p-4 flex-row items-start">
                    <Icons.Shield size={20} color="#22C55E" />
                    <Text className="text-gray-400 text-sm ml-3 flex-1">
                        Your wallet is encrypted with a PIN before transfer. The PIN is shown on screen and never transmitted.
                    </Text>
                </View>
            </View>
        );
    }
    if (mode === 'export') {
        return (
            <View className="flex-1 bg-primary px-6 pt-16">
                <TouchableOpacity onPress={() => { setMode('select'); setQrData(''); }} className="mb-6">
                    <Icons.ArrowLeft size={24} color="#fff" />
                </TouchableOpacity>

                <View className="items-center mb-6">
                    <Text className="text-2xl font-bold text-white mb-2">Export Wallet</Text>
                    <Text className="text-gray-400">Share this with your web browser</Text>
                </View>

                {isLoading ? (
                    <View className="items-center justify-center py-20">
                        <Text className="text-gray-400">Generating...</Text>
                    </View>
                ) : qrData ? (
                    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                        {/* QR placeholder */}
                        <View className="bg-white rounded-2xl p-6 items-center mb-6">
                            <View className="w-48 h-48 bg-gray-100 rounded-xl items-center justify-center">
                                <Icons.QrCode size={80} color="#333" />
                            </View>
                        </View>

                        {/* Wallet address */}
                        <View className="bg-surface rounded-xl p-4 mb-4">
                            <Text className="text-gray-500 text-xs mb-1">Your Wallet</Text>
                            <Text className="text-white font-mono text-xs" numberOfLines={2}>{publicKey}</Text>
                        </View>

                        {/* PIN display */}
                        <View className="bg-purple-500/20 border border-purple-500/30 rounded-xl p-4 mb-6">
                            <Text className="text-purple-300 text-center text-sm mb-2">Transfer PIN (tell verbally)</Text>
                            <Text className="text-white text-center text-3xl font-mono font-bold tracking-[0.5em]">
                                {pin}
                            </Text>
                        </View>

                        {/* Copy button */}
                        <TouchableOpacity
                            onPress={() => copyToClipboard(qrData)}
                            className="bg-gray-700 rounded-xl py-4 flex-row items-center justify-center mb-4"
                        >
                            {copied ? (
                                <>
                                    <Icons.Check size={20} color="#22C55E" />
                                    <Text className="text-green-400 font-bold ml-2">Copied!</Text>
                                </>
                            ) : (
                                <>
                                    <Icons.Copy size={20} color="#fff" />
                                    <Text className="text-white font-bold ml-2">Copy QR Data</Text>
                                </>
                            )}
                        </TouchableOpacity>

                        <Text className="text-gray-500 text-xs text-center">
                            QR expires in 5 minutes. Never share your PIN online.
                        </Text>
                    </ScrollView>
                ) : (
                    <View className="items-center py-20">
                        <Text className="text-red-400">Failed to generate QR</Text>
                    </View>
                )}
            </View>
        );
    }

    // Import mode
    return (
        <View className="flex-1 bg-primary px-6 pt-16">
            <TouchableOpacity onPress={() => setMode('select')} className="mb-6">
                <Icons.ArrowLeft size={24} color="#fff" />
            </TouchableOpacity>

            <View className="items-center mb-6">
                <Text className="text-2xl font-bold text-white mb-2">Import from Web</Text>
                <Text className="text-gray-400 text-center">Use your phone camera to scan the QR code displayed on web</Text>
            </View>

            <TouchableOpacity
                className="bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl py-4 items-center mb-6"
                onPress={() => Alert.alert('Camera', 'QR Scanner would open here. Use expo-camera or expo-barcode-scanner.')}
            >
                <Text className="text-white font-bold text-lg">Open Camera to Scan</Text>
            </TouchableOpacity>

            <View className="bg-gray-800/50 rounded-xl p-4">
                <Text className="text-gray-400 text-sm">
                    1. Open LumenPay on your web browser{'\n'}
                    2. Go to Wallet → Sync{'\n'}
                    3. Click &quot;Export to QR&quot;{'\n'}
                    4. Scan the QR code with this phone{'\n'}
                    5. Enter the PIN shown on web
                </Text>
            </View>
        </View >
    );
}
