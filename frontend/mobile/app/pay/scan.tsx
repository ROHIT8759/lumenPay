import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { CameraView, Camera } from 'expo-camera';
import { useRouter } from 'expo-router';
import { ArrowLeft, Flashlight, Image } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ScanScreen() {
    const router = useRouter();
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);
    const [scanned, setScanned] = useState(false);
    const [flash, setFlash] = useState(false);

    useEffect(() => {
        (async () => {
            const { status } = await Camera.requestCameraPermissionsAsync();
            setHasPermission(status === 'granted');
        })();
    }, []);

    const handleBarCodeScanned = ({ type, data }: { type: string, data: string }) => {
        setScanned(true);
        
        
        router.push({ pathname: '/pay/amount', params: { address: data } });
    };

    if (hasPermission === null) {
        return <View className="flex-1 bg-black items-center justify-center"><Text className="text-white">Requesting camera permission...</Text></View>;
    }
    if (hasPermission === false) {
        return <View className="flex-1 bg-black items-center justify-center"><Text className="text-white">No access to camera</Text></View>;
    }

    return (
        <SafeAreaView className="flex-1 bg-black">
            <View className="absolute top-0 left-0 right-0 z-10 flex-row justify-between items-center p-6">
                <TouchableOpacity onPress={() => router.back()} className="p-2 bg-black/40 rounded-full">
                    <ArrowLeft color="white" size={24} />
                </TouchableOpacity>
                <Text className="text-white font-bold text-lg">Scan to Pay</Text>
                <TouchableOpacity onPress={() => setFlash(!flash)} className="p-2 bg-black/40 rounded-full">
                    <Flashlight color={flash ? "#FFB020" : "white"} size={24} />
                </TouchableOpacity>
            </View>

            <CameraView
                onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                style={StyleSheet.absoluteFillObject}
                enableTorch={flash}
            />

            {}
            <View className="flex-1 items-center justify-center">
                <View className="w-64 h-64 border-2 border-accent rounded-3xl bg-transparent" />
                <Text className="text-white mt-4 bg-black/40 px-4 py-2 rounded-full overflow-hidden">
                    Align QR code within frame
                </Text>
            </View>
        </SafeAreaView>
    );
}
