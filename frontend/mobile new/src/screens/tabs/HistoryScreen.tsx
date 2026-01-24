import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowUpRight, ArrowDownLeft, RefreshCw } from 'lucide-react-native';
import { loadWallet } from '../../lib/stellar';
import { authApi } from '../../lib/api/authApi';
import { Config } from '../../lib/config';

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
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = async () => {
    setRefreshing(true);
    setError(null);
    try {
      const token = await authApi.getStoredToken();
      const wallet = await loadWallet();

      if (!token || !wallet) {
        setError('Please authenticate first');
        setTransactions([]);
        return;
      }

      const publicKey = wallet.publicKey();

      const response = await fetch(
        `${Config.apiUrl}/transactions/user/${publicKey}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error('Failed to fetch transactions');
      }

      const data = await response.json();

      const transformedTransactions: Transaction[] = (
        data.transactions || []
      ).map((tx: any) => ({
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
    const diffDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    return date.toLocaleDateString();
  };

  const renderTransaction = ({ item }: { item: Transaction }) => (
    <View style={styles.transactionItem}>
      <View style={styles.transactionLeft}>
        <View
          style={[
            styles.transactionIcon,
            {
              backgroundColor:
                item.type === 'sent'
                  ? 'rgba(255, 90, 95, 0.2)'
                  : 'rgba(0, 200, 150, 0.2)',
            },
          ]}>
          {item.type === 'sent' ? (
            <ArrowUpRight size={18} color="#FF5A5F" />
          ) : (
            <ArrowDownLeft size={18} color="#00C896" />
          )}
        </View>
        <View>
          <Text style={styles.transactionTitle}>
            {item.type === 'sent' ? 'Sent' : 'Received'}
          </Text>
          <Text style={styles.transactionDate}>{formatDate(item.createdAt)}</Text>
        </View>
      </View>
      <Text
        style={[
          styles.transactionAmount,
          item.type === 'received' && styles.positiveAmount,
        ]}>
        {item.type === 'sent' ? '-' : '+'}
        {item.amount} {item.assetCode}
      </Text>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <RefreshCw size={48} color="#6B7280" />
      <Text style={styles.emptyTitle}>No transactions yet</Text>
      <Text style={styles.emptySubtitle}>
        Your transaction history will appear here
      </Text>
    </View>
  );

  const renderError = () => (
    <View style={styles.emptyState}>
      <Text style={styles.errorText}>{error}</Text>
      <TouchableOpacity onPress={fetchTransactions} style={styles.retryButton}>
        <Text style={styles.retryButtonText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Transaction History</Text>
      </View>

      {error ? (
        renderError()
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={item => item.id}
          renderItem={renderTransaction}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={!loading ? renderEmptyState : null}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={fetchTransactions}
              tintColor="#00E5FF"
            />
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0F',
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 100,
    flexGrow: 1,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  transactionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transactionTitle: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  transactionDate: {
    color: '#6B7280',
    fontSize: 13,
    marginTop: 2,
  },
  transactionAmount: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  positiveAmount: {
    color: '#4ADE80',
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtitle: {
    color: '#6B7280',
    fontSize: 14,
    marginTop: 8,
  },
  errorText: {
    color: '#F87171',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#00E5FF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#0A0A0F',
    fontWeight: 'bold',
  },
});
