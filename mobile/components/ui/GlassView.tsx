import React from 'react';
import { StyleSheet, View, ViewStyle, ViewProps } from 'react-native';
import { BlurView } from 'expo-blur';

interface GlassViewProps extends ViewProps {
    children: React.ReactNode;
    intensity?: number;
    style?: ViewStyle;
}

export default function GlassView({ children, intensity = 20, style, ...props }: GlassViewProps) {
    return (
        <View style={[styles.container, style]} {...props}>
            <BlurView
                intensity={intensity}
                tint="dark"
                style={StyleSheet.absoluteFill}
            />
            {}
            <View style={styles.overlay} />

            <View style={styles.content}>
                {children}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
        zIndex: 1,
    },
    content: {
        zIndex: 2,
        padding: 16,
    }
});
