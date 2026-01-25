'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Building2,
    Coins,
    FileCheck2,
    Landmark,
    TrendingUp,
    Shield,
    ChevronRight,
    Wallet,
    BadgeCheck,
    Percent,
    Clock,
    AlertTriangle,
    Sparkles,
    ArrowUpRight,
    Filter,
    LayoutGrid,
    List,
    Search,
    Zap
} from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';
import Link from 'next/link';

interface RWAAsset {
    id: string;
    asset_code: string;
    issuer_address: string;
    asset_type: 'real_estate' | 'bond' | 'commodity' | 'invoice' | 'stable_yield' | 'equity_token';
    name: string;
    description: string;
    detailed_info: Record<string, unknown>;
    unit_price: number;
    total_supply: number;
    available_supply: number;
    min_investment: number;
    yield_type: 'fixed' | 'variable' | 'none';
    annual_yield_percent: number;
    yield_frequency: string;
    risk_level: 'low' | 'medium' | 'high' | 'very_high';
    requires_kyc: boolean;
    min_kyc_level: number;
    is_featured: boolean;
}

interface PortfolioSummary {
    total_invested: number;
    current_value: number;
    total_gain: number;
    total_gain_percent: string;
    total_yield_earned: number;
    pending_yield: number;
    holdings_count: number;
}

const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08 } }
};

const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
};

const ASSET_TYPE_CONFIG: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
    real_estate: { icon: <Building2 className="w-5 h-5" />, label: 'Real Estate', color: 'blue-500' },
    bond: { icon: <Landmark className="w-5 h-5" />, label: 'Bonds', color: 'emerald-500' },
    commodity: { icon: <Coins className="w-5 h-5" />, label: 'Commodity', color: 'amber-500' },
    invoice: { icon: <FileCheck2 className="w-5 h-5" />, label: 'Trade Finance', color: 'purple-500' },
    stable_yield: { icon: <TrendingUp className="w-5 h-5" />, label: 'Stable Yield', color: 'teal-500' },
    equity_token: { icon: <Sparkles className="w-5 h-5" />, label: 'Equity', color: 'rose-500' },
};

const RISK_CONFIG: Record<string, { label: string; color: string }> = {
    low: { label: 'Low Risk', color: 'text-green-400' },
    medium: { label: 'Medium Risk', color: 'text-yellow-400' },
    high: { label: 'High Risk', color: 'text-orange-400' },
    very_high: { label: 'Very High Risk', color: 'text-red-400' },
};

export default function BillingPage() {
    const [assets, setAssets] = useState<RWAAsset[]>([]);
    const [portfolio, setPortfolio] = useState<PortfolioSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedType, setSelectedType] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [kycLevel, setKycLevel] = useState<number>(0);

    useEffect(() => {
        fetchAssets();
        fetchPortfolio();
        checkKycLevel();
    }, [selectedType]);

    const fetchAssets = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (selectedType !== 'all') params.append('type', selectedType);

            const response = await fetch(`/api/rwa/assets?${params.toString()}`);
            if (response.ok) {
                const data = await response.json();
                setAssets(data.assets || []);
            }
        } catch (err) {
            console.error('Error fetching assets:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchPortfolio = async () => {
        try {
            const userId = localStorage.getItem('userId');
            if (!userId) return;

            const response = await fetch(`/api/rwa/holdings?userId=${userId}`);
            if (response.ok) {
                const data = await response.json();
                setPortfolio(data.portfolio);
            }
        } catch (err) {
            console.error('Error fetching portfolio:', err);
        }
    };

    const checkKycLevel = async () => {
        try {
            const userId = localStorage.getItem('userId');
            if (!userId) return;

            
            setKycLevel(1);
        } catch (err) {
            console.error('Error checking KYC:', err);
        }
    };

    const filteredAssets = assets.filter(asset =>
        asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const featuredAssets = filteredAssets.filter(a => a.is_featured);
    const regularAssets = filteredAssets.filter(a => !a.is_featured);

    return (
        <motion.div
            className="space-y-4 sm:space-y-6 pb-24"
            variants={container}
            initial="hidden"
            animate="show"
        >
            {}
            <motion.div variants={item} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
                <div>
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">Billing & Retail</h1>
                    <p className="text-white/60 text-sm sm:text-base mt-1">Invest in tokenized real-world assets</p>
                </div>
                <Link href="/billing/portfolio">
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500 text-white font-medium text-sm sm:text-base whitespace-nowrap"
                    >
                        <Wallet className="w-4 h-4 sm:w-5 sm:h-5" />
                        Portfolio
                    </motion.button>
                </Link>
            </motion.div>

            {}
            {portfolio && portfolio.holdings_count > 0 && (
                <motion.div variants={item}>
                    <GlassCard className="p-4 sm:p-6">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0">
                            <div>
                                <p className="text-white/60 text-xs sm:text-sm">Portfolio Value</p>
                                <p className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">
                                    ${portfolio.current_value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </p>
                                <p className={`text-sm sm:text-base ${parseFloat(portfolio.total_gain_percent) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {parseFloat(portfolio.total_gain_percent) >= 0 ? '+' : ''}{portfolio.total_gain_percent}%
                                    <span className="text-white/40 ml-1">all time</span>
                                </p>
                            </div>
                            {portfolio.pending_yield > 0 && (
                                <div className="text-left sm:text-right">
                                    <p className="text-white/60 text-xs sm:text-sm">Pending Yield</p>
                                    <p className="text-lg sm:text-xl lg:text-2xl font-semibold text-green-400">
                                        +${portfolio.pending_yield.toFixed(2)}
                                    </p>
                                    <button className="text-xs sm:text-sm text-cyan-400 hover:underline">Claim</button>
                                </div>
                            )}
                        </div>
                    </GlassCard>
                </motion.div>
            )}

            {}
            <motion.div variants={item}>
                <div className="grid grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
                    <Link href="/billing/loans">
                        <QuickActionCard
                            icon={<Percent className="w-5 h-5 sm:w-6 sm:h-6" />}
                            label="Loans"
                            color="from-purple-500 to-pink-500"
                        />
                    </Link>
                    <Link href="/billing/kyc">
                        <QuickActionCard
                            icon={<Shield className="w-5 h-5 sm:w-6 sm:h-6" />}
                            label="KYC"
                            color="from-emerald-500 to-green-500"
                            badge={kycLevel > 0 ? '✓' : '!'}
                        />
                    </Link>
                    <Link href="/billing/portfolio">
                        <QuickActionCard
                            icon={<TrendingUp className="w-5 h-5 sm:w-6 sm:h-6" />}
                            label="Holdings"
                            color="from-blue-500 to-cyan-500"
                        />
                    </Link>
                    <Link href="/billing/flash-loans">
                        <QuickActionCard
                            icon={<Zap className="w-5 h-5 sm:w-6 sm:h-6" />}
                            label="Flash"
                            color="from-amber-500 to-orange-500"
                        />
                    </Link>
                </div>
            </motion.div>

            {}
            <motion.div variants={item} className="flex gap-2 sm:gap-3">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-white/40" />
                    <input
                        type="text"
                        placeholder="Search assets..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-10 sm:px-12 py-2.5 sm:py-3 text-sm sm:text-base text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                    />
                </div>
                <button className="p-2.5 sm:p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors">
                    <Filter className="w-5 h-5 text-white/60" />
                </button>
                <div className="flex bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                    <button
                        onClick={() => setViewMode('grid')}
                        className={`p-2.5 sm:p-3 transition-colors ${viewMode === 'grid' ? 'bg-white/10' : 'hover:bg-white/5'}`}
                    >
                        <LayoutGrid className="w-5 h-5 text-white/60" />
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={`p-2.5 sm:p-3 transition-colors ${viewMode === 'list' ? 'bg-white/10' : 'hover:bg-white/5'}`}
                    >
                        <List className="w-5 h-5 text-white/60" />
                    </button>
                </div>
            </motion.div>

            {}
            <motion.div variants={item} className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                <TypeTab
                    label="All Assets"
                    active={selectedType === 'all'}
                    onClick={() => setSelectedType('all')}
                />
                {Object.entries(ASSET_TYPE_CONFIG).map(([type, config]) => (
                    <TypeTab
                        key={type}
                        label={config.label}
                        icon={config.icon}
                        active={selectedType === type}
                        onClick={() => setSelectedType(type)}
                    />
                ))}
            </motion.div>

            {}
            {featuredAssets.length > 0 && (
                <motion.div variants={item}>
                    <div className="flex items-center gap-2 mb-3">
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        <h2 className="text-lg font-semibold text-white">Featured</h2>
                    </div>
                    <div className="space-y-3">
                        {featuredAssets.map(asset => (
                            <FeaturedAssetCard key={asset.id} asset={asset} kycLevel={kycLevel} />
                        ))}
                    </div>
                </motion.div>
            )}

            {}
            <motion.div variants={item}>
                <h2 className="text-lg font-semibold text-white mb-3">
                    {selectedType === 'all' ? 'All Assets' : ASSET_TYPE_CONFIG[selectedType]?.label}
                </h2>

                {loading ? (
                    <div className="grid grid-cols-2 gap-3">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="h-48 bg-white/5 rounded-2xl animate-pulse" />
                        ))}
                    </div>
                ) : regularAssets.length > 0 ? (
                    viewMode === 'grid' ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
                            {regularAssets.map(asset => (
                                <AssetCard key={asset.id} asset={asset} kycLevel={kycLevel} />
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-3 sm:space-y-4">
                            {regularAssets.map(asset => (
                                <AssetListItem key={asset.id} asset={asset} kycLevel={kycLevel} />
                            ))}
                        </div>
                    )
                ) : (
                    <GlassCard className="text-center py-12">
                        <p className="text-white/40">No assets found</p>
                    </GlassCard>
                )}
            </motion.div>
        </motion.div>
    );
}


function QuickActionCard({
    icon,
    label,
    color,
    badge
}: {
    icon: React.ReactNode;
    label: string;
    color: string;
    badge?: string;
}) {
    return (
        <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="relative"
        >
            <GlassCard className="p-3 sm:p-4 text-center cursor-pointer" hoverEffect>
                <div className={`w-10 h-10 sm:w-12 sm:h-12 mx-auto rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-white mb-2`}>
                    {icon}
                </div>
                <p className="text-white text-xs sm:text-sm font-medium">{label}</p>
                {badge && (
                    <div className={`absolute -top-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 rounded-full ${badge === '✓' ? 'bg-green-500' : 'bg-amber-500'} flex items-center justify-center text-xs sm:text-sm text-white font-bold`}>
                        {badge}
                    </div>
                )}
            </GlassCard>
        </motion.div>
    );
}


function TypeTab({
    label,
    icon,
    active,
    onClick
}: {
    label: string;
    icon?: React.ReactNode;
    active: boolean;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition-all ${active
                ? 'bg-cyan-500 text-white'
                : 'bg-white/5 text-white/60 hover:bg-white/10'
                }`}
        >
            {icon}
            {label}
        </button>
    );
}


function FeaturedAssetCard({ asset, kycLevel }: { asset: RWAAsset; kycLevel: number }) {
    const typeConfig = ASSET_TYPE_CONFIG[asset.asset_type];
    const riskConfig = RISK_CONFIG[asset.risk_level];
    const isLocked = asset.requires_kyc && kycLevel < asset.min_kyc_level;

    return (
        <Link href={`/billing/asset/${asset.id}`}>
            <motion.div
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
            >
                <GlassCard className={`relative overflow-hidden ${isLocked ? 'opacity-75' : ''}`} hoverEffect>
                    {}
                    <div className={`absolute inset-0 bg-gradient-to-br ${typeConfig.color} opacity-10`} />

                    <div className="relative flex flex-col sm:flex-row gap-3 sm:gap-4">
                        {}
                        <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-gradient-to-br ${typeConfig.color} flex items-center justify-center text-white flex-shrink-0`}>
                            {typeConfig.icon}
                        </div>

                        {}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-white font-semibold text-base sm:text-lg truncate">{asset.name}</h3>
                                    <p className="text-white/40 text-xs sm:text-sm">{typeConfig.label}</p>
                                </div>
                                {asset.annual_yield_percent > 0 && (
                                    <div className="text-right ml-3 flex-shrink-0">
                                        <p className="text-green-400 font-bold text-base sm:text-lg">{asset.annual_yield_percent}%</p>
                                        <p className="text-white/40 text-xs">APY</p>
                                    </div>
                                )}
                            </div>

                            <p className="text-white/60 text-sm sm:text-base mt-2 line-clamp-2">{asset.description}</p>

                            <div className="flex items-center gap-2 sm:gap-3 mt-3 flex-wrap">
                                <span className={`text-xs sm:text-sm ${riskConfig.color}`}>{riskConfig.label}</span>
                                <span className="text-white/40 text-xs">•</span>
                                <span className="text-white/60 text-xs sm:text-sm">Min ${asset.min_investment}</span>
                                {isLocked && (
                                    <>
                                        <span className="text-white/40 text-xs">•</span>
                                        <span className="text-amber-400 text-xs sm:text-sm flex items-center gap-1">
                                            <Shield className="w-3 h-3" />
                                            KYC L{asset.min_kyc_level}
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>

                        <ChevronRight className="hidden sm:flex w-5 h-5 text-white/40 flex-shrink-0 my-auto" />
                    </div>
                </GlassCard>
            </motion.div>
        </Link>
    );
}


function AssetCard({ asset, kycLevel }: { asset: RWAAsset; kycLevel: number }) {
    const typeConfig = ASSET_TYPE_CONFIG[asset.asset_type];
    const riskConfig = RISK_CONFIG[asset.risk_level];
    const isLocked = asset.requires_kyc && kycLevel < asset.min_kyc_level;

    return (
        <Link href={`/billing/asset/${asset.id}`}>
            <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
            >
                <GlassCard className={`h-full ${isLocked ? 'opacity-75' : ''}`} hoverEffect>
                    <div className="flex items-center justify-between mb-3">
                        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-gradient-to-br ${typeConfig.color} flex items-center justify-center text-white`}>
                            {typeConfig.icon}
                        </div>
                        {isLocked && (
                            <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
                        )}
                    </div>

                    <h3 className="text-white font-semibold text-sm sm:text-base truncate">{asset.name}</h3>
                    <p className="text-white/40 text-xs mb-3">{typeConfig.label}</p>

                    <div className="flex items-end justify-between">
                        <div>
                            <p className="text-white/60 text-xs">Price</p>
                            <p className="text-white font-semibold text-sm sm:text-base">${asset.unit_price}</p>
                        </div>
                        {asset.annual_yield_percent > 0 && (
                            <div className="text-right">
                                <p className="text-white/60 text-xs">APY</p>
                                <p className="text-green-400 font-semibold text-sm sm:text-base">{asset.annual_yield_percent}%</p>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/5">
                        <span className={`text-xs ${riskConfig.color}`}>{riskConfig.label}</span>
                    </div>
                </GlassCard>
            </motion.div>
        </Link>
    );
}


function AssetListItem({ asset, kycLevel }: { asset: RWAAsset; kycLevel: number }) {
    const typeConfig = ASSET_TYPE_CONFIG[asset.asset_type];
    const riskConfig = RISK_CONFIG[asset.risk_level];
    const isLocked = asset.requires_kyc && kycLevel < asset.min_kyc_level;

    return (
        <Link href={`/billing/asset/${asset.id}`}>
            <motion.div
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
            >
                <GlassCard className={`${isLocked ? 'opacity-75' : ''}`} hoverEffect>
                    <div className="flex items-center gap-3 sm:gap-4">
                        <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br ${typeConfig.color} flex items-center justify-center text-white flex-shrink-0`}>
                            {typeConfig.icon}
                        </div>

                        <div className="flex-1 min-w-0">
                            <h3 className="text-white font-semibold text-sm sm:text-base truncate">{asset.name}</h3>
                            <p className="text-white/40 text-xs sm:text-sm">{typeConfig.label} • <span className={riskConfig.color}>{riskConfig.label}</span></p>
                        </div>

                        <div className="text-right flex-shrink-0">
                            <p className="text-white font-semibold text-sm sm:text-base">${asset.unit_price}</p>
                            {asset.annual_yield_percent > 0 && (
                                <p className="text-green-400 text-xs sm:text-sm">{asset.annual_yield_percent}% APY</p>
                            )}
                        </div>

                        {isLocked && (
                            <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 flex-shrink-0" />
                        )}

                        <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-white/40 flex-shrink-0" />
                    </div>
                </GlassCard>
            </motion.div>
        </Link>
    );
}
