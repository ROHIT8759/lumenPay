'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import GlassCard from '@/components/ui/GlassCard';
import { X, Wallet, Mail, Loader2, Shield, CheckCircle, Key, Lock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@/components/lumenVault/WalletProvider';
import { walletManager } from '@/lib/lumenVault';

export default function LoginModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
    const [passphrase, setPassphrase] = useState('');
    const [loading, setLoading] = useState(false);
    const [mode, setMode] = useState<'check' | 'create' | 'unlock'>('check');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const router = useRouter();
    const { hasWallet, unlockWithPassphrase, signInWithWallet, refreshState } = useWallet();

    useEffect(() => {
        if (isOpen) {
            checkWalletExists();
        }
    }, [isOpen]);

    const checkWalletExists = async () => {
        setLoading(true);
        try {
            await refreshState();
            setMode(hasWallet ? 'unlock' : 'create');
        } catch (err) {
            setMode('create');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateWallet = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (passphrase.length < 8) {
                throw new Error('Passphrase must be at least 8 characters');
            }

            const result = await walletManager.createWallet(passphrase, {
                name: 'My Wallet',
                enableBiometric: false
            });

            if (!result.success || !result.walletData) {
                throw new Error(result.error || 'Failed to create wallet');
            }

            setSuccess(true);
            setTimeout(() => {
                router.push('/dashboard');
                onClose();
            }, 1500);
        } catch (err: any) {
            setError(err.message || 'Failed to create wallet');
        } finally {
            setLoading(false);
        }
    };

    const handleUnlockWallet = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const unlockResult = await unlockWithPassphrase(passphrase);
            
            if (!unlockResult.success) {
                throw new Error(unlockResult.error || 'Failed to unlock wallet');
            }

            const authResult = await signInWithWallet(passphrase);
            
            if (!authResult.success) {
                throw new Error(authResult.error || 'Authentication failed');
            }

            setSuccess(true);
            setTimeout(() => {
                router.push('/dashboard');
                onClose();
            }, 1500);
        } catch (err: any) {
            setError(err.message || 'Failed to unlock wallet');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
                        onClick={onClose}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="relative w-full max-w-md"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <GlassCard className="p-8 relative">
                                <button
                                    onClick={onClose}
                                    className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                                >
                                    <X size={20} />
                                </button>

                                {success ? (
                                    <div className="text-center py-8">
                                        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500/20 rounded-full mb-4">
                                            <CheckCircle size={32} className="text-green-400" />
                                        </div>
                                        <h3 className="text-xl font-bold mb-3">{mode === 'create' ? 'Wallet Created!' : 'Welcome Back!'}</h3>
                                        <p className="text-gray-400 text-sm">
                                            Redirecting to dashboard...
                                        </p>
                                    </div>
                                ) : mode === 'check' ? (
                                    <div className="text-center py-8">
                                        <Loader2 className="animate-spin mx-auto mb-4" size={48} />
                                        <p className="text-gray-400">Checking wallet status...</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="text-center mb-8">
                                            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full mb-4">
                                                {mode === 'create' ? <Wallet size={32} className="text-white" /> : <Lock size={32} className="text-white" />}
                                            </div>
                                            <h2 className="text-2xl font-bold mb-2">
                                                {mode === 'create' ? 'Create Your Wallet' : 'Unlock Your Wallet'}
                                            </h2>
                                            <p className="text-gray-400 text-sm">
                                                {mode === 'create' 
                                                    ? 'Your keys, your crypto. Non-custodial and secure.'
                                                    : 'Enter your passphrase to access your wallet'}
                                            </p>
                                        </div>

                                        {error && (
                                            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-200 text-sm">
                                                {error}
                                            </div>
                                        )}

                                        <form onSubmit={mode === 'create' ? handleCreateWallet : handleUnlockWallet} className="space-y-6">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                                    Passphrase {mode === 'create' && '(min 8 characters)'}
                                                </label>
                                                <div className="relative">
                                                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                                    <input
                                                        type="password"
                                                        required
                                                        value={passphrase}
                                                        onChange={(e) => setPassphrase(e.target.value)}
                                                        className="w-full bg-black/50 border border-white/10 rounded-lg pl-11 pr-4 py-3 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
                                                        placeholder="Enter a strong passphrase"
                                                        disabled={loading}
                                                    />
                                                </div>
                                            </div>

                                            <button
                                                type="submit"
                                                disabled={loading || !passphrase || (mode === 'create' && passphrase.length < 8)}
                                                className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                                            >
                                                {loading ? (
                                                    <>
                                                        <Loader2 className="animate-spin" size={20} />
                                                        <span>{mode === 'create' ? 'Creating Wallet...' : 'Unlocking...'}</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        {mode === 'create' ? <Wallet size={20} /> : <Lock size={20} />}
                                                        <span>{mode === 'create' ? 'Create Wallet' : 'Unlock Wallet'}</span>
                                                    </>
                                                )}
                                            </button>

                                            <div className="space-y-3 pt-4 border-t border-white/10">
                                                <div className="flex items-start gap-2 text-xs text-gray-400">
                                                    <Shield size={16} className="flex-shrink-0 mt-0.5 text-green-400" />
                                                    <span>Non-custodial - your keys never leave your device</span>
                                                </div>
                                                <div className="flex items-start gap-2 text-xs text-gray-400">
                                                    <CheckCircle size={16} className="flex-shrink-0 mt-0.5 text-green-400" />
                                                    <span>Encrypted locally with your passphrase</span>
                                                </div>
                                                {mode === 'create' && (
                                                    <div className="flex items-start gap-2 text-xs text-amber-400">
                                                        <Key size={16} className="flex-shrink-0 mt-0.5" />
                                                        <span>Save your passphrase securely - it cannot be recovered</span>
                                                    </div>
                                                )}
                                            </div>

                                            {mode === 'unlock' && (
                                                <button
                                                    type="button"
                                                    onClick={() => setMode('create')}
                                                    className="w-full text-sm text-purple-400 hover:text-purple-300 transition-colors"
                                                >
                                                    Create a new wallet instead
                                                </button>
                                            )}
                                        </form>
                                    </>
                                )}
                            </GlassCard>
                        </motion.div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
