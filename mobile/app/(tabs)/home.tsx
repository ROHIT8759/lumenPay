import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Bell, ArrowUpRight, ArrowDownLeft, Wallet, Shield, LucideProps } from 'lucide-react-native';

const Icons = {
    Bell: Bell as React.ComponentType<{ color?: string; size?: number }>,
    ArrowUpRight: ArrowUpRight as React.ComponentType<{ color?: string; size?: number }>,
    ArrowDownLeft: ArrowDownLeft as React.ComponentType<{ color?: string; size?: number }>,
    Wallet: Wallet as React.ComponentType<{ color?: string; size?: number }>,
    Shield: Shield as React.ComponentType<{ color?: string; size?: number }>,
};
import { loadWallet, getAccountDetails } from '../../lib/stellar';

export default function HomeScreen() {
    const router = useRouter();
    const [balance, setBalance] = useState('0.00');
    const [address, setAddress] = useState('');
    const [refreshing, setRefreshing] = useState(false);

    const fetchDat = async () => {
        setRefreshing(true);
        try {
            const wallet = await loadWallet();
            if (wallet) {
                setAddress(wallet.publicKey());
                const details = await getAccountDetails(wallet.publicKey());
                if (details) {
                    const native = (details.balances as Array<{ asset_type: string; balance: string }>).find(b => b.asset_type === 'native');
                    setBalance(native ? parseFloat(native.balance).toFixed(2) : '0.00');
                }
            }
        } catch (e: unknown) {
            console.error(e);
        } finally {
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchDat();
    }, []);

    return (
        <SafeAreaView className="flex-1 bg-primary">
            <ScrollView
                contentContainerStyle={{ paddingBottom: 100 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchDat} tintColor="#00E5FF" />}
            >
                { }
                <View className="px-6 py-4 flex-row justify-between items-center">
                    <View>
                        <Text className="text-gray-400 text-xs uppercase tracking-wider">Total Balance</Text>
                        <Text className="text-3xl font-bold text-white mt-1">
                            {balance}
                            <Text className="text-lg text-accent font-normal"> XLM</Text>
                        </Text>
                    </View>
                    <TouchableOpacity className="p-3 bg-white/5 rounded-full border border-white/10">
                        {/* @ts-ignore */}
                        <Icons.Bell size={20} color="white" />
                    </TouchableOpacity>
                </View>

                { }
                <View className="mx-6 mt-4">
                    <LinearGradient
                        colors={['#00E5FF', '#2979FF']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        className="rounded-3xl p-6 shadow-lg shadow-accent/20"
                    >
                        <View className="flex-row justify-between items-start mb-8">
                            <Icons.Wallet color="white" size={24} />
                            <View className="bg-black/20 px-3 py-1 rounded-full">
                                <Text className="text-white text-xs font-bold">Stellar Testnet</Text>
                            </View>
                        </View>

                        <Text className="text-white/80 text-xs mb-1">Wallet Address</Text>
                        <Text className="text-white font-mono text-xs" numberOfLines={1} ellipsizeMode="middle">
                            {address}
                        </Text>

                        <View className="flex-row mt-6 gap-4">
                            <TouchableOpacity
                                onPress={() => router.push('/pay/scan')}
                                className="flex-1 bg-white rounded-xl py-3 items-center"
                            >
                                <Text className="font-bold text-primary">Pay</Text>
                            </TouchableOpacity>

                            <TouchableOpacity className="flex-1 bg-black/20 rounded-xl py-3 items-center">
                                <Text className="font-bold text-white">Receive</Text>
                            </TouchableOpacity>
                        </View>
                    </LinearGradient>
                </View>

                { }
                <View className="px-6 mt-8">
                    <Text className="text-white font-bold text-lg mb-4">Quick Actions</Text>
                    <View className="flex-row justify-between">
                        {[
                            { icon: Icons.ArrowUpRight, label: 'Send', color: '#00E5FF', route: '/pay/scan' },
                            { icon: Icons.ArrowDownLeft, label: 'Request', color: '#00C896', route: null },
                            { icon: Icons.Shield, label: 'Verify', color: '#22C55E', route: '/kyc/verify' },
                            { icon: Icons.Wallet, label: 'Top Up', color: '#FF5A5F', route: null },
                        ].map((item, i) => (
                            <TouchableOpacity
                                key={i}
                                className="items-center gap-2"
                                onPress={() => item.route && router.push(item.route as any)}
                            >
                                <View className="w-14 h-14 rounded-2xl bg-surface border border-white/5 items-center justify-center">
                                    <item.icon color={item.color} size={24} />
                                </View>
                                <Text className="text-gray-400 text-xs">{item.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                { }
                <View className="px-6 mt-8">
                    <View className="flex-row justify-between items-center mb-4">
                        <Text className="text-white font-bold text-lg">Recent Activity</Text>
                        <TouchableOpacity onPress={() => router.push('/(tabs)/history')}>
                            <Text className="text-accent text-sm">See All</Text>
                        </TouchableOpacity>
                    </View>

                    <View className="bg-surface rounded-2xl p-4 border border-white/5 space-y-4">
                        <View className="flex-row items-center justify-between">
                            <View className="flex-row items-center gap-3">
                                <View className="w-10 h-10 rounded-full bg-red-500/20 items-center justify-center">
                                    <Icons.ArrowUpRight size={18} color="#FF5A5F" />
                                </View>
                                <View>
                                    <Text className="text-white font-bold">Starbucks Coffee</Text>
                                    <Text className="text-gray-500 text-xs">Today, 10:23 AM</Text>
                                </View>
                            </View>
                            <Text className="text-white font-bold">-$4.50</Text>
                        </View>

                        { }
                        <View className="h-[1px] bg-white/5" />

                        <View className="flex-row items-center justify-between">
                            <View className="flex-row items-center gap-3">
                                <View className="w-10 h-10 rounded-full bg-green-500/20 items-center justify-center">
                                    <Icons.ArrowDownLeft size={18} color="#00C896" />
                                </View>
                                <View>
                                    <Text className="text-white font-bold">Alice Sent You</Text>
                                    <Text className="text-gray-500 text-xs">Yesterday</Text>
                                </View>
                            </View>
                            <Text className="text-green-400 font-bold">+$25.00</Text>
                        </View>
                    </View>
                </View>

            </ScrollView>
        </SafeAreaView>
    );
}
