import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowLeft, Delete } from 'lucide-react-native';
import { RootStackParamList } from '../../navigation/types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Amount'>;
type AmountRouteProp = RouteProp<RootStackParamList, 'Amount'>;

export default function AmountScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<AmountRouteProp>();
  const { address } = route.params;
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
    navigation.navigate('Confirm', { address, amount });
  };

  const keys = [1, 2, 3, 4, 5, 6, 7, 8, 9, '.', 0];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ArrowLeft color="white" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Enter Amount</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Amount Display */}
      <View style={styles.amountContainer}>
        <View style={styles.amountRow}>
          <Text style={styles.currency}>$</Text>
          <Text style={styles.amount}>{amount}</Text>
        </View>
        <Text style={styles.conversion}>
          ≈ {(parseFloat(amount) * 83.5).toFixed(2)} INR
        </Text>

        <View style={styles.recipientBadge}>
          <Text style={styles.recipientLabel}>
            To:{' '}
            <Text style={styles.recipientAddress}>
              {address.slice(0, 6)}...{address.slice(-4)}
            </Text>
          </Text>
        </View>
      </View>

      {/* Keypad */}
      <View style={styles.keypadContainer}>
        <View style={styles.keypad}>
          {keys.map(num => (
            <TouchableOpacity
              key={num}
              onPress={() => handlePress(String(num))}
              style={styles.key}>
              <Text style={styles.keyText}>{num}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity onPress={handleDelete} style={styles.key}>
            <Delete color="#FF5A5F" size={24} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={handleContinue}
          disabled={amount === '0'}
          style={[
            styles.continueButton,
            amount === '0' && styles.continueButtonDisabled,
          ]}>
          <Text
            style={[
              styles.continueButtonText,
              amount === '0' && styles.continueButtonTextDisabled,
            ]}>
            Review Payment
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0F',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 18,
  },
  amountContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  currency: {
    fontSize: 36,
    color: '#9CA3AF',
    marginRight: 8,
  },
  amount: {
    fontSize: 64,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  conversion: {
    color: '#6B7280',
    marginTop: 8,
  },
  recipientBadge: {
    backgroundColor: '#1F2937',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  recipientLabel: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  recipientAddress: {
    color: '#FFFFFF',
    fontFamily: 'monospace',
  },
  keypadContainer: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  keypad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  key: {
    width: '30%',
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    margin: '1.5%',
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  keyText: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  continueButton: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 24,
    alignItems: 'center',
    backgroundColor: '#00E5FF',
  },
  continueButtonDisabled: {
    backgroundColor: '#374151',
  },
  continueButtonText: {
    fontWeight: 'bold',
    fontSize: 18,
    color: '#0A0A0F',
  },
  continueButtonTextDisabled: {
    color: '#6B7280',
  },
});
