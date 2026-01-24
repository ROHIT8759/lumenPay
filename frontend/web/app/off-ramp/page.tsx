'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, RefreshCw, ChevronRight, Building, ArrowDownLeft, AlertCircle, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import GlassCard from '@/components/ui/GlassCard';
import { rampApi } from '@/lib/apiClient';

export default function OffRampPage() {
    const router = useRouter();
    const [cryptoAmount, setCryptoAmount] = useState<string>('');
    const [bankAccount, setBankAccount] = useState('');
    const [ifsc, setIfsc] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [step, setStep] = useState<'input' | 'processing' | 'success'>('input');

    // Exchange rate simulation
    const EXCHANGE_RATE = 87.2; // Sell rate slightly lower

    const inrAmount = cryptoAmount && !isNaN(Number(cryptoAmount))
        ? (Number(cryptoAmount) * EXCHANGE_RATE).toFixed(2)
        : '0.00';

    const handleWithdraw = async () => {
        if (!cryptoAmount || !bankAccount || !ifsc) return;

        setLoading(true);
        setError(null);

        try {
            const response = await rampApi.createOffRamp(
                Number(cryptoAmount),
                'USDC',
                bankAccount,
                ifsc
            );

            if (response.success && response.data) {
                setStep('processing');
                // Simulate processing time
                setTimeout(() => {
                    setStep('success');
                }, 3000);
            } else {
                setError(response.error || 'Failed to initiate withdrawal');
            }
        } catch (err: any) {
            setError(err.message || 'Network error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black text-white p-4 pb-20">
            <div className="max-w-md mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Link href="/dashboard" className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition">
                        <ArrowLeft size={20} />
                    </Link>
                    <h1 className="text-xl font-bold">Withdraw to Bank</h1>
                </div>

                {step === 'input' && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-6"
                    >
                        {/* Amount Input */}
                        <GlassCard className="p-6 space-y-4">
                            <div className="flex justify-between">
                                <label className="text-sm text-gray-400">Amount to withdraw</label>
                                <div className="flex items-center gap-1 text-sm text-gray-400">
                                    <span>Balance:</span>
                                    <span className="text-white font-mono">100.00 USDC</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    value={cryptoAmount}
                                    onChange={(e) => setCryptoAmount(e.target.value)}
                                    placeholder="0"
                                    className="w-full bg-transparent text-4xl font-bold focus:outline-none placeholder-gray-700"
                                    autoFocus
                                />
                                <span className="text-xl font-bold text-gray-500">USDC</span>
                            </div>

                            <div className="p-3 bg-white/5 rounded-lg flex justify-between items-center">
                                <span className="text-sm text-gray-400">You receive approx.</span>
                                <span className="font-bold text-green-400">
                                    ₹ {inrAmount}
                                </span>
                            </div>
                        </GlassCard>

                        {/* Bank Details */}
                        <div className="space-y-3">
                            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Destination Bank</h3>

                            <GlassCard className="p-4 space-y-4">
                                <div>
                                    <label className="text-xs text-gray-500 mb-1 block">Account Number</label>
                                    <input
                                        type="text"
                                        value={bankAccount}
                                        onChange={(e) => setBankAccount(e.target.value)}
                                        className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-sm focus:border-blue-500 focus:outline-none transition-colors"
                                        placeholder="Enter account number"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 mb-1 block">IFSC Code</label>
                                    <input
                                        type="text"
                                        value={ifsc}
                                        onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                                        className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-sm focus:border-blue-500 focus:outline-none transition-colors"
                                        placeholder="e.g. HDFC0001234"
                                        maxLength={11}
                                    />
                                </div>
                            </GlassCard>
                        </div>

                        {error && (
                            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400">
                                <AlertCircle size={20} />
                                <span className="text-sm">{error}</span>
                            </div>
                        )}

                        <button
                            onClick={handleWithdraw}
                            disabled={loading || !cryptoAmount || !bankAccount || !ifsc}
                            className="w-full py-4 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-800 disabled:text-gray-500 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                        >
                            {loading ? (
                                <>
                                    <RefreshCw className="animate-spin" size={20} />
                                    Processing...
                                </>
                            ) : (
                                <>
                                    Confirm Withdrawal
                                    <ArrowDownLeft size={20} />
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
                            <div className="absolute inset-0 border-4 border-purple-500/30 rounded-full" />
                            <div className="absolute inset-0 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Building className="text-purple-400" size={32} />
                            </div>
                        </div>
                        <h2 className="text-2xl font-bold mb-2">Processing Withdrawal...</h2>
                        <p className="text-gray-400 text-center max-w-xs">
                            Sending {cryptoAmount} USDC to banking partner. Funds will be credited shortly.
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
                            <CheckCircle className="text-green-500" size={48} />
                        </div>
                        <h2 className="text-2xl font-bold mb-2 text-green-400">Withdrawal Initiated!</h2>
                        <p className="text-gray-400 max-w-xs mb-8">
                            <span className="text-white font-bold">₹ {inrAmount}</span> will be deposited to your bank account ending in {bankAccount.slice(-4)}.
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
