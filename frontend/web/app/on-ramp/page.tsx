'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, RefreshCw, ChevronRight, CreditCard, Banknote, ShieldCheck, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import GlassCard from '@/components/ui/GlassCard';
import { rampApi } from '@/lib/apiClient';

export default function OnRampPage() {
    const router = useRouter();
    const [amount, setAmount] = useState<string>('');
    const [calculating, setCalculating] = useState(false);
    const [quote, setQuote] = useState<{ cryptoAmount: number, exchangeRate: number } | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [step, setStep] = useState<'input' | 'processing' | 'success'>('input');
    const [intentId, setIntentId] = useState<string | null>(null);

    // Debounce quote calculation
    useEffect(() => {
        const timer = setTimeout(() => {
            if (amount && !isNaN(Number(amount)) && Number(amount) > 0) {
                calculateQuote(Number(amount));
            } else {
                setQuote(null);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [amount]);

    const calculateQuote = async (inrAmount: number) => {
        setCalculating(true);
        // Simulate quote calculation or call an API if available
        // For now we assume a fixed rate roughly
        // Real implementation: You might want an API for getting a quote before creating intent
        // But rampApi.createOnRamp returns the quote.

        // We'll mimic rate here for UI feedback, but actual comes from API
        await new Promise(r => setTimeout(r, 500));
        const rate = 88.5; // Example INR/USDC
        setQuote({
            cryptoAmount: inrAmount / rate,
            exchangeRate: rate
        });
        setCalculating(false);
    };

    const handleProceed = async () => {
        if (!amount || isNaN(Number(amount))) return;

        setLoading(true);
        setError(null);

        try {
            const response = await rampApi.createOnRamp(Number(amount), 'USDC');

            if (response.success && response.data) {
                setIntentId(response.data.id);
                setStep('processing');
                // In a real app, we would redirect to a payment gateway or show payment instructions
                // For this demo, we'll simulate a processing delay then success
                simulateProcessing(response.data.id);
            } else {
                setError(response.error || 'Failed to initialize transaction');
            }
        } catch (err: any) {
            setError(err.message || 'Network error');
        } finally {
            setLoading(false);
        }
    };

    const simulateProcessing = async (id: string) => {
        // Poll status or wait
        // Since this is likely a simulation or "intent created", we might wait for user to pay
        // For demo purposes, we'll auto-advance to success after a delay
        setTimeout(() => {
            setStep('success');
        }, 3000);
    };

    return (
        <div className="min-h-screen bg-black text-white p-4 pb-20">
            <div className="max-w-md mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Link href="/dashboard" className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition">
                        <ArrowLeft size={20} />
                    </Link>
                    <h1 className="text-xl font-bold">Add Money</h1>
                </div>

                {step === 'input' && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-6"
                    >
                        {/* Amount Input */}
                        <GlassCard className="p-6 space-y-4">
                            <label className="text-sm text-gray-400">Amount to add (INR)</label>
                            <div className="flex items-center gap-2">
                                <span className="text-3xl font-bold text-gray-500">₹</span>
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="0"
                                    className="w-full bg-transparent text-4xl font-bold focus:outline-none placeholder-gray-700"
                                    autoFocus
                                />
                            </div>

                            {calculating ? (
                                <div className="flex items-center gap-2 text-sm text-blue-400">
                                    <RefreshCw size={14} className="animate-spin" />
                                    Calculating...
                                </div>
                            ) : quote ? (
                                <div className="p-3 bg-white/5 rounded-lg flex justify-between items-center">
                                    <span className="text-sm text-gray-400">You receive approx.</span>
                                    <span className="font-bold text-green-400">
                                        {quote.cryptoAmount.toFixed(2)} USDC
                                    </span>
                                </div>
                            ) : null}
                        </GlassCard>

                        {/* Payment Method */}
                        <div className="space-y-3">
                            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Payment Method</h3>

                            <GlassCard className="flex items-center justify-between p-4 border border-blue-500/30 bg-blue-500/5" hoverEffect={false}>
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-purple-500/20 rounded-lg text-purple-400">
                                        <Banknote size={24} />
                                    </div>
                                    <div>
                                        <div className="font-bold">UPI / Bank Transfer</div>
                                        <div className="text-xs text-gray-400">Instant deposit</div>
                                    </div>
                                </div>
                                <div className="w-5 h-5 rounded-full border-2 border-blue-500 flex items-center justify-center">
                                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                                </div>
                            </GlassCard>

                            <GlassCard className="flex items-center justify-between p-4 opacity-50 cursor-not-allowed">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-gray-500/20 rounded-lg text-gray-400">
                                        <CreditCard size={24} />
                                    </div>
                                    <div>
                                        <div className="font-bold text-gray-400">Credit Card</div>
                                        <div className="text-xs text-gray-500">Coming soon</div>
                                    </div>
                                </div>
                            </GlassCard>
                        </div>

                        {/* Info */}
                        <div className="flex gap-3 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                            <ShieldCheck className="text-yellow-500 shrink-0" size={20} />
                            <p className="text-xs text-gray-300 leading-relaxed">
                                Transactions are processed securely. Funds usually arrive in your wallet within 1-5 minutes after payment confirmation.
                            </p>
                        </div>

                        {error && (
                            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400">
                                <AlertCircle size={20} />
                                <span className="text-sm">{error}</span>
                            </div>
                        )}

                        <button
                            onClick={handleProceed}
                            disabled={loading || !amount || Number(amount) <= 0}
                            className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-500 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                        >
                            {loading ? (
                                <>
                                    <RefreshCw className="animate-spin" size={20} />
                                    Processing...
                                </>
                            ) : (
                                <>
                                    Proceed to Pay
                                    <ChevronRight size={20} />
                                </>
                            )}
                        </button>
                    </motion.div>
                )}

                {step === 'processing' && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col items-center justify-center py-20"
                    >
                        <div className="relative w-24 h-24 mb-8">
                            <div className="absolute inset-0 border-4 border-blue-500/30 rounded-full" />
                            <div className="absolute inset-0 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Banknote className="text-blue-400" size={32} />
                            </div>
                        </div>
                        <h2 className="text-2xl font-bold mb-2">Processing Deposit...</h2>
                        <p className="text-gray-400 text-center max-w-xs">
                            Please complete the payment if redirected. We are verifying your transaction.
                        </p>
                    </motion.div>
                )}

                {step === 'success' && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col items-center justify-center py-20 text-center"
                    >
                        <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mb-8 border border-green-500/30">
                            <ShieldCheck className="text-green-500" size={48} />
                        </div>
                        <h2 className="text-2xl font-bold mb-2 text-green-400">Desposit Successful!</h2>
                        <p className="text-gray-400 max-w-xs mb-8">
                            Your wallet has been funded with <span className="text-white font-bold">{quote?.cryptoAmount.toFixed(2)} USDC</span>
                        </p>

                        <Link href="/dashboard" className="w-full">
                            <button className="w-full py-4 bg-gray-800 hover:bg-gray-700 rounded-xl font-bold">
                                Return to Dashboard
                            </button>
                        </Link>
                    </motion.div>
                )}
            </div>
        </div>
    );
}
