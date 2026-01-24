'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    ArrowLeft,
    TrendingUp,
    TrendingDown,
    PieChart,
    ArrowUpRight,
    Building2,
    Coins,
    Landmark,
    FileCheck2,
    Sparkles,
    ChevronRight,
    RefreshCw,
    Clock
} from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Holding {
    id: string;
    asset_id: string;
    quantity: number;
    average_buy_price: number;
    total_invested: number;
    total_yield_earned: number;
    pending_yield: number;
    first_purchase_at: string;
    last_transaction_at: string;
    current_value: number;
    unrealized_gain: number;
    unrealized_gain_percent: string;
    asset: {
        asset_code: string;
        name: string;
        asset_type: string;
        unit_price: number;
        annual_yield_percent: number;
        yield_frequency: string;
        risk_level: string;
    };
}

interface Portfolio {
    total_invested: number;
    current_value: number;
    total_gain: number;
    total_gain_percent: string;
    total_yield_earned: number;
    pending_yield: number;
    holdings_count: number;
}

interface Transaction {
    id: string;
    tx_type: 'buy' | 'sell' | 'yield_claim';
    quantity: number;
    price_per_unit: number;
    total_amount: number;
    status: string;
    created_at: string;
    asset: {
        asset_code: string;
        name: string;
        asset_type: string;
    };
}

const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08 } }
};

const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
};

const ASSET_TYPE_CONFIG: Record<string, { icon: React.ReactNode; color: string }> = {
    real_estate: { icon: <Building2 className="w-5 h-5" />, color: 'from-blue-500 to-cyan-500' },
    bond: { icon: <Landmark className="w-5 h-5" />, color: 'from-emerald-500 to-green-500' },
    commodity: { icon: <Coins className="w-5 h-5" />, color: 'from-amber-500 to-yellow-500' },
    invoice: { icon: <FileCheck2 className="w-5 h-5" />, color: 'from-purple-500 to-pink-500' },
    stable_yield: { icon: <TrendingUp className="w-5 h-5" />, color: 'from-teal-500 to-cyan-500' },
    equity_token: { icon: <Sparkles className="w-5 h-5" />, color: 'from-rose-500 to-orange-500' },
};

export default function PortfolioPage() {
    const router = useRouter();
    const [holdings, setHoldings] = useState<Holding[]>([]);
    const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'holdings' | 'history'>('holdings');

    useEffect(() => {
        fetchPortfolio();
    }, []);

    const fetchPortfolio = async () => {
        try {
            setLoading(true);
            const userId = localStorage.getItem('userId');
            if (!userId) return;

            
            const holdingsRes = await fetch(`/api/rwa/holdings?userId=${userId}`);
            if (holdingsRes.ok) {
                const data = await holdingsRes.json();
                setHoldings(data.holdings || []);
                setPortfolio(data.portfolio);
            }

            
            const txRes = await fetch('/api/rwa/holdings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, limit: 20 }),
            });
            if (txRes.ok) {
                const data = await txRes.json();
                setTransactions(data.transactions || []);
            }
        } catch (err) {
            console.error('Error fetching portfolio:', err);
        } finally {
            setLoading(false);
        }
    };

    
    const allocationByType = holdings.reduce((acc, h) => {
        const type = h.asset?.asset_type || 'other';
        acc[type] = (acc[type] || 0) + h.current_value;
        return acc;
    }, {} as Record<string, number>);

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
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">Portfolio</h1>
                    <p className="text-white/60 text-sm sm:text-base">Your RWA investments</p>
                </div>
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={fetchPortfolio}
                    className="p-2.5 sm:p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"
                >
                    <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </motion.button>
            </motion.div>

            {}
            {portfolio && (
                <motion.div variants={item}>
                    <GlassCard className="relative overflow-hidden">
                        <div className={`absolute inset-0 bg-gradient-to-br ${parseFloat(portfolio.total_gain_percent) >= 0
                            ? 'from-green-500/10 to-emerald-500/5'
                            : 'from-red-500/10 to-orange-500/5'
                            }`} />

                        <div className="relative">
                            <p className="text-white/60 text-sm">Total Portfolio Value</p>
                            <p className="text-4xl font-bold text-white mt-1">
                                ${portfolio.current_value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>

                            <div className="flex items-center gap-2 mt-2">
                                {parseFloat(portfolio.total_gain_percent) >= 0 ? (
                                    <TrendingUp className="w-5 h-5 text-green-400" />
                                ) : (
                                    <TrendingDown className="w-5 h-5 text-red-400" />
                                )}
                                <span className={`font-semibold ${parseFloat(portfolio.total_gain_percent) >= 0 ? 'text-green-400' : 'text-red-400'
                                    }`}>
                                    {parseFloat(portfolio.total_gain_percent) >= 0 ? '+' : ''}{portfolio.total_gain_percent}%
                                </span>
                                <span className={`text-sm ${parseFloat(portfolio.total_gain_percent) >= 0 ? 'text-green-400/60' : 'text-red-400/60'
                                    }`}>
                                    (${Math.abs(portfolio.total_gain).toFixed(2)})
                                </span>
                            </div>

                            <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t border-white/10">
                                <div>
                                    <p className="text-white/40 text-xs">Invested</p>
                                    <p className="text-white font-semibold">${portfolio.total_invested.toFixed(2)}</p>
                                </div>
                                <div>
                                    <p className="text-white/40 text-xs">Yield Earned</p>
                                    <p className="text-green-400 font-semibold">${portfolio.total_yield_earned.toFixed(2)}</p>
                                </div>
                                <div>
                                    <p className="text-white/40 text-xs">Holdings</p>
                                    <p className="text-white font-semibold">{portfolio.holdings_count} assets</p>
                                </div>
                            </div>

                            {portfolio.pending_yield > 0 && (
                                <div className="mt-4 p-3 bg-green-500/20 rounded-xl flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Sparkles className="w-5 h-5 text-green-400" />
                                        <span className="text-green-400">Pending Yield: ${portfolio.pending_yield.toFixed(2)}</span>
                                    </div>
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        className="px-4 py-1.5 bg-green-500 text-white text-sm font-medium rounded-lg"
                                    >
                                        Claim
                                    </motion.button>
                                </div>
                            )}
                        </div>
                    </GlassCard>
                </motion.div>
            )
            }

            {}
            {
                holdings.length > 0 && (
                    <motion.div variants={item}>
                        <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                            <PieChart className="w-4 h-4" />
                            Allocation
                        </h3>
                        <GlassCard>
                            <div className="space-y-3">
                                {Object.entries(allocationByType).map(([type, value]) => {
                                    const config = ASSET_TYPE_CONFIG[type] || ASSET_TYPE_CONFIG.stable_yield;
                                    const percentage = portfolio ? (value / portfolio.current_value) * 100 : 0;

                                    return (
                                        <div key={type}>
                                            <div className="flex justify-between items-center mb-1">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-6 h-6 rounded-lg bg-gradient-to-br ${config.color} flex items-center justify-center text-white`}>
                                                        {config.icon}
                                                    </div>
                                                    <span className="text-white text-sm capitalize">
                                                        {type.replace('_', ' ')}
                                                    </span>
                                                </div>
                                                <span className="text-white/60 text-sm">
                                                    {percentage.toFixed(1)}%
                                                </span>
                                            </div>
                                            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full bg-gradient-to-r ${config.color} rounded-full transition-all`}
                                                    style={{ width: `${percentage}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </GlassCard>
                    </motion.div>
                )
            }

            {}
            <motion.div variants={item} className="flex gap-2">
                <button
                    onClick={() => setActiveTab('holdings')}
                    className={`flex-1 py-3 rounded-xl font-medium transition-all ${activeTab === 'holdings'
                        ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white'
                        : 'bg-white/5 text-white/60 hover:bg-white/10'
                        }`}
                >
                    Holdings
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    className={`flex-1 py-3 rounded-xl font-medium transition-all ${activeTab === 'history'
                        ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white'
                        : 'bg-white/5 text-white/60 hover:bg-white/10'
                        }`}
                >
                    History
                </button>
            </motion.div>

            {}
            <motion.div variants={item}>
                {activeTab === 'holdings' ? (
                    <div className="space-y-3">
                        {loading ? (
                            [1, 2, 3].map(i => (
                                <div key={i} className="h-24 bg-white/5 rounded-2xl animate-pulse" />
                            ))
                        ) : holdings.length > 0 ? (
                            holdings.map(holding => (
                                <HoldingCard key={holding.id} holding={holding} />
                            ))
                        ) : (
                            <GlassCard className="text-center py-12">
                                <PieChart className="w-12 h-12 text-white/20 mx-auto mb-4" />
                                <p className="text-white/60">No holdings yet</p>
                                <Link href="/billing" className="text-cyan-400 text-sm mt-2 inline-block">
                                    Browse RWA marketplace →
                                </Link>
                            </GlassCard>
                        )}
                    </div>
                ) : (
                    <div className="space-y-3">
                        {transactions.length > 0 ? (
                            transactions.map(tx => (
                                <TransactionCard key={tx.id} transaction={tx} />
                            ))
                        ) : (
                            <GlassCard className="text-center py-12">
                                <Clock className="w-12 h-12 text-white/20 mx-auto mb-4" />
                                <p className="text-white/60">No transactions yet</p>
                            </GlassCard>
                        )}
                    </div>
                )}
            </motion.div>
        </motion.div >
    );
}


function HoldingCard({ holding }: { holding: Holding }) {
    const config = ASSET_TYPE_CONFIG[holding.asset?.asset_type] || ASSET_TYPE_CONFIG.stable_yield;
    const isPositive = holding.unrealized_gain >= 0;

    return (
        <Link href={`/billing/asset/${holding.asset_id}`}>
            <motion.div
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
            >
                <GlassCard hoverEffect>
                    <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${config.color} flex items-center justify-center text-white`}>
                            {config.icon}
                        </div>

                        <div className="flex-1 min-w-0">
                            <h3 className="text-white font-semibold truncate">{holding.asset?.name}</h3>
                            <p className="text-white/40 text-sm">
                                {holding.quantity} units @ ${holding.average_buy_price.toFixed(2)}
                            </p>
                        </div>

                        <div className="text-right">
                            <p className="text-white font-bold">${holding.current_value.toFixed(2)}</p>
                            <p className={`text-sm ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                                {isPositive ? '+' : ''}{holding.unrealized_gain_percent}%
                            </p>
                        </div>

                        <ChevronRight className="w-5 h-5 text-white/40" />
                    </div>

                    {}
                    {holding.asset?.annual_yield_percent > 0 && (
                        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/10">
                            <div className="flex items-center gap-1 text-sm">
                                <TrendingUp className="w-4 h-4 text-green-400" />
                                <span className="text-white/60">APY:</span>
                                <span className="text-green-400">{holding.asset.annual_yield_percent}%</span>
                            </div>
                            {holding.pending_yield > 0 && (
                                <div className="flex items-center gap-1 text-sm">
                                    <Sparkles className="w-4 h-4 text-amber-400" />
                                    <span className="text-amber-400">+${holding.pending_yield.toFixed(2)} pending</span>
                                </div>
                            )}
                        </div>
                    )}
                </GlassCard>
            </motion.div>
        </Link>
    );
}


function TransactionCard({ transaction }: { transaction: Transaction }) {
    const config = ASSET_TYPE_CONFIG[transaction.asset?.asset_type] || ASSET_TYPE_CONFIG.stable_yield;
    const isBuy = transaction.tx_type === 'buy';
    const isYield = transaction.tx_type === 'yield_claim';

    return (
        <GlassCard>
            <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isBuy ? 'bg-green-500/20' : isYield ? 'bg-amber-500/20' : 'bg-red-500/20'
                    }`}>
                    {isBuy ? (
                        <ArrowUpRight className="w-5 h-5 text-green-400 rotate-180" />
                    ) : isYield ? (
                        <Sparkles className="w-5 h-5 text-amber-400" />
                    ) : (
                        <ArrowUpRight className="w-5 h-5 text-red-400" />
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    <h3 className="text-white font-medium">
                        {isBuy ? 'Bought' : isYield ? 'Yield Claimed' : 'Sold'} {transaction.asset?.name}
                    </h3>
                    <p className="text-white/40 text-xs">
                        {new Date(transaction.created_at).toLocaleDateString()} • {transaction.quantity} units
                    </p>
                </div>

                <div className="text-right">
                    <p className={`font-bold ${isBuy ? 'text-red-400' : 'text-green-400'}`}>
                        {isBuy ? '-' : '+'}${transaction.total_amount.toFixed(2)}
                    </p>
                    <p className={`text-xs px-2 py-0.5 rounded-full ${transaction.status === 'success' ? 'bg-green-500/20 text-green-400' :
                        transaction.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-red-500/20 text-red-400'
                        }`}>
                        {transaction.status}
                    </p>
                </div>
            </div>
        </GlassCard>
    );
}
