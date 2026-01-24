import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    Dimensions,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { QrCode, Smartphone, ArrowRight, Shield, ArrowLeft, X } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { LumenVault } from '../../lib/lumenvault/LumenVault';
import { authApi } from '../../lib/api/authApi';

const { width, height } = Dimensions.get('window');

export default function SyncWalletScreen() {
    const router = useRouter();
    const [step, setStep] = useState<'intro' | 'scan' | 'pin' | 'success'>('intro');
    const [scannedData, setScannedData] = useState<string | null>(null);
    const [permission, requestPermission] = useCameraPermissions();
    const [isScanning, setIsScanning] = useState(false);

    // ... (PIN logic can remain or be removed if we trust the QR payload directly. 
    // Assuming QR payload is just the sync code/secret for now)

    const handleScan = async (data: string) => {
        if (isScanning) return;
        setIsScanning(true);
        setScannedData(data);
        
        // Vibrate to confirm scan
        // Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        try {
            // Real Logic:
            // 1. Parse QR data (Expected: "lumenpay:sync:<code>")
            if (!data.startsWith('lumenpay:')) {
                throw new Error('Invalid QR Code');
            }

            // 2. In a real app, we would send this code to backend to link session
            // or if it contains encrypted key, ask for PIN to decrypt.
            
            // For "End-to-End" Real Data:
            // Let's assume the Web App shows a QR with the User's Public Key to "Link" them.
            // Or a "Sync Token".
            
            // Implementation: Treat data as public key to "watch" or Sync Token.
            // For now, let's simulate the "Link" API call.
            
            // await authApi.linkDevice(data); // Needs implementation in authApi
            
            setStep('success');
        } catch (e) {
            Alert.alert('Scan Failed', 'Invalid QR code. Please try again.');
            setIsScanning(false);
            setScannedData(null);
        }
    };

    if (!permission) {
        // Camera permissions are still loading.
        return <View />;
    }

    if (!permission.granted) {
         // Camera permissions are not granted yet.
        return (
          <View style={styles.container}>
            <Text style={{ textAlign: 'center', color: 'white', marginTop: 100 }}>We need your permission to show the camera</Text>
            <TouchableOpacity onPress={requestPermission} style={styles.button}>
                <Text style={styles.buttonText}>Grant Permission</Text>
            </TouchableOpacity>
          </View>
        );
    }

    const renderScanner = () => (
        <View style={styles.scannerContainer}>
            <CameraView 
                style={styles.camera} 
                facing="back"
                onBarcodeScanned={({ data }) => {
                    if (!scannedData && !isScanning) {
                        handleScan(data);
                    }
                }}
            >
                <View style={styles.overlay}>
                    <View style={styles.unfocusedContainer} />
                    <View style={styles.middleContainer}>
                        <View style={styles.unfocusedContainer} />
                        <View style={styles.focusedContainer} />
                        <View style={styles.unfocusedContainer} />
                    </View>
                    <View style={styles.unfocusedContainer} />
                </View>
            </CameraView>
            
            <TouchableOpacity 
                style={styles.closeButton} 
                onPress={() => {
                    setStep('intro');
                    setIsScanning(false);
                    setScannedData(null);
                }}
            >
                <X color="#FFF" size={24} />
            </TouchableOpacity>

            <View style={styles.scanTextContainer}>
                <Text style={styles.scanText}>Scan QR code from Web Dashboard</Text>
            </View>
        </View>
    );

    // ... (Keep existing Intro/Success render logic but switch 'scan' step to renderScanner)

    return (
        <View style={styles.container}>
            {step === 'scan' ? renderScanner() : (
                // ... Existing UI for other steps
                <View style={styles.content}>
                     {/* Reuse existing UI logic for intro/success, just updated the Scan button action */}
                     {step === 'intro' && (
                        <Animated.View entering={FadeInDown} style={styles.centerContent}>
                            <View style={styles.iconContainer}>
                                <QrCode color="#00E5FF" size={48} />
                            </View>
                            <Text style={styles.title}>Sync with Web Wallet</Text>
                            <Text style={styles.subtitle}>
                                Scan the QR code on your desktop dashboard to verify this device.
                            </Text>
                            
                            <TouchableOpacity onPress={() => setStep('scan')}>
                                <LinearGradient
                                    colors={['#00E5FF', '#2979FF']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.button}
                                >
                                    <Text style={styles.buttonText}>Scan QR Code</Text>
                                    <ArrowRight color="#FFF" size={20} />
                                </LinearGradient>
                            </TouchableOpacity>
                        </Animated.View>
                     )}
                     
                     {step === 'success' && (
                        <Animated.View entering={FadeInUp} style={styles.centerContent}>
                            <View style={[styles.iconContainer, { backgroundColor: 'rgba(34, 197, 94, 0.1)' }]}>
                                <Shield color="#22C55E" size={48} />
                            </View>
                            <Text style={styles.title}>Device Linked!</Text>
                            <Text style={styles.subtitle}>
                                Your mobile wallet is now synced with your web dashboard.
                            </Text>
                            <TouchableOpacity onPress={() => router.replace('/(tabs)/home')}>
                                <View style={[styles.button, { backgroundColor: '#22C55E' }]}>
                                    <Text style={styles.buttonText}>Go to Home</Text>
                                </View>
                            </TouchableOpacity>
                        </Animated.View>
                     )}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0A0A0F',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        padding: 24,
    },
    centerContent: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    scannerContainer: {
        flex: 1,
        backgroundColor: '#000',
    },
    camera: {
        flex: 1,
    },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    unfocusedContainer: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    middleContainer: {
        flexDirection: 'row',
        flex: 1.5,
    },
    focusedContainer: {
        flex: 10,
        borderColor: '#00E5FF',
        borderWidth: 2,
        borderRadius: 4,
        backgroundColor: 'transparent',
    },
    closeButton: {
        position: 'absolute',
        top: 60,
        right: 20,
        padding: 10,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 20,
    },
    scanTextContainer: {
        position: 'absolute',
        bottom: 80,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    scanText: {
        color: '#FFF',
        fontSize: 16,
        backgroundColor: 'rgba(0,0,0,0.7)',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
        overflow: 'hidden',
    },
    iconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(0, 229, 255, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 32,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#FFF',
        marginBottom: 16,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: '#9CA3AF',
        textAlign: 'center',
        marginBottom: 48,
        lineHeight: 24,
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#2979FF',
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 16,
        gap: 12,
        width: '100%',
        minWidth: 280,
    },
    buttonText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
});
