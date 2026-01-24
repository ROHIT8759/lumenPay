import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView as RNSafeAreaView } from 'react-native-safe-area-context';
const SafeAreaView = RNSafeAreaView as any;
import { useRouter } from 'expo-router';
import { ArrowUpRight as ArrowUpRightIcon, ArrowDownLeft as ArrowDownLeftIcon, RefreshCw as RefreshCwIcon } from 'lucide-react-native';
const ArrowUpRight = ArrowUpRightIcon as any;
const ArrowDownLeft = ArrowDownLeftIcon as any;
const RefreshCw = RefreshCwIcon as any;
import { loadWallet } from '../../lib/stellar';
import { authApi } from '../../lib/api/authApi';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001/api';

interface Transaction {
    id: string;
    from: string;
    to: string;
    amount: string;
    assetCode: string;
    type: 'sent' | 'received';
    status: string;
    hash: string;
    createdAt: string;
}

export default function HistoryScreen() {
    const router = useRouter();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchTransactions = async () => {
        setRefreshing(true);
        setError(null);
        try {
            // Get authenticated token and user's public key
            const token = await authApi.getStoredToken();
            const wallet = await loadWallet();

            if (!token || !wallet) {
                setError('Please authenticate first');
                setTransactions([]);
                return;
            }

            const publicKey = wallet.publicKey();

            // Fetch transactions from backend
            // Note: This endpoint would need to be added to backend/routes/transactions.ts
            // For now, this will show empty state until the user makes transactions
            const response = await fetch(`${API_BASE}/transactions/user/${publicKey}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch transactions');
            }

            const data = await response.json();

            // Transform backend data to match frontend interface
            const transformedTransactions: Transaction[] = (data.transactions || []).map((tx: any) => ({
                id: tx.id,
                from: tx.from_address,
                to: tx.to_address,
                amount: tx.amount,
                assetCode: tx.asset_code || 'XLM',
                type: tx.from_address === publicKey ? 'sent' : 'received',
                status: tx.status,
                hash: tx.tx_hash,
                createdAt: tx.created_at,
            }));

            setTransactions(transformedTransactions);
        } catch (e: any) {
            console.error('Failed to fetch transactions:', e);
            setError(e.message || 'Failed to load transactions');
            // Show empty state on error
            setTransactions([]);
        } finally {
            setRefreshing(false);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTransactions();
    }, []);

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        return date.toLocaleDateString();
    };

    const renderTransaction = ({ item }: { item: Transaction }) => {
        const isSent = item.type === 'sent';

        return (
            <TouchableOpacity
                className="flex-row items-center justify-between py-4 border-b border-white/5"
                onPress={() => {

                }}
            >
                <View className="flex-row items-center gap-3">
                    <View className={`w-10 h-10 rounded-full items-center justify-center ${isSent ? 'bg-red-500/20' : 'bg-green-500/20'
                        }`}>
                        {isSent ? (
                            <ArrowUpRight size={18} color="#FF5A5F" />
                        ) : (
                            <ArrowDownLeft size={18} color="#00C896" />
                        )}
                    </View>
                    <View>
                        <Text className="text-white font-bold">
                            {isSent ? 'Sent' : 'Received'}
                        </Text>
                        <Text className="text-gray-500 text-xs">
                            {formatDate(item.createdAt)} • {item.hash.slice(0, 8)}...
                        </Text>
                    </View>
                </View>
                <View className="items-end">
                    <Text className={`font-bold ${isSent ? 'text-white' : 'text-green-400'}`}>
                        {isSent ? '-' : '+'}{item.amount} {item.assetCode}
                    </Text>
                    <Text className={`text-xs ${item.status === 'success' ? 'text-green-400' : 'text-yellow-400'
                        }`}>
                        {item.status}
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView className="flex-1 bg-primary">
            { }
            <View className="px-6 py-4 flex-row justify-between items-center border-b border-white/5">
                <Text className="text-white text-xl font-bold">Transaction History</Text>
                <TouchableOpacity onPress={fetchTransactions} className="p-2">
                    <RefreshCw size={20} color="#00E5FF" />
                </TouchableOpacity>
            </View>

            {loading ? (
                <View className="flex-1 items-center justify-center">
                    <Text className="text-gray-400">Loading transactions...</Text>
                </View>
            ) : transactions.length === 0 ? (
                <View className="flex-1 items-center justify-center px-6">
                    <View className="w-20 h-20 bg-surface rounded-full items-center justify-center mb-4">
                        <ArrowUpRight size={32} color="#6B7280" />
                    </View>
                    <Text className="text-white font-bold text-lg mb-2">No Transactions Yet</Text>
                    <Text className="text-gray-500 text-center">
                        Your transaction history will appear here once you start making payments.
                    </Text>
                    <TouchableOpacity
                        onPress={() => router.push('/pay/scan')}
                        className="mt-6 bg-accent px-6 py-3 rounded-xl"
                    >
                        <Text className="text-primary font-bold">Make Your First Payment</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={transactions}
                    keyExtractor={(item) => item.id}
                    renderItem={renderTransaction}
                    contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 100 }}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={fetchTransactions}
                            tintColor="#00E5FF"
                        />
                    }
                />
            )}
        </SafeAreaView>
    );
}
