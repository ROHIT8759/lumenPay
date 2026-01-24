import React, { useState } from 'react';
import { View, Text, TextInput, Button, Alert } from 'react-native';
import { paymentApi } from '../lib/api/paymentApi';
import { signTransaction } from '../lib/stellar';
import { biometricAuth } from '../lib/biometricAuth';

/**
 * Example: Payment Flow (Refactored)
 * 
 * This demonstrates the complete payment flow:
 * 1. Request unsigned transaction from backend
 * 2. User authorizes with biometrics
 * 3. Sign transaction locally
 * 4. Submit signed transaction to backend
 * 5. Backend relays to Horizon
 */

export default function PaymentExample() {
    const [recipient, setRecipient] = useState('');
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const [txHash, setTxHash] = useState<string | null>(null);

    const handleSendPayment = async () => {
        if (!recipient || !amount) {
            Alert.alert('Error', 'Please fill all fields');
            return;
        }

        setLoading(true);
        try {
            // Step 1: Request unsigned transaction from backend
            const { xdr } = await paymentApi.buildPayment({
                to: recipient,
                amount,
            });

            // Step 2: Request biometric authorization
            const authResult = await biometricAuth.authenticateForTransaction(amount, recipient);

            if (!authResult.success) {
                Alert.alert('Authentication Failed', authResult.error || 'Please try again');
                return;
            }

            // Step 3: Sign transaction locally
            const signedXDR = await signTransaction(xdr);

            // Step 4: Submit signed transaction to backend
            const result = await paymentApi.submitSignedPayment({
                signedXDR,
                to: recipient,
                amount,
            });

            setTxHash(result.hash);
            Alert.alert('Success', `Payment sent!\nHash: ${result.hash.substring(0, 16)}...`);

            // Reset form
            setRecipient('');
            setAmount('');
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCheckStatus = async () => {
        if (!txHash) return;

        try {
            const status = await paymentApi.getPaymentStatus(txHash);
            Alert.alert('Transaction Status', `Status: ${status.status}\nLedger: ${status.ledger || 'Pending'}`);
        } catch (error: any) {
            Alert.alert('Error', error.message);
        }
    };

    return (
        <View style={{ padding: 20 }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 20 }}>
                Payment Example
            </Text>

            <TextInput
                placeholder="Recipient Address (G...)"
                value={recipient}
                onChangeText={setRecipient}
                style={{
                    borderWidth: 1,
                    borderColor: '#ccc',
                    padding: 10,
                    marginBottom: 10,
                    borderRadius: 5,
                }}
            />

            <TextInput
                placeholder="Amount (XLM)"
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
                style={{
                    borderWidth: 1,
                    borderColor: '#ccc',
                    padding: 10,
                    marginBottom: 20,
                    borderRadius: 5,
                }}
            />

            <Button
                title={loading ? 'Processing...' : 'Send Payment'}
                onPress={handleSendPayment}
                disabled={loading}
            />

            {txHash && (
                <View style={{ marginTop: 20 }}>
                    <Text style={{ color: 'green', marginBottom: 10 }}>
                        ✅ Transaction submitted!
                    </Text>
                    <Text>Hash: {txHash.substring(0, 32)}...</Text>
                    <Button title="Check Status" onPress={handleCheckStatus} />
                </View>
            )}
        </View>
    );
}
