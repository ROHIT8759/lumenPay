import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { ArrowLeft, ShieldCheck, ArrowRight, Fingerprint } from 'lucide-react-native';
import { RootStackParamList } from '../../navigation/types';
import { useBiometrics } from '../../hooks/useBiometrics';
import { LumenVault } from '../../lib/lumenvault/LumenVault';
import { paymentApi } from '../../lib/api/paymentApi';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Confirm'>;
type ConfirmRouteProp = RouteProp<RootStackParamList, 'Confirm'>;

type PaymentStatus = 'idle' | 'authenticating' | 'processing' | 'success' | 'failed';

export default function ConfirmScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ConfirmRouteProp>();
  const { address, amount } = route.params;
  const [status, setStatus] = useState<PaymentStatus>('idle');

  const { isEnabled: biometricsEnabled, authenticateForPayment, biometricType } = useBiometrics();

  const offset = useSharedValue(0);
  const width = 300;
  const threshold = width * 0.7;

  const pan = Gesture.Pan()
    .onChange(event => {
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
    transform: [{ translateX: offset.value }],
  }));

  async function initiatePayment() {
    if (!address || !amount) return;

    if (biometricsEnabled) {
      setStatus('authenticating');
      const authResult = await authenticateForPayment(amount, address);

      if (!authResult.success) {
        setStatus('idle');
        offset.value = withSpring(0);
        Alert.alert(
          'Authentication Required',
          authResult.error || 'Please authenticate to confirm payment',
          [{ text: 'OK' }],
        );
        return;
      }
    }

    await handlePay();
  }

  async function handlePay() {
    setStatus('processing');

    try {
      // 1. Build TX
      const buildResult = await paymentApi.buildPayment({
        to: address,
        amount: amount,
        assetCode: 'USDC',
      });

      // 2. Sign
      const signedResult = await LumenVault.signTransaction(buildResult.xdr);

      // 3. Submit
      await paymentApi.submitSignedPayment({
        signedXDR: signedResult.signedXdr,
        to: address,
        amount: amount,
        assetCode: 'USDC',
      });

      setStatus('success');
      setTimeout(() => {
        navigation.replace('Success', { amount });
      }, 500);
    } catch (e: any) {
      console.error(e);
      setStatus('failed');
      offset.value = withSpring(0);
      Alert.alert('Payment Failed', e.message);
    }
  }

  const getStatusText = () => {
    switch (status) {
      case 'authenticating':
        return 'Authenticating...';
      case 'processing':
        return 'Processing payment...';
      case 'success':
        return 'Payment successful!';
      case 'failed':
        return 'Payment failed';
      default:
        return '';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          disabled={status !== 'idle'}>
          <ArrowLeft color="white" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Review Payment</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Payment Details Card */}
      <View style={styles.card}>
        <View style={styles.amountSection}>
          <Text style={styles.amountLabel}>Total Amount</Text>
          <View style={styles.amountRow}>
            <Text style={styles.amount}>${amount}</Text>
            <Text style={styles.currency}>USDC</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.detailsSection}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>To</Text>
            <Text style={styles.detailValue} numberOfLines={1}>
              {address.slice(0, 8)}...{address.slice(-8)}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Network Fee</Text>
            <Text style={styles.detailFee}>0.00001 XLM</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Time</Text>
            <Text style={styles.detailValue}>~5 seconds</Text>
          </View>
        </View>
      </View>

      {/* Security Badge */}
      <View style={styles.securityBadge}>
        <ShieldCheck size={16} color="#22C55E" />
        <Text style={styles.securityText}>Secured by Stellar Network</Text>
      </View>

      {/* Status */}
      {status !== 'idle' && (
        <View style={styles.statusContainer}>
          <Text style={styles.statusText}>{getStatusText()}</Text>
        </View>
      )}

      {/* Slide to Pay */}
      <View style={styles.sliderContainer}>
        <GestureDetector gesture={pan}>
          <View style={styles.sliderTrack}>
            <Animated.View style={[styles.sliderThumb, slideStyle]}>
              <ArrowRight color="#FFFFFF" size={24} />
            </Animated.View>
            <Text style={styles.sliderText}>
              {biometricsEnabled
                ? `Slide to pay with ${biometricType}`
                : 'Slide to confirm'}
            </Text>
            {biometricsEnabled && (
              <Fingerprint
                size={20}
                color="rgba(255, 255, 255, 0.5)"
                style={styles.fingerprintIcon}
              />
            )}
          </View>
        </GestureDetector>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0F',
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 18,
  },
  card: {
    backgroundColor: '#1F2937',
    borderRadius: 24,
    padding: 24,
    marginTop: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  amountSection: {
    alignItems: 'center',
  },
  amountLabel: {
    color: '#9CA3AF',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  amount: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  currency: {
    color: '#6B7280',
    marginLeft: 8,
    fontSize: 16,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginVertical: 24,
  },
  detailsSection: {
    gap: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailLabel: {
    color: '#9CA3AF',
  },
  detailValue: {
    color: '#FFFFFF',
    fontFamily: 'monospace',
    fontSize: 12,
    maxWidth: 150,
  },
  detailFee: {
    color: '#00E5FF',
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
    paddingVertical: 12,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderRadius: 12,
  },
  securityText: {
    color: '#22C55E',
    fontSize: 14,
  },
  statusContainer: {
    marginTop: 24,
    alignItems: 'center',
  },
  statusText: {
    color: '#00E5FF',
    fontSize: 16,
  },
  sliderContainer: {
    position: 'absolute',
    bottom: 50,
    left: 24,
    right: 24,
  },
  sliderTrack: {
    height: 64,
    backgroundColor: '#1F2937',
    borderRadius: 32,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  sliderThumb: {
    width: 56,
    height: 56,
    backgroundColor: '#00E5FF',
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00E5FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  sliderText: {
    flex: 1,
    textAlign: 'center',
    color: 'rgba(255, 255, 255, 0.5)',
    fontWeight: '600',
  },
  fingerprintIcon: {
    marginRight: 16,
  },
});
