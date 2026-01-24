'use client';



import React, { useState } from 'react';
import { createWalletData, isValidSecretKey, importKeypair } from '@/lib/lumenVault/keyManager';
import { secureStorage } from '@/lib/lumenVault/secureStorage';
import { useWallet } from './WalletProvider';
import { Eye, EyeOff, Loader2, AlertCircle, KeyRound } from 'lucide-react';

export function ImportWallet() {
    const { refreshState } = useWallet();
    const [step, setStep] = useState(0); 
    const [secretKey, setSecretKey] = useState('');
    const [passphrase, setPassphrase] = useState('');
    const [confirmPass, setConfirmPass] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [showSecret, setShowSecret] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleValidateKey = (e: React.FormEvent) => {
        e.preventDefault();
        if (!isValidSecretKey(secretKey)) {
            setError('Invalid Stellar secret key (starts with S, 56 chars)');
            return;
        }
        setError(null);
        setStep(1);
    };

    const handleImport = async (e: React.FormEvent) => {
        e.preventDefault();

        if (passphrase.length < 8) {
            setError('Password must be at least 8 characters');
            return;
        }
        if (passphrase !== confirmPass) {
            setError('Passwords do not match');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            
            const keypair = importKeypair(secretKey);

            
            const walletData = await createWalletData(keypair, passphrase);

            
            await secureStorage.storeWallet(keypair.publicKey(), walletData);

            
            await secureStorage.storeSession(keypair.publicKey());

            
            await refreshState();

            
        } catch (e: any) {
            setError(e.message || 'Failed to import wallet');
            setIsLoading(false);
        }
    };

    if (step === 0) {
        return (
            <div className="p-6 space-y-4">
                <div className="text-center space-y-2 mb-6">
                    <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mx-auto">
                        <KeyRound className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                    </div>
                    <h2 className="text-xl font-bold">Import Wallet</h2>
                    <p className="text-sm text-gray-500">Enter your Secret Key (starts with 'S')</p>
                </div>

                <form onSubmit={handleValidateKey} className="space-y-4">
                    <div className="space-y-2">
                        <div className="relative">
                            <input
                                type={showSecret ? "text" : "password"}
                                value={secretKey}
                                onChange={(e) => setSecretKey(e.target.value.trim().toUpperCase())}
                                className="w-full p-3 font-mono text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                placeholder="S..."
                            />
                            <button
                                type="button"
                                onClick={() => setShowSecret(!showSecret)}
                                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                            >
                                {showSecret ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                        <p className="text-xs text-gray-400">
                            Your key is encrypted locally and never sent to any server.
                        </p>
                    </div>

                    {error && (
                        <div className="text-red-500 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded-lg flex items-center gap-2">
                            <AlertCircle size={16} /> {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={!secretKey}
                        className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
                    >
                        Continue
                    </button>
                </form>
            </div>
        );
    }

    if (step === 1) {
        return (
            <div className="p-6 space-y-4">
                <h2 className="text-xl font-bold">Secure Your Wallet</h2>
                <p className="text-sm text-gray-500">Set a password to encrypt this key on your device.</p>

                <form onSubmit={handleImport} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs font-medium uppercase text-gray-500">New Password</label>
                        <div className="relative">
                            <input
                                type={showPass ? "text" : "password"}
                                value={passphrase}
                                onChange={(e) => setPassphrase(e.target.value)}
                                className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                placeholder="At least 8 characters"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPass(!showPass)}
                                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                            >
                                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-medium uppercase text-gray-500">Confirm Password</label>
                        <input
                            type={showPass ? "text" : "password"}
                            value={confirmPass}
                            onChange={(e) => setConfirmPass(e.target.value)}
                            className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                        />
                    </div>

                    {error && (
                        <div className="text-red-500 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded-lg flex items-center gap-2">
                            <AlertCircle size={16} /> {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                    >
                        {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                        Import Wallet
                    </button>
                </form>
            </div>
        );
    }

    return null;
}
