import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  Easing,
} from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Check, Key, Shield } from 'lucide-react-native';
import { RootStackParamList } from '../navigation/types';
import { LumenVault } from '../lib/lumenvault/LumenVault';
import { authApi } from '../lib/api/authApi';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'WalletSetup'>;

type SetupStatus = 'idle' | 'generating' | 'funding' | 'linking' | 'success' | 'error';

export default function WalletSetupScreen() {
  const navigation = useNavigation<NavigationProp>();
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
      false,
    );

    try {
      // Check for existing wallet
      const hasWallet = await LumenVault.hasWallet();
      if (hasWallet) {
        const pubKey = await LumenVault.getPublicKey();
        if (pubKey) {
          await handleLinkAndFinish(pubKey);
          return;
        }
      }

      // Create new wallet (On Device)
      setStatus('generating');
      const walletData = await LumenVault.createWallet(true);

      setPublicKey(walletData.publicKey);

      // Link with Backend
      await handleLinkAndFinish(walletData.publicKey);
    } catch (error: any) {
      console.error('Wallet creation failed:', error);
      setStatus('error');
      setErrorMessage(error.message || 'Failed to create wallet');
      spin.value = 0;
      buttonOpacity.value = withTiming(1, { duration: 300 });
    }
  };

  const handleLinkAndFinish = async (pubKey: string) => {
    try {
      setStatus('linking');

      const signupResult = await authApi.signup(pubKey);

      if (!signupResult.success) {
        console.warn('Linking failed, but wallet created locally.', signupResult);
      }

      handleSuccess(pubKey);
    } catch (e: any) {
      console.error(e);
      setStatus('error');
      setErrorMessage(e.message);
      spin.value = 0;
      buttonOpacity.value = withTiming(1, { duration: 300 });
    }
  };

  const handleSuccess = (pubKey: string) => {
    setStatus('success');
    setPublicKey(pubKey);

    spin.value = 0;
    scale.value = withSpring(1.2, { damping: 10 });
    lockOpacity.value = withTiming(1, { duration: 500 });
    keyScale.value = withSpring(1, { damping: 12 });

    setTimeout(() => {
      navigation.replace('Main', { screen: 'Home' });
    }, 2000);
  };

  const handleRetry = () => {
    setStatus('idle');
    setErrorMessage('');
    buttonOpacity.value = withTiming(1, { duration: 300 });
  };

  const particleStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spin.value}deg` }, { scale: scale.value }],
  }));

  const lockStyle = useAnimatedStyle(() => ({
    opacity: lockOpacity.value,
    transform: [{ scale: lockOpacity.value }],
  }));

  const buttonStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
  }));

  const keyStyle = useAnimatedStyle(() => ({
    opacity: keyScale.value,
    transform: [{ scale: keyScale.value }],
  }));

  const getStatusText = () => {
    switch (status) {
      case 'generating':
        return 'Generating secure keys...';
      case 'funding':
        return 'Funding your account...';
      case 'linking':
        return 'Linking to LumenPay...';
      case 'success':
        return 'Wallet Created!';
      case 'error':
        return 'Something went wrong';
      default:
        return '';
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <Text style={styles.headerText}>Your Money.</Text>
        <Text style={styles.headerAccent}>Your Keys.</Text>
        <Text style={styles.headerSubtitle}>
          No emails. No passwords. Just you and the network.
        </Text>
      </View>

      {/* Animation Container */}
      <View style={styles.animationContainer}>
        <Animated.View style={[styles.particleRing, particleStyle]}>
          <View style={styles.particleBorder} />
        </Animated.View>

        <Animated.View style={[styles.lockContainer, lockStyle]}>
          <View style={styles.successCircle}>
            <Check size={40} color="white" />
          </View>
        </Animated.View>
      </View>

      {/* Status Text */}
      {status !== 'idle' && (
        <View style={styles.statusContainer}>
          <Text style={[styles.statusText, status === 'error' && styles.errorText]}>
            {getStatusText()}
          </Text>
          {status === 'error' && (
            <Text style={styles.errorMessage}>{errorMessage}</Text>
          )}
        </View>
      )}

      {/* Public Key Display */}
      {status === 'success' && publicKey && (
        <Animated.View style={[styles.keyContainer, keyStyle]}>
          <View style={styles.keyBox}>
            <View style={styles.keyHeader}>
              <Key size={16} color="#00E5FF" />
              <Text style={styles.keyLabel}>Your Public Key</Text>
            </View>
            <Text style={styles.keyText} numberOfLines={2}>
              {publicKey}
            </Text>
          </View>
        </Animated.View>
      )}

      {/* Security Badge */}
      <View style={styles.securityBadge}>
        <Shield size={16} color="#22C55E" />
        <Text style={styles.securityText}>Keys stored only on this device</Text>
      </View>

      {/* Button */}
      <Animated.View style={[styles.buttonContainer, buttonStyle]}>
        {status === 'error' ? (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleRetry}
            style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleCreate}
            disabled={status !== 'idle'}
            style={styles.createButton}>
            <Text style={styles.createButtonText}>Create One-Tap Wallet</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.disclaimer}>
          By creating a wallet, you agree to manage your own keys responsibly.
        </Text>
      </Animated.View>

      {/* Import Link */}
      <TouchableOpacity
        style={styles.importButton}
        onPress={() =>
          Alert.alert('Coming Soon', 'Import from secret key or mnemonic coming soon!')
        }>
        <Text style={styles.importButtonText}>Already have a wallet? Import</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0F',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  headerText: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  headerAccent: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#00E5FF',
    textAlign: 'center',
  },
  headerSubtitle: {
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 16,
  },
  animationContainer: {
    height: 160,
    width: 160,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 32,
  },
  particleRing: {
    position: 'absolute',
  },
  particleBorder: {
    width: 128,
    height: 128,
    borderWidth: 4,
    borderColor: 'rgba(0, 229, 255, 0.3)',
    borderRadius: 64,
    borderTopColor: '#00E5FF',
  },
  lockContainer: {
    position: 'absolute',
  },
  successCircle: {
    width: 80,
    height: 80,
    backgroundColor: '#22C55E',
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  statusContainer: {
    marginBottom: 16,
  },
  statusText: {
    textAlign: 'center',
    fontSize: 18,
    color: '#D1D5DB',
  },
  errorText: {
    color: '#F87171',
  },
  errorMessage: {
    textAlign: 'center',
    color: '#F87171',
    fontSize: 14,
    marginTop: 8,
  },
  keyContainer: {
    marginBottom: 32,
    paddingHorizontal: 16,
    width: '100%',
  },
  keyBox: {
    backgroundColor: 'rgba(31, 41, 55, 0.5)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.2)',
  },
  keyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  keyLabel: {
    color: '#00E5FF',
    fontSize: 14,
    fontWeight: '500',
  },
  keyText: {
    color: '#FFFFFF',
    fontFamily: 'monospace',
    fontSize: 12,
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 32,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderRadius: 20,
  },
  securityText: {
    color: '#22C55E',
    fontSize: 14,
  },
  buttonContainer: {
    width: '100%',
  },
  createButton: {
    width: '100%',
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  createButtonText: {
    color: '#0A0A0F',
    fontWeight: 'bold',
    fontSize: 18,
  },
  retryButton: {
    width: '100%',
    paddingVertical: 16,
    backgroundColor: '#EF4444',
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 18,
  },
  disclaimer: {
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 24,
    fontSize: 12,
  },
  importButton: {
    marginTop: 16,
  },
  importButtonText: {
    color: '#00E5FF',
    fontSize: 14,
  },
});
