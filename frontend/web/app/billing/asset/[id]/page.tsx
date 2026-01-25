'use client';

import React, { useState, useEffect, use } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft,
    Building2,
    Coins,
    FileCheck2,
    Landmark,
    TrendingUp,
    Shield,
    AlertTriangle,
    Sparkles,
    Info,
    Clock,
    ChevronDown,
    ChevronUp,
    Check,
    X,
    ExternalLink,
    Wallet,
    Percent,
    FileText
} from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface RWAAsset {
    id: string;
    asset_code: string;
    issuer_address: string;
    asset_type: string;
    name: string;
    description: string;
    detailed_info: Record<string, unknown>;
    document_urls: string[];
    unit_price: number;
    total_supply: number;
    available_supply: number;
    min_investment: number;
    max_investment: number | null;
    yield_type: 'fixed' | 'variable' | 'none';
    annual_yield_percent: number;
    yield_frequency: string;
    risk_level: 'low' | 'medium' | 'high' | 'very_high';
    requires_kyc: boolean;
    min_kyc_level: number;
    accredited_only: boolean;
    status: string;
}

interface PageProps {
    params: Promise<{ id: string }>;
}

const ASSET_TYPE_CONFIG: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
    real_estate: { icon: <Building2 className="w-6 h-6" />, label: 'Real Estate', color: 'blue-500' },
    bond: { icon: <Landmark className="w-6 h-6" />, label: 'Bonds', color: 'emerald-500' },
    commodity: { icon: <Coins className="w-6 h-6" />, label: 'Commodity', color: 'amber-500' },
    invoice: { icon: <FileCheck2 className="w-6 h-6" />, label: 'Trade Finance', color: 'purple-500' },
    stable_yield: { icon: <TrendingUp className="w-6 h-6" />, label: 'Stable Yield', color: 'teal-500' },
    equity_token: { icon: <Sparkles className="w-6 h-6" />, label: 'Equity', color: 'rose-500' },
};

const RISK_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    low: { label: 'Low Risk', color: 'text-green-400', bg: 'bg-green-500/20' },
    medium: { label: 'Medium Risk', color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
    high: { label: 'High Risk', color: 'text-orange-400', bg: 'bg-orange-500/20' },
    very_high: { label: 'Very High Risk', color: 'text-red-400', bg: 'bg-red-500/20' },
};

export default function AssetDetailPage({ params }: PageProps) {
    const { id } = use(params);
    const router = useRouter();
    const [asset, setAsset] = useState<RWAAsset | null>(null);
    const [loading, setLoading] = useState(true);
    const [buying, setBuying] = useState(false);
    const [buyAmount, setBuyAmount] = useState('');
    const [showBuyModal, setShowBuyModal] = useState(false);
    const [kycLevel, setKycLevel] = useState(0);
    const [walletBalance, setWalletBalance] = useState(0);
    const [expandedSection, setExpandedSection] = useState<string | null>('details');
    const [buyResult, setBuyResult] = useState<{ success: boolean; message: string } | null>(null);

    useEffect(() => {
        fetchAsset();
        fetchUserData();
    }, [id]);

    const fetchAsset = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/rwa/assets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ assetId: id }),
            });

            if (response.ok) {
                const data = await response.json();
                setAsset(data.asset);
            }
        } catch (err) {
            console.error('Error fetching asset:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchUserData = async () => {
        try {
            const userId = localStorage.getItem('userId');
            if (!userId) return;

            
            const walletRes = await fetch(`/api/wallet?userId=${userId}`);
            if (walletRes.ok) {
                const walletData = await walletRes.json();
                setWalletBalance(walletData.balance || 0);
            }

            
            setKycLevel(1);
        } catch (err) {
            console.error('Error fetching user data:', err);
        }
    };

    const handleBuy = async () => {
        if (!asset || !buyAmount) return;

        const quantity = parseFloat(buyAmount);
        const totalCost = quantity * asset.unit_price;

        if (totalCost < asset.min_investment) {
            setBuyResult({ success: false, message: `Minimum investment is $${asset.min_investment}` });
            return;
        }

        if (totalCost > walletBalance) {
            setBuyResult({ success: false, message: 'Insufficient balance' });
            return;
        }

        if (asset.requires_kyc && kycLevel < asset.min_kyc_level) {
            setBuyResult({ success: false, message: `KYC Level ${asset.min_kyc_level} required` });
            return;
        }

        setBuying(true);
        setBuyResult(null);

        try {
            const userId = localStorage.getItem('userId');
            const walletAddress = localStorage.getItem('walletAddress');
            const walletSecret = localStorage.getItem('walletSecret');

            const response = await fetch('/api/rwa/buy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    walletAddress,
                    walletSecret,
                    assetId: asset.id,
                    quantity,
                }),
            });

            const data = await response.json();

            if (response.ok) {
                setBuyResult({ success: true, message: 'Purchase successful!' });
                setShowBuyModal(false);
                setBuyAmount('');
                
                fetchUserData();
            } else {
                setBuyResult({ success: false, message: data.error || 'Purchase failed' });
            }
        } catch (err) {
            console.error('Buy error:', err);
            setBuyResult({ success: false, message: 'Transaction failed' });
        } finally {
            setBuying(false);
        }
    };

    const toggleSection = (section: string) => {
        setExpandedSection(expandedSection === section ? null : section);
    };

    if (loading) {
        return (
            <div className="space-y-4">
                <div className="h-12 bg-white/5 rounded-xl animate-pulse" />
                <div className="h-64 bg-white/5 rounded-2xl animate-pulse" />
                <div className="h-48 bg-white/5 rounded-2xl animate-pulse" />
            </div>
        );
    }

    if (!asset) {
        return (
            <div className="text-center py-20">
                <p className="text-white/60">Asset not found</p>
                <Link href="/billing" className="text-cyan-400 mt-4 inline-block">← Back to marketplace</Link>
            </div>
        );
    }

    const typeConfig = ASSET_TYPE_CONFIG[asset.asset_type] || ASSET_TYPE_CONFIG.stable_yield;
    const riskConfig = RISK_CONFIG[asset.risk_level];
    const isLocked = asset.requires_kyc && kycLevel < asset.min_kyc_level;
    const buyQuantity = parseFloat(buyAmount) || 0;
    const totalCost = buyQuantity * asset.unit_price;
    const supplyPercent = ((asset.total_supply - asset.available_supply) / asset.total_supply) * 100;

    return (
        <motion.div
            className="space-y-4 pb-32"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
        >
            {}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => router.back()}
                    className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 text-white" />
                </button>
                <div className="flex-1">
                    <h1 className="text-xl font-bold text-white truncate">{asset.name}</h1>
                    <p className="text-white/40 text-sm">{typeConfig.label}</p>
                </div>
            </div>

            {}
            <GlassCard className="relative overflow-hidden">
                <div className={`absolute inset-0 bg-gradient-to-br ${typeConfig.color} opacity-10`} />

                <div className="relative">
                    <div className="flex items-start gap-4">
                        <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${typeConfig.color} flex items-center justify-center text-white`}>
                            {typeConfig.icon}
                        </div>

                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-white/60 text-sm">Asset Code:</span>
                                <code className="text-cyan-400 text-sm bg-white/5 px-2 py-0.5 rounded">{asset.asset_code}</code>
                            </div>

                            <div className="flex items-center gap-3">
                                <span className={`px-2 py-1 rounded-lg text-xs font-medium ${riskConfig.bg} ${riskConfig.color}`}>
                                    {riskConfig.label}
                                </span>
                                {asset.requires_kyc && (
                                    <span className="px-2 py-1 rounded-lg text-xs font-medium bg-amber-500/20 text-amber-400 flex items-center gap-1">
                                        <Shield className="w-3 h-3" />
                                        KYC L{asset.min_kyc_level}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <p className="text-white/70 mt-4">{asset.description}</p>

                    {}
                    <div className="grid grid-cols-3 gap-4 mt-6">
                        <div>
                            <p className="text-white/40 text-xs">Price</p>
                            <p className="text-white text-xl font-bold">${asset.unit_price}</p>
                        </div>
                        <div>
                            <p className="text-white/40 text-xs">APY</p>
                            <p className="text-green-400 text-xl font-bold">
                                {asset.annual_yield_percent > 0 ? `${asset.annual_yield_percent}%` : '-'}
                            </p>
                        </div>
                        <div>
                            <p className="text-white/40 text-xs">Min. Investment</p>
                            <p className="text-white text-xl font-bold">${asset.min_investment}</p>
                        </div>
                    </div>

                    {}
                    <div className="mt-6">
                        <div className="flex justify-between text-xs mb-1">
                            <span className="text-white/60">Supply Sold</span>
                            <span className="text-white/60">{supplyPercent.toFixed(1)}%</span>
                        </div>
                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                            <div
                                className={`h-full bg-gradient-to-r ${typeConfig.color} rounded-full transition-all`}
                                style={{ width: `${supplyPercent}%` }}
                            />
                        </div>
                        <div className="flex justify-between text-xs mt-1">
                            <span className="text-white/40">{(asset.total_supply - asset.available_supply).toLocaleString()} sold</span>
                            <span className="text-white/40">{asset.available_supply.toLocaleString()} available</span>
                        </div>
                    </div>
                </div>
            </GlassCard>

            {}
            {asset.yield_type !== 'none' && (
                <GlassCard>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                            <Percent className="w-5 h-5 text-green-400" />
                        </div>
                        <div>
                            <h3 className="text-white font-semibold">Yield Information</h3>
                            <p className="text-white/40 text-sm">{asset.yield_type === 'fixed' ? 'Fixed Returns' : 'Variable Returns'}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/5 rounded-xl p-3">
                            <p className="text-white/60 text-xs">Annual Yield</p>
                            <p className="text-green-400 text-lg font-bold">{asset.annual_yield_percent}% APY</p>
                        </div>
                        <div className="bg-white/5 rounded-xl p-3">
                            <p className="text-white/60 text-xs">Distribution</p>
                            <p className="text-white text-lg font-bold capitalize">{asset.yield_frequency}</p>
                        </div>
                    </div>
                </GlassCard>
            )}

            {}
            <ExpandableSection
                title="Asset Details"
                icon={<Info className="w-5 h-5" />}
                expanded={expandedSection === 'details'}
                onToggle={() => toggleSection('details')}
            >
                <div className="space-y-3">
                    {Object.entries(asset.detailed_info || {}).map(([key, value]) => (
                        <div key={key} className="flex justify-between">
                            <span className="text-white/60 capitalize">{key.replace(/_/g, ' ')}</span>
                            <span className="text-white">{String(value)}</span>
                        </div>
                    ))}
                </div>
            </ExpandableSection>

            {}
            {asset.document_urls && asset.document_urls.length > 0 && (
                <ExpandableSection
                    title="Documents"
                    icon={<FileText className="w-5 h-5" />}
                    expanded={expandedSection === 'documents'}
                    onToggle={() => toggleSection('documents')}
                >
                    <div className="space-y-2">
                        {asset.document_urls.map((url, index) => (
                            <a
                                key={index}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"
                            >
                                <FileText className="w-5 h-5 text-cyan-400" />
                                <span className="text-white flex-1">Document {index + 1}</span>
                                <ExternalLink className="w-4 h-4 text-white/40" />
                            </a>
                        ))}
                    </div>
                </ExpandableSection>
            )}

            {}
            <AnimatePresence>
                {buyResult && (
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 50 }}
                        className={`fixed bottom-28 left-4 right-4 p-4 rounded-xl ${buyResult.success ? 'bg-green-500' : 'bg-red-500'
                            } text-white z-50`}
                    >
                        <div className="flex items-center gap-3">
                            {buyResult.success ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
                            <span>{buyResult.message}</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {}
            <div className="fixed bottom-0 left-0 right-0 bg-[#0a0a0f]/95 backdrop-blur-xl border-t border-white/10 p-4 z-40">
                <div className="max-w-md mx-auto">
                    {isLocked ? (
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 text-amber-400">
                                <Shield className="w-5 h-5" />
                                <span>KYC Level {asset.min_kyc_level} required</span>
                            </div>
                            <Link href="/billing/kyc">
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    className="px-6 py-3 bg-amber-500 text-white font-semibold rounded-xl"
                                >
                                    Complete KYC
                                </motion.button>
                            </Link>
                        </div>
                    ) : (
                        <div className="flex items-center gap-3">
                            <div className="flex-1">
                                <div className="relative">
                                    <input
                                        type="number"
                                        placeholder="Quantity"
                                        value={buyAmount}
                                        onChange={(e) => setBuyAmount(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                                    />
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 text-sm">
                                        = ${totalCost.toFixed(2)}
                                    </div>
                                </div>
                                <div className="flex justify-between mt-1 px-1">
                                    <span className="text-white/40 text-xs">Balance: ${walletBalance.toFixed(2)}</span>
                                    <button
                                        onClick={() => setBuyAmount(Math.floor(walletBalance / asset.unit_price).toString())}
                                        className="text-cyan-400 text-xs"
                                    >
                                        Max
                                    </button>
                                </div>
                            </div>
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={handleBuy}
                                disabled={buying || !buyAmount || totalCost > walletBalance}
                                className="px-8 py-3 bg-cyan-500 text-white font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {buying ? 'Processing...' : 'Buy'}
                            </motion.button>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
}


function ExpandableSection({
    title,
    icon,
    expanded,
    onToggle,
    children,
}: {
    title: string;
    icon: React.ReactNode;
    expanded: boolean;
    onToggle: () => void;
    children: React.ReactNode;
}) {
    return (
        <GlassCard className="overflow-hidden">
            <button
                onClick={onToggle}
                className="w-full flex items-center justify-between"
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/60">
                        {icon}
                    </div>
                    <span className="text-white font-semibold">{title}</span>
                </div>
                {expanded ? (
                    <ChevronUp className="w-5 h-5 text-white/40" />
                ) : (
                    <ChevronDown className="w-5 h-5 text-white/40" />
                )}
            </button>

            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="pt-4 mt-4 border-t border-white/10">
                            {children}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </GlassCard>
    );
}
