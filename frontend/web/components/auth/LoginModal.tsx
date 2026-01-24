'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import GlassCard from '@/components/ui/GlassCard';
import { X, Wallet, Mail, ArrowRight, Loader2 } from 'lucide-react';
import { useWallet } from '@/hooks/useWallet';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function LoginModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
    const [email, setEmail] = useState('');
    const [isEmailView, setIsEmailView] = useState(false);
    const [loading, setLoading] = useState(false);
    const { connectFreighter, syncInternal, error: walletError } = useWallet();
    const router = useRouter();

    const handleFreighter = async () => {
        setLoading(true);
        const success = await connectFreighter();
        if (success) {
            router.push('/dashboard');
        }
        setLoading(false);
    };

    const handleEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
                emailRedirectTo: 'http://localhost:3000/dashboard'
            }
        });

        if (error) {
            alert(error.message);
        } else {
            alert('Check your email for the login link!');
        }
        setLoading(false);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
                        onClick={onClose}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                            className="relative w-full max-w-md max-h-[90vh] overflow-y-auto"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <GlassCard className="p-8 relative">
                                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
                                    <X size={20} />
                                </button>

                                <div className="text-center mb-8">
                                    <h2 className="text-2xl font-bold mb-2">Welcome to LumenPay</h2>
                                    <p className="text-gray-400 text-sm">Connect your wallet to enter the dashboard</p>
                                </div>

                                { }
                                {walletError && (
                                    <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-200 text-xs">
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                                            {walletError}
                                        </div>
                                        {walletError.toLowerCase().includes('install') && (
                                            <a
                                                href="https://www.freighter.app/"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="ml-3.5 text-blue-400 hover:text-blue-300 underline"
                                            >
                                                Download Freighter Extension
                                            </a>
                                        )}
                                    </div>
                                )}

                                {!isEmailView ? (
                                    <div className="space-y-4">
                                        <button
                                            onClick={handleFreighter}
                                            disabled={loading}
                                            className="w-full p-4 rounded-xl bg-[#3e1b8b] hover:bg-[#4c22a3] transition-colors flex items-center justify-between group"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-white/10 rounded-full">
                                                    {loading ? <Loader2 className="animate-spin" /> : <Wallet size={20} />}
                                                </div>
                                                <div className="text-left">
                                                    <div className="font-bold">Connect Freighter</div>
                                                    <div className="text-xs text-gray-300">Browser Extension</div>
                                                </div>
                                            </div>
                                            <ArrowRight className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </button>

                                        <div className="relative py-4">
                                            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div>
                                            <div className="relative flex justify-center text-xs uppercase"><span className="bg-black px-2 text-gray-500">Or</span></div>
                                        </div>

                                        <button
                                            onClick={() => setIsEmailView(true)}
                                            className="w-full p-4 rounded-xl bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-between group"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-white/5 rounded-full">
                                                    <Wallet size={20} className="text-white" />
                                                </div>
                                                <div className="text-left">
                                                    <div className="font-bold">Create Stellar Wallet</div>
                                                    <div className="text-xs text-gray-300">Powered by LumenPay</div>
                                                </div>
                                            </div>
                                            <ArrowRight className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </button>
                                    </div>
                                ) : (
                                    <form onSubmit={handleEmailLogin} className="space-y-4">
                                        <div className="text-center mb-6">
                                            <h3 className="text-lg font-bold">Secure your Wallet</h3>
                                            <p className="text-xs text-gray-400">Enter your email to create your custodial wallet</p>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-400 mb-1">Email Address</label>
                                            <input
                                                type="email"
                                                required
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                className="w-full bg-black/50 border border-white/10 rounded-lg p-3 focus:outline-none focus:border-white/30"
                                                placeholder="name@example.com"
                                            />
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="w-full py-3 bg-white text-black font-bold rounded-lg hover:bg-gray-200 transition"
                                        >
                                            {loading ? 'Creating...' : 'Create Wallet'}
                                        </button>
                                        <button
                                            onClick={() => setIsEmailView(false)}
                                            className="w-full text-xs text-gray-500 hover:text-white"
                                        >
                                            Back to Options
                                        </button>
                                    </form>
                                )}
                            </GlassCard>
                        </motion.div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
