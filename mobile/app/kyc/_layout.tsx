import { Stack } from 'expo-router';
import React from 'react';

export default function KYCLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: '#0A0A0F' },
                animation: 'slide_from_right',
            }}
        >
            <Stack.Screen name="verify" />
        </Stack>
    );
}
