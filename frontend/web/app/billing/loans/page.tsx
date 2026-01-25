'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft,
    Percent,
    Shield,
    Clock,
    AlertTriangle,
    ChevronRight,
    Plus,
    TrendingUp,
    Wallet,
    Check,
    X,
    Info,
    Lock,
    Unlock,
    RefreshCw
} from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface CollateralItem {
    id: string;
    collateral_type: string;
    asset_code: string;
    amount: number;
    value_at_deposit: number;
    current_value: number | null;
    is_locked: boolean;
}

interface Loan {
    id: string;
    loan_type: 'collateral' | 'flash';
    principal_amount: number;
    loan_amount: number;
    interest_rate_bps: number;
    tenure_days: number;
    amount_repaid: number;
    amount_outstanding: number;
    status: 'pending' | 'active' | 'repaid' | 'defaulted' | 'liquidated';
    ltv_ratio: number | null;
    liquidation_threshold: number;
    requested_at: string;
    disbursed_at: string | null;
    due_date: string | null;
    collateral?: CollateralItem[];
}

interface LoanSummary {
    active_loans: number;
    total_borrowed: number;
    total_outstanding: number;
    total_collateral: number;
    health_factor: string;
    is_healthy: boolean;
}

const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08 } }
};

const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
};

export default function LoansPage() {
    const router = useRouter();
    const [loans, setLoans] = useState<Loan[]>([]);
    const [summary, setSummary] = useState<LoanSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [showNewLoanModal, setShowNewLoanModal] = useState(false);
    const [showRepayModal, setShowRepayModal] = useState<Loan | null>(null);
    const [filter, setFilter] = useState<'all' | 'active' | 'repaid'>('all');
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    useEffect(() => {
        fetchLoans();
    }, [filter]);

    const fetchLoans = async () => {
        try {
            setLoading(true);
            const userId = localStorage.getItem('userId');
            if (!userId) return;

            const params = new URLSearchParams({ userId });
            if (filter !== 'all') params.append('status', filter);

            const response = await fetch(`/api/billing/loans?${params.toString()}`);
            if (response.ok) {
                const data = await response.json();
                setLoans(data.loans || []);
                setSummary(data.summary);
            }
        } catch (err) {
            console.error('Error fetching loans:', err);
        } finally {
            setLoading(false);
        }
    };

    const getHealthColor = (factor: string) => {
        const f = parseFloat(factor);
        if (f >= 2) return 'text-green-400';
        if (f >= 1.5) return 'text-yellow-400';
        if (f >= 1.2) return 'text-orange-400';
        return 'text-red-400';
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'bg-cyan-500/20 text-cyan-400';
            case 'repaid': return 'bg-green-500/20 text-green-400';
            case 'pending': return 'bg-yellow-500/20 text-yellow-400';
            case 'defaulted': return 'bg-red-500/20 text-red-400';
            case 'liquidated': return 'bg-red-500/20 text-red-400';
            default: return 'bg-white/10 text-white/60';
        }
    };

    return (
        <motion.div
            className="space-y-4 sm:space-y-6 pb-24"
            variants={container}
            initial="hidden"
            animate="show"
        >
            {}
            <motion.div variants={item} className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                <button
                    onClick={() => router.back()}
                    className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 text-white" />
                </button>
                <div className="flex-1">
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">Collateral Loans</h1>
                    <p className="text-white/60 text-sm sm:text-base">Borrow against your assets</p>
                </div>
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowNewLoanModal(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-500 text-white font-medium text-sm sm:text-base whitespace-nowrap w-full sm:w-auto justify-center"
                >
                    <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                    New Loan
                </motion.button>
            </motion.div>

            {}
            {summary && (
                <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    <GlassCard className="p-4 sm:p-5">
                        <p className="text-white/60 text-xs sm:text-sm">Total Outstanding</p>
                        <p className="text-xl sm:text-2xl font-bold text-white">
                            ${summary.total_outstanding.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                        <p className="text-white/40 text-xs mt-1">
                            {summary.active_loans} active loan{summary.active_loans !== 1 ? 's' : ''}
                        </p>
                    </GlassCard>

                    <GlassCard className="p-4 sm:p-5">
                        <p className="text-white/60 text-xs sm:text-sm">Health Factor</p>
                        <p className={`text-xl sm:text-2xl font-bold ${getHealthColor(summary.health_factor)}`}>
                            {summary.health_factor === '999.00' ? '∞' : summary.health_factor}
                        </p>
                        <p className="text-white/40 text-xs mt-1">
                            {summary.is_healthy ? 'Position is healthy' : '⚠️ At risk'}
                        </p>
                    </GlassCard>

                    <GlassCard className="p-4 sm:p-5">
                        <p className="text-white/60 text-xs sm:text-sm">Collateral Locked</p>
                        <p className="text-lg sm:text-xl font-bold text-white">
                            ${summary.total_collateral.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                    </GlassCard>

                    <GlassCard className="p-4 sm:p-5">
                        <p className="text-white/60 text-xs sm:text-sm">Total Borrowed</p>
                        <p className="text-lg sm:text-xl font-bold text-white">
                            ${summary.total_borrowed.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                    </GlassCard>
                </motion.div>
            )}

            {}
            <motion.div variants={item} className="flex gap-2">
                {(['all', 'active', 'repaid'] as const).map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${filter === f
                            ? 'bg-cyan-500 text-white'
                            : 'bg-white/5 text-white/60 hover:bg-white/10'
                            }`}
                    >
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                ))}
            </motion.div>

            {}
            <motion.div variants={item} className="space-y-3">
                {loading ? (
                    [1, 2, 3].map(i => (
                        <div key={i} className="h-32 bg-white/5 rounded-2xl animate-pulse" />
                    ))
                ) : loans.length > 0 ? (
                    loans.map(loan => (
                        <LoanCard
                            key={loan.id}
                            loan={loan}
                            onRepay={() => setShowRepayModal(loan)}
                        />
                    ))
                ) : (
                    <GlassCard className="text-center py-12">
                        <Percent className="w-12 h-12 text-white/20 mx-auto mb-4" />
                        <p className="text-white/60">No loans found</p>
                        <button
                            onClick={() => setShowNewLoanModal(true)}
                            className="mt-4 text-cyan-400 text-sm hover:underline"
                        >
                            Get your first loan →
                        </button>
                    </GlassCard>
                )}
            </motion.div>

            {}
            <motion.div variants={item}>
                <GlassCard className="bg-purple-500/10">
                    <div className="flex gap-4">
                        <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                            <Info className="w-6 h-6 text-purple-400" />
                        </div>
                        <div>
                            <h3 className="text-white font-semibold mb-1">How it works</h3>
                            <ul className="text-white/60 text-sm space-y-1">
                                <li>• Deposit collateral (up to 70% LTV)</li>
                                <li>• Receive instant USDC loan</li>
                                <li>• Repay anytime to unlock collateral</li>
                                <li>• Liquidation at 80% LTV to protect lenders</li>
                            </ul>
                        </div>
                    </div>
                </GlassCard>
            </motion.div>

            {}
            <AnimatePresence>
                {showNewLoanModal && (
                    <NewLoanModal
                        onClose={() => setShowNewLoanModal(false)}
                        onSuccess={() => {
                            setShowNewLoanModal(false);
                            setMessage({ type: 'success', text: 'Loan created successfully!' });
                            fetchLoans();
                            setTimeout(() => setMessage(null), 3000);
                        }}
                    />
                )}
            </AnimatePresence>

            {}
            <AnimatePresence>
                {showRepayModal && (
                    <RepayModal
                        loan={showRepayModal}
                        onClose={() => setShowRepayModal(null)}
                        onSuccess={(msg) => {
                            setShowRepayModal(null);
                            setMessage({ type: 'success', text: msg });
                            fetchLoans();
                            setTimeout(() => setMessage(null), 3000);
                        }}
                    />
                )}
            </AnimatePresence>

            {}
            <AnimatePresence>
                {message && (
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 50 }}
                        className={`fixed bottom-24 left-4 right-4 p-4 rounded-xl z-50 ${message.type === 'success' ? 'bg-green-500' : 'bg-red-500'
                            }`}
                    >
                        <div className="flex items-center gap-3 text-white">
                            {message.type === 'success' ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
                            <span>{message.text}</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}


function LoanCard({ loan, onRepay }: { loan: Loan; onRepay: () => void }) {
    const dueDate = loan.due_date ? new Date(loan.due_date) : null;
    const isOverdue = dueDate && dueDate < new Date() && loan.status === 'active';
    const daysUntilDue = dueDate
        ? Math.ceil((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : 0;

    const collateralValue = (loan.collateral || []).reduce(
        (sum, c) => sum + (c.current_value || c.value_at_deposit), 0
    );

    const currentLTV = collateralValue > 0
        ? (loan.amount_outstanding / collateralValue) * 100
        : 0;

    return (
        <GlassCard className={isOverdue ? 'border-red-500/50' : ''} hoverEffect>
            <div className="flex items-start justify-between mb-3">
                <div>
                    <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-lg text-xs font-medium ${loan.status === 'active' ? 'bg-cyan-500/20 text-cyan-400' :
                            loan.status === 'repaid' ? 'bg-green-500/20 text-green-400' :
                                'bg-red-500/20 text-red-400'
                            }`}>
                            {loan.status.toUpperCase()}
                        </span>
                        {isOverdue && (
                            <span className="px-2 py-0.5 rounded-lg text-xs font-medium bg-red-500/20 text-red-400">
                                OVERDUE
                            </span>
                        )}
                    </div>
                    <p className="text-white/40 text-xs mt-1">
                        {new Date(loan.requested_at).toLocaleDateString()}
                    </p>
                </div>
                <div className="text-right">
                    <p className="text-white text-lg font-bold">
                        ${loan.amount_outstanding.toFixed(2)}
                    </p>
                    <p className="text-white/40 text-xs">outstanding</p>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-3">
                <div>
                    <p className="text-white/40 text-xs">Principal</p>
                    <p className="text-white font-medium">${loan.principal_amount.toFixed(2)}</p>
                </div>
                <div>
                    <p className="text-white/40 text-xs">APR</p>
                    <p className="text-white font-medium">{(loan.interest_rate_bps / 100).toFixed(2)}%</p>
                </div>
                <div>
                    <p className="text-white/40 text-xs">Due</p>
                    <p className={`font-medium ${isOverdue ? 'text-red-400' : daysUntilDue <= 7 ? 'text-yellow-400' : 'text-white'}`}>
                        {loan.status === 'repaid' ? 'Paid' : daysUntilDue > 0 ? `${daysUntilDue}d` : 'Today'}
                    </p>
                </div>
            </div>

            {}
            {loan.status === 'active' && (
                <>
                    <div className="flex justify-between items-center mb-2 text-sm">
                        <span className="text-white/60">Current LTV</span>
                        <span className={`font-medium ${currentLTV >= 75 ? 'text-red-400' :
                            currentLTV >= 65 ? 'text-yellow-400' :
                                'text-green-400'
                            }`}>
                            {currentLTV.toFixed(1)}%
                        </span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-3">
                        <div
                            className={`h-full rounded-full transition-all ${currentLTV >= 75 ? 'bg-red-500' :
                                currentLTV >= 65 ? 'bg-yellow-500' :
                                    'bg-green-500'
                                }`}
                            style={{ width: `${Math.min(currentLTV, 100)}%` }}
                        />
                    </div>
                </>
            )}

            {}
            {loan.collateral && loan.collateral.length > 0 && (
                <div className="flex gap-2 flex-wrap mb-3">
                    {loan.collateral.map(c => (
                        <div key={c.id} className="flex items-center gap-1 px-2 py-1 bg-white/5 rounded-lg text-xs">
                            {c.is_locked ? <Lock className="w-3 h-3 text-amber-400" /> : <Unlock className="w-3 h-3 text-green-400" />}
                            <span className="text-white">{c.amount} {c.asset_code}</span>
                        </div>
                    ))}
                </div>
            )}

            {}
            {loan.status === 'active' && (
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onRepay}
                    className="w-full py-2.5 bg-green-500 text-white font-medium rounded-xl"
                >
                    Repay Loan
                </motion.button>
            )}
        </GlassCard>
    );
}


function NewLoanModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
    const [step, setStep] = useState(1);
    const [collateralAsset, setCollateralAsset] = useState('USDC');
    const [collateralAmount, setCollateralAmount] = useState('');
    const [borrowAmount, setBorrowAmount] = useState('');
    const [tenure, setTenure] = useState(30);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const assetPrices: Record<string, number> = {
        'USDC': 1,
        'XLM': 0.12,
    };

    const collateralValue = parseFloat(collateralAmount) * (assetPrices[collateralAsset] || 1);
    const maxBorrow = collateralValue * 0.7;
    const currentLTV = collateralValue > 0 ? (parseFloat(borrowAmount) / collateralValue) * 100 : 0;
    const interestRate = 10 + (currentLTV > 40 ? Math.floor((currentLTV - 40) / 10) * 2 : 0);

    const handleSubmit = async () => {
        if (!collateralAmount || !borrowAmount) {
            setError('Please fill all fields');
            return;
        }

        if (currentLTV > 70) {
            setError('LTV exceeds maximum 70%');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const userId = localStorage.getItem('userId');

            const response = await fetch('/api/billing/loans', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    principalAmount: parseFloat(borrowAmount),
                    tenureDays: tenure,
                    collateral: [{ assetCode: collateralAsset, amount: parseFloat(collateralAmount) }],
                }),
            });

            const data = await response.json();

            if (response.ok) {
                onSuccess();
            } else {
                setError(data.error || 'Failed to create loan');
            }
        } catch (err) {
            setError('Network error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center"
            onClick={onClose}
        >
            <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md bg-[#12121a] rounded-t-3xl sm:rounded-3xl p-6 max-h-[90vh] overflow-y-auto"
            >
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-white">New Collateral Loan</h2>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full">
                        <X className="w-5 h-5 text-white/60" />
                    </button>
                </div>

                <div className="space-y-6">
                    {}
                    <div>
                        <label className="text-white/60 text-sm mb-2 block">Collateral Asset</label>
                        <div className="flex gap-2">
                            {['USDC', 'XLM'].map(asset => (
                                <button
                                    key={asset}
                                    onClick={() => setCollateralAsset(asset)}
                                    className={`flex-1 py-3 rounded-xl font-medium transition-all ${collateralAsset === asset
                                        ? 'bg-cyan-500 text-white'
                                        : 'bg-white/5 text-white/60 hover:bg-white/10'
                                        }`}
                                >
                                    {asset}
                                </button>
                            ))}
                        </div>
                    </div>

                    {}
                    <div>
                        <label className="text-white/60 text-sm mb-2 block">Collateral Amount</label>
                        <input
                            type="number"
                            value={collateralAmount}
                            onChange={(e) => setCollateralAmount(e.target.value)}
                            placeholder="0.00"
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                        />
                        <p className="text-white/40 text-xs mt-1">
                            Value: ${collateralValue.toFixed(2)} • Max borrow: ${maxBorrow.toFixed(2)}
                        </p>
                    </div>

                    {}
                    <div>
                        <label className="text-white/60 text-sm mb-2 block">Borrow Amount (USDC)</label>
                        <input
                            type="number"
                            value={borrowAmount}
                            onChange={(e) => setBorrowAmount(e.target.value)}
                            placeholder="0.00"
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                        />
                        <div className="flex justify-between text-xs mt-1">
                            <span className={`${currentLTV > 70 ? 'text-red-400' : 'text-white/40'}`}>
                                LTV: {currentLTV.toFixed(1)}%
                            </span>
                            <button
                                onClick={() => setBorrowAmount(maxBorrow.toFixed(2))}
                                className="text-cyan-400"
                            >
                                Max
                            </button>
                        </div>
                    </div>

                    {}
                    <div>
                        <label className="text-white/60 text-sm mb-2 block">Loan Duration</label>
                        <div className="flex gap-2">
                            {[7, 14, 30, 90].map(days => (
                                <button
                                    key={days}
                                    onClick={() => setTenure(days)}
                                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${tenure === days
                                        ? 'bg-white/20 text-white'
                                        : 'bg-white/5 text-white/60 hover:bg-white/10'
                                        }`}
                                >
                                    {days}d
                                </button>
                            ))}
                        </div>
                    </div>

                    {}
                    {borrowAmount && parseFloat(borrowAmount) > 0 && (
                        <div className="bg-white/5 rounded-xl p-4 space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-white/60">Interest Rate (APR)</span>
                                <span className="text-white">{interestRate}%</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-white/60">Origination Fee (0.5%)</span>
                                <span className="text-white">${(parseFloat(borrowAmount) * 0.005).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-white/60">You Receive</span>
                                <span className="text-green-400">${(parseFloat(borrowAmount) * 0.995).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-sm pt-2 border-t border-white/10">
                                <span className="text-white/60">Total to Repay</span>
                                <span className="text-white font-medium">
                                    ${(parseFloat(borrowAmount) * (1 + (interestRate / 100) * (tenure / 365))).toFixed(2)}
                                </span>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="p-3 bg-red-500/20 rounded-xl text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleSubmit}
                        disabled={loading || !borrowAmount || currentLTV > 70}
                        className="w-full py-3 bg-purple-500 text-white font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Processing...' : 'Create Loan'}
                    </motion.button>
                </div>
            </motion.div>
        </motion.div>
    );
}


function RepayModal({ loan, onClose, onSuccess }: { loan: Loan; onClose: () => void; onSuccess: (msg: string) => void }) {
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleRepay = async () => {
        if (!amount || parseFloat(amount) <= 0) {
            setError('Please enter a valid amount');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const userId = localStorage.getItem('userId');

            const response = await fetch('/api/billing/loans/repay', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    loanId: loan.id,
                    amount: parseFloat(amount),
                }),
            });

            const data = await response.json();

            if (response.ok) {
                onSuccess(data.message);
            } else {
                setError(data.error || 'Repayment failed');
            }
        } catch (err) {
            setError('Network error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center"
            onClick={onClose}
        >
            <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md bg-[#12121a] rounded-t-3xl sm:rounded-3xl p-6"
            >
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-white">Repay Loan</h2>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full">
                        <X className="w-5 h-5 text-white/60" />
                    </button>
                </div>

                <div className="space-y-6">
                    <div className="bg-white/5 rounded-xl p-4">
                        <div className="flex justify-between mb-2">
                            <span className="text-white/60">Outstanding</span>
                            <span className="text-white font-bold">${loan.amount_outstanding.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-white/60">Already Paid</span>
                            <span className="text-green-400">${loan.amount_repaid.toFixed(2)}</span>
                        </div>
                    </div>

                    <div>
                        <label className="text-white/60 text-sm mb-2 block">Repayment Amount</label>
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0.00"
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                        />
                        <div className="flex justify-end mt-1">
                            <button
                                onClick={() => setAmount(loan.amount_outstanding.toFixed(2))}
                                className="text-cyan-400 text-xs"
                            >
                                Pay Full Amount
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-500/20 rounded-xl text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleRepay}
                        disabled={loading || !amount}
                        className="w-full py-3 bg-green-500 text-white font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Processing...' : `Repay $${amount || '0.00'}`}
                    </motion.button>
                </div>
            </motion.div>
        </motion.div>
    );
}
