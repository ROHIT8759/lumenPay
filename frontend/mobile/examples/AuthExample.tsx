import React, { useState, useEffect } from 'react';
import { View, Text, Button, Alert } from 'react-native';
import { loadWallet, createWallet } from '../lib/stellar';
import { authApi } from '../lib/api/authApi';
import { signMessage } from '../lib/stellar';

/**
 * Example: Wallet-Based Authentication Flow
 * 
 * This component demonstrates how to implement authentication
 * using the refactored architecture.
 */

export default function AuthExample() {
    const [publicKey, setPublicKey] = useState<string | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(false);

step 1: Check for existing wallet
  useEffect(() => {
        checkWallet();
    }, []);

    const checkWallet = async () => {
        const wallet = await loadWallet();
        if (wallet) {
            setPublicKey(wallet.publicKey());
        }
    };

    // Step 2: Create wallet if doesn't exist
    const handleCreateWallet = async () => {
        setLoading(true);
        try {
            const wallet = await createWallet();
            setPublicKey(wallet.publicKey);
            Alert.alert('Success', `Wallet created!\n${wallet.publicKey.substring(0, 8)}...`);
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    // Step 3: Authenticate with backend
    const handleAuthenticate = async () => {
        if (!publicKey) {
            Alert.alert('Error', 'No wallet found');
            return;
        }

        setLoading(true);
        try {
            // Request nonce from backend
            const { nonce } = await authApi.requestNonce(publicKey);

            // Sign nonce with wallet
            const signature = await signMessage(nonce);

            // Verify signature and get JWT
            const result = await authApi.verifyWallet(publicKey, signature, nonce);

            setIsAuthenticated(true);
            Alert.alert('Success', 'Authenticated!');
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        await authApi.clearSession();
        setIsAuthenticated(false);
    };

    return (
        <View style={{ padding: 20 }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 20 }}>
                Authentication Example
            </Text>

            {!publicKey ? (
                <Button
                    title="Create Wallet"
                    onPress={handleCreateWallet}
                    disabled={loading}
                />
            ) : (
                <>
                    <Text>Public Key: {publicKey.substring(0, 16)}...</Text>

                    {!isAuthenticated ? (
                        <Button
                            title="Authenticate"
                            onPress={handleAuthenticate}
                            disabled={loading}
                        />
                    ) : (
                        <>
                            <Text style={{ color: 'green', marginTop: 10 }}>✅ Authenticated</Text>
                            <Button title="Logout" onPress={handleLogout} />
                        </>
                    )}
                </>
            )}
        </View>
    );
}
