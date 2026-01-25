'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft,
    Zap,
    AlertCircle,
    Info,
    Check,
    X,
    Clock,
    ExternalLink,
    ChevronDown
} from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';
import { useRouter } from 'next/navigation';

interface FlashLoanLog {
    id: string;
    amount: number;
    asset_code: string;
    fee_amount: number;
    purpose: string | null;
    tx_hash: string | null;
    status: 'success' | 'failed' | 'pending';
    executed_at: string;
}

const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08 } }
};

const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
};

export default function FlashLoansPage() {
    const router = useRouter();
    const [logs, setLogs] = useState<FlashLoanLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [amount, setAmount] = useState('');
    const [executing, setExecuting] = useState(false);
    const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        
        setLoading(false);
    };

    const executeFlashLoan = async () => {
        if (!amount || parseFloat(amount) <= 0) return;

        setExecuting(true);
        setResult(null);

        
        await new Promise(resolve => setTimeout(resolve, 2000));

        
        
        setResult({
            success: true,
            message: `Flash loan of $${amount} executed and repaid in same transaction. Fee: $${(parseFloat(amount) * 0.003).toFixed(2)}`
        });

        setExecuting(false);
        setAmount('');
    };

    const fee = parseFloat(amount) * 0.003 || 0;

    return (
        <motion.div
            className="space-y-4 sm:space-y-6 pb-24"
            variants={container}
            initial="hidden"
            animate="show"
        >
            {}
            <motion.div variants={item} className="flex items-center gap-3 sm:gap-4">
                <button
                    onClick={() => router.back()}
                    className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 text-white" />
                </button>
                <div className="flex-1">
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">Flash Loans</h1>
                    <p className="text-white/60 text-sm sm:text-base">Atomic borrow & repay in one transaction</p>
                </div>
            </motion.div>

            {}
            <motion.div variants={item}>
                <GlassCard className="relative overflow-hidden">
                    <div className="absolute inset-0 bg-amber-500/20" />

                    <div className="relative">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-16 h-16 rounded-2xl bg-amber-500 flex items-center justify-center">
                                <Zap className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <h2 className="text-white text-xl font-bold">Instant Liquidity</h2>
                                <p className="text-white/60">No collateral required</p>
                            </div>
                        </div>

                        <p className="text-white/70 mb-4">
                            Flash loans provide uncollateralized liquidity for advanced DeFi operations.
                            The loan must be borrowed and repaid within the same Soroban transaction.
                        </p>

                        <div className="grid grid-cols-3 gap-4 mb-4">
                            <div className="bg-black/20 rounded-xl p-3 text-center">
                                <p className="text-amber-400 text-2xl font-bold">0.3%</p>
                                <p className="text-white/40 text-xs">Fee</p>
                            </div>
                            <div className="bg-black/20 rounded-xl p-3 text-center">
                                <p className="text-white text-2xl font-bold">$1M</p>
                                <p className="text-white/40 text-xs">Max Loan</p>
                            </div>
                            <div className="bg-black/20 rounded-xl p-3 text-center">
                                <p className="text-white text-2xl font-bold">~5s</p>
                                <p className="text-white/40 text-xs">Execution</p>
                            </div>
                        </div>

                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setShowModal(true)}
                            className="w-full py-3 bg-amber-500 text-white font-semibold rounded-xl"
                        >
                            Execute Flash Loan
                        </motion.button>
                    </div>
                </GlassCard>
            </motion.div>

            {}
            <motion.div variants={item}>
                <h3 className="text-white font-semibold mb-3">Use Cases</h3>
                <div className="space-y-3">
                    <UseCaseCard
                        title="Arbitrage"
                        description="Capture price differences across DEXs or markets"
                        example="Buy low on DEX A, sell high on DEX B"
                    />
                    <UseCaseCard
                        title="Collateral Swap"
                        description="Change your loan collateral without closing position"
                        example="Switch from XLM to USDC collateral"
                    />
                    <UseCaseCard
                        title="Self-Liquidation"
                        description="Close underwater positions before liquidation penalty"
                        example="Repay debt to avoid 10% liquidation fee"
                    />
                    <UseCaseCard
                        title="Leverage Trading"
                        description="Amplify positions within a single transaction"
                        example="3x leverage without multiple transactions"
                    />
                </div>
            </motion.div>

            {}
            <motion.div variants={item}>
                <GlassCard className="bg-blue-500/10">
                    <div className="flex gap-4">
                        <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                            <Info className="w-6 h-6 text-blue-400" />
                        </div>
                        <div>
                            <h3 className="text-white font-semibold mb-1">How Flash Loans Work</h3>
                            <ul className="text-white/60 text-sm space-y-1">
                                <li>1. Borrow any amount from the liquidity pool</li>
                                <li>2. Execute your arbitrage/swap/liquidation logic</li>
                                <li>3. Repay principal + 0.3% fee</li>
                                <li>4. Transaction reverts if repayment fails</li>
                            </ul>
                        </div>
                    </div>
                </GlassCard>
            </motion.div>

            {}
            <motion.div variants={item}>
                <GlassCard className="bg-red-500/10">
                    <div className="flex gap-4">
                        <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center flex-shrink-0">
                            <AlertCircle className="w-6 h-6 text-red-400" />
                        </div>
                        <div>
                            <h3 className="text-white font-semibold mb-1">⚠️ Advanced Feature</h3>
                            <p className="text-white/60 text-sm">
                                Flash loans require smart contract knowledge to use effectively.
                                If the repayment condition is not met, the entire transaction will fail
                                and you&apos;ll only lose the gas fees.
                            </p>
                        </div>
                    </div>
                </GlassCard>
            </motion.div>

            {}
            {logs.length > 0 && (
                <motion.div variants={item}>
                    <h3 className="text-white font-semibold mb-3">Recent Flash Loans</h3>
                    <div className="space-y-3">
                        {logs.map(log => (
                            <LogCard key={log.id} log={log} />
                        ))}
                    </div>
                </motion.div>
            )}

            {}
            <AnimatePresence>
                {showModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center"
                        onClick={() => setShowModal(false)}
                    >
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-md bg-[#12121a] rounded-t-3xl sm:rounded-3xl p-6"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold text-white">Execute Flash Loan</h2>
                                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white/10 rounded-full">
                                    <X className="w-5 h-5 text-white/60" />
                                </button>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <label className="text-white/60 text-sm mb-2 block">Loan Amount (USDC)</label>
                                    <input
                                        type="number"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        placeholder="0.00"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-amber-500/50 text-lg"
                                    />
                                    <div className="flex justify-between mt-2 text-sm">
                                        <span className="text-white/40">Fee (0.3%): ${fee.toFixed(2)}</span>
                                        <span className="text-white/40">Max: $1,000,000</span>
                                    </div>
                                </div>

                                <div className="bg-white/5 rounded-xl p-4">
                                    <h4 className="text-white/60 text-sm mb-2">Transaction Preview</h4>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-white/60">Borrow</span>
                                            <span className="text-white">${amount || '0.00'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-white/60">Fee</span>
                                            <span className="text-amber-400">${fee.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between pt-2 border-t border-white/10">
                                            <span className="text-white/60">Must Repay</span>
                                            <span className="text-white font-bold">${(parseFloat(amount || '0') + fee).toFixed(2)}</span>
                                        </div>
                                    </div>
                                </div>

                                {result && (
                                    <div className={`p-4 rounded-xl ${result.success ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                                        <div className="flex items-center gap-3">
                                            {result.success ? (
                                                <Check className="w-5 h-5 text-green-400" />
                                            ) : (
                                                <X className="w-5 h-5 text-red-400" />
                                            )}
                                            <span className={result.success ? 'text-green-400' : 'text-red-400'}>
                                                {result.message}
                                            </span>
                                        </div>
                                    </div>
                                )}

                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={executeFlashLoan}
                                    disabled={executing || !amount || parseFloat(amount) <= 0}
                                    className="w-full py-3 bg-amber-500 text-white font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {executing ? (
                                        <>
                                            <motion.div
                                                animate={{ rotate: 360 }}
                                                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                            >
                                                <Zap className="w-5 h-5" />
                                            </motion.div>
                                            Executing...
                                        </>
                                    ) : (
                                        <>
                                            <Zap className="w-5 h-5" />
                                            Execute Flash Loan
                                        </>
                                    )}
                                </motion.button>

                                <p className="text-white/40 text-xs text-center">
                                    Note: This is a demo. Real flash loans require custom Soroban contracts.
                                </p>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}


function UseCaseCard({ title, description, example }: { title: string; description: string; example: string }) {
    const [expanded, setExpanded] = useState(false);

    return (
        <GlassCard
            className="cursor-pointer"
            hoverEffect
            onClick={() => setExpanded(!expanded)}
        >
            <div className="flex items-center justify-between">
                <div>
                    <h4 className="text-white font-medium">{title}</h4>
                    <p className="text-white/60 text-sm">{description}</p>
                </div>
                <ChevronDown className={`w-5 h-5 text-white/40 transition-transform ${expanded ? 'rotate-180' : ''}`} />
            </div>

            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="pt-3 mt-3 border-t border-white/10">
                            <p className="text-cyan-400 text-sm flex items-center gap-2">
                                <Zap className="w-4 h-4" />
                                Example: {example}
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </GlassCard>
    );
}


function LogCard({ log }: { log: FlashLoanLog }) {
    return (
        <GlassCard>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${log.status === 'success' ? 'bg-green-500/20' :
                        log.status === 'pending' ? 'bg-yellow-500/20' : 'bg-red-500/20'
                        }`}>
                        {log.status === 'success' ? (
                            <Check className="w-5 h-5 text-green-400" />
                        ) : log.status === 'pending' ? (
                            <Clock className="w-5 h-5 text-yellow-400" />
                        ) : (
                            <X className="w-5 h-5 text-red-400" />
                        )}
                    </div>
                    <div>
                        <p className="text-white font-medium">${log.amount.toLocaleString()}</p>
                        <p className="text-white/40 text-xs">
                            Fee: ${log.fee_amount.toFixed(2)} • {new Date(log.executed_at).toLocaleDateString()}
                        </p>
                    </div>
                </div>

                {log.tx_hash && (
                    <a
                        href={`https://stellar.expert/explorer/testnet/tx/${log.tx_hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 hover:bg-white/10 rounded-lg"
                    >
                        <ExternalLink className="w-4 h-4 text-white/40" />
                    </a>
                )}
            </div>
        </GlassCard>
    );
}
