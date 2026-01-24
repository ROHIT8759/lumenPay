import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
const LinearGradient = ExpoLinearGradient as any;
const AnimatedView = Animated.View as any;
import { useRouter } from 'expo-router';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { ShieldCheck as ShieldCheckIcon, AlertCircle as AlertCircleIcon, CheckCircle as CheckCircleIcon, Clock as ClockIcon, ArrowLeft as ArrowLeftIcon } from 'lucide-react-native';
const ShieldCheck = ShieldCheckIcon as any;
const AlertCircle = AlertCircleIcon as any;
const CheckCircle = CheckCircleIcon as any;
const Clock = ClockIcon as any;
const ArrowLeft = ArrowLeftIcon as any;
import { diditKYC, KYCStatusResponse } from '../../lib/diditKyc';
import { loadWallet } from '../../lib/stellar';


const getWalletAddress = async (): Promise<string | null> => {
    const wallet = await loadWallet();
    return wallet ? wallet.publicKey() : null;
};

type VerificationStatus = 'NOT_STARTED' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED' | 'LOADING';

export default function KYCVerifyScreen() {
    const router = useRouter();
    const [status, setStatus] = useState<VerificationStatus>('LOADING');
    const [isStarting, setIsStarting] = useState(false);
    const [confidenceScore, setConfidenceScore] = useState<number | undefined>();

    const [walletAddress, setWalletAddress] = useState<string>('');

    const loadStatus = useCallback(async () => {
        if (!walletAddress) return;
        setStatus('LOADING');
        const result = await diditKYC.getStatus(walletAddress);
        if (result.success && result.status) {
            setStatus(result.status);
            setConfidenceScore(result.confidence_score);
        } else {
            setStatus('NOT_STARTED');
        }
    }, [walletAddress]);

    useEffect(() => {
        getWalletAddress().then(setWalletAddress).catch(console.error);
    }, []);

    useEffect(() => {
        if (walletAddress) {
            loadStatus();
        }
    }, [walletAddress, loadStatus]);


    const handleStartVerification = async () => {
        setIsStarting(true);

        try {

            const result = await diditKYC.startVerification(walletAddress);

            if (!result.success || !result.verification_url) {
                Alert.alert('Error', result.error || 'Failed to start verification');
                setIsStarting(false);
                return;
            }


            const opened = await diditKYC.openVerificationUrl(result.verification_url);

            if (!opened) {
                Alert.alert('Error', 'Could not open verification page');
                setIsStarting(false);
                return;
            }


            setStatus('PENDING');
            setIsStarting(false);


            diditKYC.pollForCompletion(walletAddress, {
                intervalMs: 3000,
                timeoutMs: 600000,
                onStatusChange: (newStatus) => {
                    setStatus(newStatus as VerificationStatus);
                }
            }).then((finalResult) => {
                if (finalResult.status) {
                    setStatus(finalResult.status as VerificationStatus);
                    setConfidenceScore(finalResult.confidence_score);
                }
            });

        } catch (error) {
            Alert.alert('Error', 'Something went wrong');
            setIsStarting(false);
        }
    };


    const handleRetry = () => {
        diditKYC.clearPendingSession();
        setStatus('NOT_STARTED');
    };


    const renderStatusIcon = useCallback(() => {
        switch (status) {
            case 'APPROVED':
                return <CheckCircle color="#22C55E" size={64} />;
            case 'PENDING':
                return <Clock color="#F59E0B" size={64} />;
            case 'REJECTED':
            case 'EXPIRED':
                return <AlertCircle color="#EF4444" size={64} />;
            default:
                return <ShieldCheck color="#00E5FF" size={64} />;
        }
    }, [status]);


    const renderContent = () => {
        if (status === 'LOADING') {
            return (
                <View style={styles.centerContent}>
                    <ActivityIndicator size="large" color="#00E5FF" />
                    <Text style={styles.loadingText}>Loading verification status...</Text>
                </View>
            );
        }

        if (status === 'APPROVED') {
            return (
                <AnimatedView entering={FadeInUp.delay(200)} style={styles.centerContent}>
                    {renderStatusIcon()}
                    <Text style={styles.title}>Identity Verified</Text>
                    <Text style={styles.subtitle}>
                        Your identity has been verified successfully.
                        {confidenceScore && ` (${(confidenceScore * 100).toFixed(0)}% confidence)`}
                    </Text>
                    <View style={styles.benefitsContainer}>
                        <Text style={styles.benefitsTitle}>You now have access to:</Text>
                        <View style={styles.benefitItem}>
                            <CheckCircle color="#22C55E" size={16} />
                            <Text style={styles.benefitText}>Stock Trading</Text>
                        </View>
                        <View style={styles.benefitItem}>
                            <CheckCircle color="#22C55E" size={16} />
                            <Text style={styles.benefitText}>Higher Transaction Limits</Text>
                        </View>
                        <View style={styles.benefitItem}>
                            <CheckCircle color="#22C55E" size={16} />
                            <Text style={styles.benefitText}>Loans & Credit (Coming Soon)</Text>
                        </View>
                    </View>
                </AnimatedView>
            );
        }

        if (status === 'PENDING') {
            return (
                <AnimatedView entering={FadeInUp.delay(200)} style={styles.centerContent}>
                    {renderStatusIcon()}
                    <Text style={styles.title}>Verification In Progress</Text>
                    <Text style={styles.subtitle}>
                        Please complete the verification in your browser.
                        This page will update automatically.
                    </Text>
                    <ActivityIndicator style={styles.spinner} size="small" color="#F59E0B" />
                    <TouchableOpacity style={styles.secondaryButton} onPress={loadStatus}>
                        <Text style={styles.secondaryButtonText}>Refresh Status</Text>
                    </TouchableOpacity>
                </AnimatedView>
            );
        }

        if (status === 'REJECTED' || status === 'EXPIRED') {
            return (
                <AnimatedView entering={FadeInUp.delay(200)} style={styles.centerContent}>
                    {renderStatusIcon()}
                    <Text style={styles.title}>
                        {status === 'REJECTED' ? 'Verification Failed' : 'Verification Expired'}
                    </Text>
                    <Text style={styles.subtitle}>
                        {status === 'REJECTED'
                            ? 'We could not verify your identity. Please try again.'
                            : 'Your verification session has expired. Please start a new one.'}
                    </Text>
                    <TouchableOpacity onPress={handleRetry}>
                        <LinearGradient
                            colors={['#00E5FF', '#2979FF']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.button}
                        >
                            <Text style={styles.buttonText}>Try Again</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </AnimatedView>
            );
        }


        return (
            <AnimatedView entering={FadeInUp.delay(200)} style={styles.centerContent}>
                {renderStatusIcon()}
                <Text style={styles.title}>Verify Your Identity</Text>
                <Text style={styles.subtitle}>
                    Complete biometric verification to unlock premium features like stock trading and loans.
                </Text>

                <View style={styles.infoBox}>
                    <Text style={styles.infoTitle}>What you&apos;ll need:</Text>
                    <Text style={styles.infoText}>• Good lighting for face capture</Text>
                    <Text style={styles.infoText}>• Camera access in your browser</Text>
                    <Text style={styles.infoText}>• ~2 minutes to complete</Text>
                </View>

                <View style={styles.privacyBox}>
                    <ShieldCheck color="#22C55E" size={20} />
                    <Text style={styles.privacyText}>
                        Your biometric data is never stored. Only verification results are saved.
                    </Text>
                </View>

                <TouchableOpacity onPress={handleStartVerification} disabled={isStarting}>
                    <LinearGradient
                        colors={['#00E5FF', '#2979FF']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[styles.button, isStarting && styles.buttonDisabled]}
                    >
                        {isStarting ? (
                            <ActivityIndicator color="#FFF" />
                        ) : (
                            <Text style={styles.buttonText}>Start Verification</Text>
                        )}
                    </LinearGradient>
                </TouchableOpacity>
            </AnimatedView>
        );
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <AnimatedView entering={FadeInDown} style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft color="#FFF" size={24} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Identity Verification</Text>
                <View style={{ width: 40 }} />
            </AnimatedView>

            {/* Main Content */}
            <View style={styles.content}>
                {renderContent()}
            </View>
        </View>
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
        paddingHorizontal: 16,
        paddingTop: 60,
        paddingBottom: 20,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#FFF',
    },
    content: {
        flex: 1,
        paddingHorizontal: 24,
    },
    centerContent: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingBottom: 60,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#FFF',
        marginTop: 24,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: '#9CA3AF',
        marginTop: 12,
        textAlign: 'center',
        lineHeight: 24,
        paddingHorizontal: 20,
    },
    loadingText: {
        fontSize: 16,
        color: '#9CA3AF',
        marginTop: 16,
    },
    infoBox: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 16,
        padding: 20,
        marginTop: 32,
        width: '100%',
    },
    infoTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFF',
        marginBottom: 12,
    },
    infoText: {
        fontSize: 14,
        color: '#9CA3AF',
        marginBottom: 8,
    },
    privacyBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        borderRadius: 12,
        padding: 16,
        marginTop: 20,
        marginBottom: 32,
        width: '100%',
        gap: 12,
    },
    privacyText: {
        flex: 1,
        fontSize: 13,
        color: '#22C55E',
        lineHeight: 18,
    },
    button: {
        height: 56,
        width: 280,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    buttonText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFF',
    },
    secondaryButton: {
        marginTop: 20,
        padding: 12,
    },
    secondaryButtonText: {
        fontSize: 16,
        color: '#00E5FF',
    },
    spinner: {
        marginTop: 24,
    },
    benefitsContainer: {
        marginTop: 32,
        width: '100%',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        borderRadius: 16,
        padding: 20,
    },
    benefitsTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFF',
        marginBottom: 16,
    },
    benefitItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 12,
    },
    benefitText: {
        fontSize: 15,
        color: '#E5E7EB',
    },
});
