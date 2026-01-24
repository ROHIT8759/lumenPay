import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Fingerprint, ShieldCheck, AlertCircle, CheckCircle } from 'lucide-react-native';
import { router } from 'expo-router';
import { useBiometrics } from '../../hooks/useBiometrics';

export default function BiometricSettingsScreen() {
    const {
        isAvailable,
        isEnabled,
        isLoading,
        biometricType,
        enable,
        disable,
        authenticate
    } = useBiometrics();

    const [isProcessing, setIsProcessing] = useState(false);

    const handleToggle = async (newValue: boolean) => {
        setIsProcessing(true);
        try {
            if (newValue) {
                const result = await enable();
                if (!result.success) {
                    Alert.alert('Failed', result.error || 'Could not enable biometrics');
                }
            } else {
                
                const authResult = await authenticate('Confirm to disable biometric unlock');
                if (authResult.success) {
                    await disable();
                } else {
                    Alert.alert('Cancelled', 'Biometric authentication required to disable');
                }
            }
        } finally {
            setIsProcessing(false);
        }
    };

    const handleTestAuth = async () => {
        setIsProcessing(true);
        try {
            const result = await authenticate('Testing biometric authentication');
            if (result.success) {
                Alert.alert('Success', 'Biometric authentication works correctly!');
            } else {
                Alert.alert('Failed', result.error || 'Authentication failed');
            }
        } finally {
            setIsProcessing(false);
        }
    };

    if (isLoading) {
        return (
            <View style={styles.container}>
                <LinearGradient colors={['#0A0E1A', '#131A2E']} style={StyleSheet.absoluteFill} />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#00D4AA" />
                    <Text style={styles.loadingText}>Checking biometric capabilities...</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#0A0E1A', '#131A2E']} style={StyleSheet.absoluteFill} />

            <SafeAreaView style={styles.safeArea}>
                {}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <ArrowLeft color="#FFFFFF" size={24} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Biometric Security</Text>
                    <View style={{ width: 40 }} />
                </View>

                {}
                <View style={styles.content}>
                    {}
                    <View style={styles.iconContainer}>
                        <LinearGradient
                            colors={isAvailable ? ['#00D4AA', '#00A88A'] : ['#666', '#444']}
                            style={styles.iconGradient}
                        >
                            <Fingerprint color="#FFFFFF" size={48} />
                        </LinearGradient>
                    </View>

                    {}
                    <Text style={styles.title}>{biometricType}</Text>
                    <Text style={styles.subtitle}>
                        {isAvailable
                            ? 'Use your biometrics to quickly unlock your wallet and confirm payments'
                            : 'Biometric authentication is not available on this device'
                        }
                    </Text>

                    {}
                    {isAvailable && (
                        <View style={styles.card}>
                            <View style={styles.settingRow}>
                                <View style={styles.settingInfo}>
                                    <ShieldCheck color="#00D4AA" size={24} />
                                    <View style={styles.settingText}>
                                        <Text style={styles.settingTitle}>Enable {biometricType}</Text>
                                        <Text style={styles.settingDescription}>
                                            Quick unlock & payment confirmation
                                        </Text>
                                    </View>
                                </View>
                                <Switch
                                    value={isEnabled}
                                    onValueChange={handleToggle}
                                    disabled={isProcessing}
                                    trackColor={{ false: '#333', true: '#00D4AA' }}
                                    thumbColor={isEnabled ? '#FFFFFF' : '#999'}
                                />
                            </View>
                        </View>
                    )}

                    {}
                    {isAvailable && (
                        <View style={styles.featuresCard}>
                            <Text style={styles.featuresTitle}>When enabled:</Text>

                            <View style={styles.featureItem}>
                                <CheckCircle color="#00D4AA" size={18} />
                                <Text style={styles.featureText}>Quick wallet unlock</Text>
                            </View>

                            <View style={styles.featureItem}>
                                <CheckCircle color="#00D4AA" size={18} />
                                <Text style={styles.featureText}>Secure payment confirmation</Text>
                            </View>

                            <View style={styles.featureItem}>
                                <CheckCircle color="#00D4AA" size={18} />
                                <Text style={styles.featureText}>Protected secret key access</Text>
                            </View>
                        </View>
                    )}

                    {}
                    {!isAvailable && (
                        <View style={styles.notAvailableCard}>
                            <AlertCircle color="#FF6B6B" size={24} />
                            <Text style={styles.notAvailableText}>
                                Your device doesn't support biometric authentication or no biometrics are enrolled.
                                Please set up Face ID, Touch ID, or Fingerprint in your device settings.
                            </Text>
                        </View>
                    )}

                    {/* Test Button */}
                    {isAvailable && isEnabled && (
                        <TouchableOpacity
                            style={styles.testButton}
                            onPress={handleTestAuth}
                            disabled={isProcessing}
                        >
                            {isProcessing ? (
                                <ActivityIndicator color="#00D4AA" />
                            ) : (
                                <>
                                    <Fingerprint color="#00D4AA" size={20} />
                                    <Text style={styles.testButtonText}>Test {biometricType}</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    )}
                </View>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    safeArea: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        color: '#888',
        marginTop: 16,
        fontSize: 14,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    content: {
        flex: 1,
        paddingHorizontal: 24,
        alignItems: 'center',
    },
    iconContainer: {
        marginTop: 32,
        marginBottom: 24,
    },
    iconGradient: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        color: '#888',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 32,
        paddingHorizontal: 16,
    },
    card: {
        width: '100%',
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    settingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    settingInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    settingText: {
        marginLeft: 12,
        flex: 1,
    },
    settingTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    settingDescription: {
        fontSize: 12,
        color: '#888',
        marginTop: 2,
    },
    featuresCard: {
        width: '100%',
        backgroundColor: 'rgba(0,212,170,0.05)',
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(0,212,170,0.2)',
    },
    featuresTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#00D4AA',
        marginBottom: 12,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    featureText: {
        fontSize: 14,
        color: '#CCCCCC',
        marginLeft: 10,
    },
    notAvailableCard: {
        width: '100%',
        backgroundColor: 'rgba(255,107,107,0.1)',
        borderRadius: 16,
        padding: 20,
        flexDirection: 'row',
        alignItems: 'flex-start',
        borderWidth: 1,
        borderColor: 'rgba(255,107,107,0.3)',
    },
    notAvailableText: {
        fontSize: 14,
        color: '#888',
        marginLeft: 12,
        flex: 1,
        lineHeight: 20,
    },
    testButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 24,
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#00D4AA',
        backgroundColor: 'rgba(0,212,170,0.1)',
    },
    testButtonText: {
        color: '#00D4AA',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
});
