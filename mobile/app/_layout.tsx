import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import '../global.css';
import BackgroundGradient from '../components/ui/BackgroundGradient';

export default function Layout() {
    return (
        <BackgroundGradient>
            <StatusBar style="light" />
            <Stack screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: 'transparent' },
                animation: 'fade',
            }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="(tabs)" />
            </Stack>
        </BackgroundGradient>
    );
}
