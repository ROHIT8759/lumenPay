import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import LinearGradient from 'react-native-linear-gradient';
import {
  Bell,
  ArrowUpRight,
  ArrowDownLeft,
  Wallet,
  Shield,
} from 'lucide-react-native';
import { RootStackParamList } from '../../navigation/types';
import { loadWallet, getAccountDetails } from '../../lib/stellar';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [balance, setBalance] = useState('0.00');
  const [address, setAddress] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    setRefreshing(true);
    try {
      const wallet = await loadWallet();
      if (wallet) {
        setAddress(wallet.publicKey());
        const details = await getAccountDetails(wallet.publicKey());
        if (details) {
          const native = (
            details.balances as Array<{ asset_type: string; balance: string }>
          ).find(b => b.asset_type === 'native');
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
    fetchData();
  }, []);

  const quickActions = [
    { icon: ArrowUpRight, label: 'Send', color: '#00E5FF', route: 'Scan' as const },
    { icon: ArrowDownLeft, label: 'Request', color: '#00C896', route: null },
    { icon: Shield, label: 'Verify', color: '#22C55E', route: 'KYCVerify' as const },
    { icon: Wallet, label: 'Top Up', color: '#FF5A5F', route: null },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={fetchData}
            tintColor="#00E5FF"
          />
        }>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.balanceLabel}>Total Balance</Text>
            <Text style={styles.balanceAmount}>
              {balance}
              <Text style={styles.balanceCurrency}> XLM</Text>
            </Text>
          </View>
          <TouchableOpacity style={styles.bellButton}>
            <Bell size={20} color="white" />
          </TouchableOpacity>
        </View>

        {/* Wallet Card */}
        <View style={styles.cardContainer}>
          <LinearGradient
            colors={['#00E5FF', '#2979FF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.walletCard}>
            <View style={styles.cardHeader}>
              <Wallet color="white" size={24} />
              <View style={styles.networkBadge}>
                <Text style={styles.networkText}>Stellar Testnet</Text>
              </View>
            </View>

            <Text style={styles.addressLabel}>Wallet Address</Text>
            <Text style={styles.addressText} numberOfLines={1}>
              {address}
            </Text>

            <View style={styles.cardButtons}>
              <TouchableOpacity
                onPress={() => navigation.navigate('Scan')}
                style={styles.payButton}>
                <Text style={styles.payButtonText}>Pay</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.receiveButton}>
                <Text style={styles.receiveButtonText}>Receive</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActions}>
            {quickActions.map((item, i) => (
              <TouchableOpacity
                key={i}
                style={styles.quickActionItem}
                onPress={() => item.route && navigation.navigate(item.route)}>
                <View style={styles.quickActionIcon}>
                  <item.icon color={item.color} size={24} />
                </View>
                <Text style={styles.quickActionLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Recent Activity */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('Main', { screen: 'History' })}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.activityCard}>
            <View style={styles.activityItem}>
              <View style={styles.activityLeft}>
                <View style={[styles.activityIcon, { backgroundColor: 'rgba(255, 90, 95, 0.2)' }]}>
                  <ArrowUpRight size={18} color="#FF5A5F" />
                </View>
                <View>
                  <Text style={styles.activityTitle}>Starbucks Coffee</Text>
                  <Text style={styles.activityDate}>Today, 10:23 AM</Text>
                </View>
              </View>
              <Text style={styles.activityAmount}>-$4.50</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.activityItem}>
              <View style={styles.activityLeft}>
                <View style={[styles.activityIcon, { backgroundColor: 'rgba(0, 200, 150, 0.2)' }]}>
                  <ArrowDownLeft size={18} color="#00C896" />
                </View>
                <View>
                  <Text style={styles.activityTitle}>Alice Sent You</Text>
                  <Text style={styles.activityDate}>Yesterday</Text>
                </View>
              </View>
              <Text style={styles.activityAmountPositive}>+$25.00</Text>
            </View>
          </View>
        </View>
      </ScrollView>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceLabel: {
    color: '#9CA3AF',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  balanceAmount: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 4,
  },
  balanceCurrency: {
    fontSize: 18,
    color: '#00E5FF',
    fontWeight: 'normal',
  },
  bellButton: {
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cardContainer: {
    marginHorizontal: 24,
    marginTop: 16,
  },
  walletCard: {
    borderRadius: 24,
    padding: 24,
    shadowColor: '#00E5FF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 32,
  },
  networkBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  networkText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  addressLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    marginBottom: 4,
  },
  addressText: {
    color: '#FFFFFF',
    fontFamily: 'monospace',
    fontSize: 12,
  },
  cardButtons: {
    flexDirection: 'row',
    marginTop: 24,
    gap: 16,
  },
  payButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  payButtonText: {
    fontWeight: 'bold',
    color: '#0A0A0F',
  },
  receiveButton: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  receiveButtonText: {
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  section: {
    paddingHorizontal: 24,
    marginTop: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 18,
    marginBottom: 16,
  },
  seeAll: {
    color: '#00E5FF',
    fontSize: 14,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickActionItem: {
    alignItems: 'center',
    gap: 8,
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#1F2937',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionLabel: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  activityCard: {
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  activityLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityTitle: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  activityDate: {
    color: '#6B7280',
    fontSize: 12,
  },
  activityAmount: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  activityAmountPositive: {
    color: '#4ADE80',
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginVertical: 16,
  },
});
