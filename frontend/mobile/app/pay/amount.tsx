import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Delete } from 'lucide-react-native';

export default function AmountScreen() {
    const router = useRouter();
    const { address } = useLocalSearchParams();
    const [amount, setAmount] = useState('0');

    const handlePress = (val: string) => {
        if (amount === '0' && val !== '.') {
            setAmount(val);
        } else {
            if (val === '.' && amount.includes('.')) return;
            setAmount(prev => prev + val);
        }
    };

    const handleDelete = () => {
        if (amount.length === 1) {
            setAmount('0');
        } else {
            setAmount(prev => prev.slice(0, -1));
        }
    };

    const handleContinue = () => {
        router.push({ pathname: '/pay/confirm', params: { address, amount } });
    };

    return (
        <SafeAreaView className="flex-1 bg-primary">
            {}
            <View className="flex-row items-center p-6">
                <TouchableOpacity onPress={() => router.back()}>
                    <ArrowLeft color="white" size={24} />
                </TouchableOpacity>
                <Text className="text-white font-bold text-lg ml-4">Enter Amount</Text>
            </View>

            {}
            <View className="items-center justify-center flex-1">
                <View className="flex-row items-baseline">
                    <Text className="text-4xl text-gray-400 mr-2">$</Text>
                    <Text className="text-6xl text-white font-bold">{amount}</Text>
                </View>
                <Text className="text-gray-500 mt-2">
                    ≈ {(parseFloat(amount) * 83.5).toFixed(2)} INR
                </Text>

                <View className="bg-surface px-4 py-2 rounded-full mt-6 border border-white/10">
                    <Text className="text-gray-400 text-xs">
                        To: <Text className="text-white font-mono">{String(address).slice(0, 6)}...{String(address).slice(-4)}</Text>
                    </Text>
                </View>
            </View>

            {}
            <View className="px-6 pb-8">
                <View className="flex-row flex-wrap justify-between">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, '.', 0].map((num) => (
                        <TouchableOpacity
                            key={num}
                            onPress={() => handlePress(String(num))}
                            className="w-[30%] h-20 items-center justify-center m-1 rounded-2xl bg-white/5 active:bg-white/10"
                        >
                            <Text className="text-2xl text-white font-bold">{num}</Text>
                        </TouchableOpacity>
                    ))}
                    <TouchableOpacity
                        onPress={handleDelete}
                        className="w-[30%] h-20 items-center justify-center m-1 rounded-2xl bg-white/5 active:bg-white/10"
                    >
                        <Delete color="#FF5A5F" size={24} />
                    </TouchableOpacity>
                </View>

                <TouchableOpacity
                    onPress={handleContinue}
                    disabled={amount === '0'}
                    className={`w-full py-4 rounded-xl mt-6 items-center ${amount === '0' ? 'bg-gray-700' : 'bg-accent'}`}
                >
                    <Text className={`font-bold text-lg ${amount === '0' ? 'text-gray-500' : 'text-primary'}`}>
                        Review Payment
                    </Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}
