'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import GlassCard from '@/components/ui/GlassCard';
import { X, Wallet, Mail, Loader2, Shield, CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function LoginModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [emailSent, setEmailSent] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    const handleCustodialLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { error: authError } = await supabase.auth.signInWithOtp({
                email,
                options: {
                    emailRedirectTo: `${window.location.origin}/dashboard`
                }
            });

            if (authError) {
                setError(authError.message);
            } else {
                setEmailSent(true);
            }
        } catch (err: any) {
            setError(err.message || 'An error occurred');
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

                                {!emailSent ? (
                                    <>
                                        <div className="text-center mb-8">
                                            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full mb-4">
                                                <Wallet size={32} className="text-white" />
                                            </div>
                                            <h2 className="text-2xl font-bold mb-2">Welcome to LumenPay</h2>
                                            <p className="text-gray-400 text-sm">
                                                Your secure wallet will be created automatically
                                            </p>
                                        </div>

                                        {error && (
                                            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-200 text-sm">
                                                {error}
                                            </div>
                                        )}

                                        <form onSubmit={handleCustodialLogin} className="space-y-6">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                                    Email Address
                                                </label>
                                                <div className="relative">
                                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                                    <input
                                                        type="email"
                                                        required
                                                        value={email}
                                                        onChange={(e) => setEmail(e.target.value)}
                                                        className="w-full bg-black/50 border border-white/10 rounded-lg pl-11 pr-4 py-3 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
                                                        placeholder="you@example.com"
                                                        disabled={loading}
                                                    />
                                                </div>
                                            </div>

                                            <button
                                                type="submit"
                                                disabled={loading || !email}
                                                className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                                            >
                                                {loading ? (
                                                    <>
                                                        <Loader2 className="animate-spin" size={20} />
                                                        <span>Processing...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Wallet size={20} />
                                                        <span>Continue with Our Wallet</span>
                                                    </>
                                                )}
                                            </button>

                                            <div className="space-y-3 pt-4 border-t border-white/10">
                                                <div className="flex items-start gap-2 text-xs text-gray-400">
                                                    <Shield size={16} className="flex-shrink-0 mt-0.5 text-green-400" />
                                                    <span>Secure wallet created automatically - no setup required</span>
                                                </div>
                                                <div className="flex items-start gap-2 text-xs text-gray-400">
                                                    <CheckCircle size={16} className="flex-shrink-0 mt-0.5 text-green-400" />
                                                    <span>No external wallet or browser extension needed</span>
                                                </div>
                                            </div>
                                        </form>
                                    </>
                                ) : (
                                    <div className="text-center py-8">
                                        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500/20 rounded-full mb-4">
                                            <Mail size={32} className="text-green-400" />
                                        </div>
                                        <h3 className="text-xl font-bold mb-3">Check Your Email</h3>
                                        <p className="text-gray-400 text-sm mb-6">
                                            We've sent a secure login link to<br />
                                            <span className="text-white font-medium">{email}</span>
                                        </p>
                                        <p className="text-xs text-gray-500 mb-6">
                                            Click the link in your email to continue and access your wallet.
                                        </p>
                                        <button
                                            onClick={() => {
                                                setEmailSent(false);
                                                setEmail('');
                                            }}
                                            className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
                                        >
                                            Use a different email
                                        </button>
                                    </div>
                                )}
                            </GlassCard>
                        </motion.div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
