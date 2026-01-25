'use client';



import React, { useState } from 'react';
import { generateKeypair, createWalletData } from '@/lib/lumenVault/keyManager';
import { secureStorage } from '@/lib/lumenVault/secureStorage';
import { networkProvider } from '@/lib/lumenVault/networkProvider'; 
import { useWallet } from './WalletProvider';
import { Copy, Eye, EyeOff, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { walletAuth } from '@/lib/lumenVault/walletAuth';
import { setUnlockedKeypair } from '@/lib/lumenVault/keyCache';

export function CreateWallet() {
    const { refreshState } = useWallet();
    const [step, setStep] = useState(0);
    const [passphrase, setPassphrase] = useState('');
    const [confirmPass, setConfirmPass] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [createdWallet, setCreatedWallet] = useState<{ publicKey: string; secret: string } | null>(null);
    const [copied, setCopied] = useState(false);

    
    const handleCreatePassword = async (e: React.FormEvent) => {
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

        setTimeout(() => {
            
            try {
                const keypair = generateKeypair();
                setCreatedWallet({
                    publicKey: keypair.publicKey(),
                    secret: keypair.secret(),
                });
                setStep(2);
            } catch (e: any) {
                setError(e.message);
            } finally {
                setIsLoading(false);
            }
        }, 500); 
    };

    
    const handleConfirmBackup = async () => {
        if (!createdWallet) return;

        setIsLoading(true);
        setError(null);

        try {
            
            
            const { Keypair } = await import('@stellar/stellar-sdk');
            const kp = Keypair.fromSecret(createdWallet.secret);
            const walletData = await createWalletData(kp, passphrase);

            
            
            await secureStorage.storeWallet(createdWallet.publicKey, walletData);

            await secureStorage.storeSession(createdWallet.publicKey);

            const session = await secureStorage.getSession();
            if (session) {
                setUnlockedKeypair(createdWallet.publicKey, kp, session.expiresAt);
            }

            
            await networkProvider.fundTestnetAccount(createdWallet.publicKey);

            // Register with backend and sign in
            const authResult = await walletAuth.signIn(walletData, passphrase);
            if (!authResult.success) {
                throw new Error(authResult.error || 'Failed to register with backend');
            }
            
            await refreshState();

            setStep(3);
        } catch (e: any) {
            setError('Failed to save wallet: ' + e.message);
        } finally {
            setIsLoading(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    

    if (step === 0) {
        return (
            <div className="p-6 space-y-4">
                <div className="text-center space-y-2">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto">
                        <CheckCircle className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h2 className="text-xl font-bold">Create New Wallet</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Generate a secure, non-custodial Stellar wallet that lives on your device.
                    </p>
                </div>

                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-100 dark:border-yellow-800">
                    <h4 className="font-semibold text-yellow-800 dark:text-yellow-400 text-sm flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" /> Non-Custodial
                    </h4>
                    <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                        We cannot recover your password or keys. You are the sole owner of your assets.
                    </p>
                </div>

                <button
                    onClick={() => setStep(1)}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                    Get Started
                </button>
            </div>
        );
    }

    if (step === 1) {
        return (
            <div className="p-6 space-y-4">
                <h2 className="text-xl font-bold">Set a Password</h2>
                <p className="text-sm text-gray-500">This password will encrypt your keys on this device.</p>

                <form onSubmit={handleCreatePassword} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs font-medium uppercase text-gray-500">Password</label>
                        <div className="relative">
                            <input
                                type={showPass ? "text" : "password"}
                                value={passphrase}
                                onChange={(e) => setPassphrase(e.target.value)}
                                className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
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
                            className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            placeholder="Re-enter password"
                        />
                    </div>

                    {error && (
                        <div className="text-red-500 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded-lg flex items-center gap-2">
                            <AlertCircle size={16} /> {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading || !passphrase}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                        Continue
                    </button>
                </form>
            </div>
        );
    }

    if (step === 2 && createdWallet) {
        return (
            <div className="p-6 space-y-4">
                <h2 className="text-xl font-bold">Back Up Your Secret Key</h2>
                <p className="text-sm text-red-500">
                    Save this key in a safe place. If you lose it, you lose your funds forever.
                </p>

                <div className="bg-gray-900 p-4 rounded-lg relative group">
                    <p className="font-mono text-sm text-green-400 break-all pr-8">
                        {createdWallet.secret}
                    </p>
                    <button
                        onClick={() => copyToClipboard(createdWallet.secret)}
                        className="absolute top-2 right-2 p-2 text-gray-400 hover:text-white rounded bg-gray-800 hover:bg-gray-700 transition-colors"
                    >
                        {copied ? <CheckCircle size={16} className="text-green-500" /> : <Copy size={16} />}
                    </button>
                </div>

                <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <input type="checkbox" id="backup-confirm" className="mt-1" />
                    <label htmlFor="backup-confirm" className="text-sm text-gray-600 dark:text-gray-300">
                        I have saved my secret key in a secure location.
                    </label>
                </div>

                {error && (
                    <div className="text-red-500 text-sm">{error}</div>
                )}

                <button
                    onClick={handleConfirmBackup}
                    disabled={isLoading}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" /> Creating Wallet...
                        </>
                    ) : (
                        'I saved my key'
                    )}
                </button>
            </div>
        );
    }

    if (step === 3) {
        return (
            <div className="p-8 text-center space-y-4">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                <h2 className="text-2xl font-bold">Wallet Ready!</h2>
                <p className="text-gray-500">Your wallet is encrypted and stored locally.</p>

                {}
            </div>
        );
    }

    return null;
}
