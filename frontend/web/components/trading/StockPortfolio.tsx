'use client';

/**
 * StockPortfolio Component
 * 
 * Displays user's stock/crypto holdings with P&L tracking
 */

import React, { useState } from 'react';
import { useStockTrading } from '@/hooks/useStockTrading';
import { useLumenVault } from '@/hooks/useLumenVault';
import { formatCurrency, stroopsToXLM } from '@/lib/stockTradingService';
import TradeCryptoModal from './TradeCryptoModal';

// Asset icons and colors mapping
const assetConfig: Record<string, { icon: string; color: string; bgColor: string }> = {
    BTC: { icon: '₿', color: 'text-orange-400', bgColor: 'bg-orange-500/20' },
    ETH: { icon: 'Ξ', color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
    SOL: { icon: '◎', color: 'text-purple-400', bgColor: 'bg-purple-500/20' },
    XLM: { icon: '✦', color: 'text-cyan-400', bgColor: 'bg-cyan-500/20' },
    AAPL: { icon: '🍎', color: 'text-gray-400', bgColor: 'bg-gray-500/20' },
    TSLA: { icon: '⚡', color: 'text-red-400', bgColor: 'bg-red-500/20' },
};

export default function StockPortfolio() {
    const [vaultState] = useLumenVault();
    const { publicKey, isLocked } = vaultState;
    const {
        assets,
        holdings,
        portfolio,
        isLoadingHoldings,
        refreshHoldings,
        refreshPortfolio,
        getAssetPrice,
    } = useStockTrading();

    const [isTradeModalOpen, setIsTradeModalOpen] = useState(false);
    const [selectedAssetForTrade, setSelectedAssetForTrade] = useState('BTC');
    const [tradeMode, setTradeMode] = useState<'buy' | 'sell'>('buy');

    const openTradeModal = (assetCode: string, mode: 'buy' | 'sell') => {
        setSelectedAssetForTrade(assetCode);
        setTradeMode(mode);
        setIsTradeModalOpen(true);
    };

    // Calculate P&L for each holding
    const holdingsWithPnL = holdings.map(holding => {
        const currentPrice = getAssetPrice(holding.assetCode);
        const currentValue = currentPrice ? currentPrice * holding.quantity : BigInt(0);
        const pnl = currentValue - holding.totalInvested;
        const pnlPercentage = holding.totalInvested > 0
            ? (Number(pnl) / Number(holding.totalInvested)) * 100
            : 0;

        return {
            ...holding,
            currentValue,
            pnl,
            pnlPercentage,
        };
    });

    if (!publicKey || isLocked) {
        return (
            <div className="bg-[#1a1a2e] rounded-2xl p-6 border border-purple-500/20">
                <div className="text-center py-8">
                    <div className="text-4xl mb-4">🔐</div>
                    <h3 className="text-xl font-bold text-white mb-2">Connect Your Wallet</h3>
                    <p className="text-gray-400">
                        Connect and unlock your wallet to view your portfolio
                    </p>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="bg-[#1a1a2e] rounded-2xl border border-purple-500/20 overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 p-6 border-b border-purple-500/20">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-xl font-bold text-white mb-1">My Portfolio</h2>
                            <p className="text-gray-400 text-sm">Track your investments</p>
                        </div>
                        <button
                            onClick={() => {
                                refreshHoldings();
                                refreshPortfolio();
                            }}
                            className="p-2 rounded-lg bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                        </button>
                    </div>

                    {/* Portfolio Summary */}
                    {portfolio && (
                        <div className="mt-6 grid grid-cols-2 gap-4">
                            <div className="bg-[#0f0f1a] rounded-xl p-4">
                                <p className="text-gray-400 text-sm">Total Value</p>
                                <p className="text-2xl font-bold text-white">
                                    {formatCurrency(portfolio.totalValue)}
                                </p>
                            </div>
                            <div className="bg-[#0f0f1a] rounded-xl p-4">
                                <p className="text-gray-400 text-sm">Total P&L</p>
                                <div className="flex items-baseline gap-2">
                                    <p className={`text-2xl font-bold ${portfolio.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        {portfolio.totalPnL >= 0 ? '+' : ''}{formatCurrency(portfolio.totalPnL)}
                                    </p>
                                    <span className={`text-sm ${portfolio.pnlPercentage >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        ({portfolio.pnlPercentage >= 0 ? '+' : ''}{portfolio.pnlPercentage.toFixed(2)}%)
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Holdings List */}
                <div className="p-6">
                    {isLoadingHoldings ? (
                        <div className="flex justify-center py-8">
                            <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full"></div>
                        </div>
                    ) : holdingsWithPnL.length === 0 ? (
                        <div className="text-center py-8">
                            <div className="text-4xl mb-4">📊</div>
                            <h3 className="text-lg font-medium text-white mb-2">No Holdings Yet</h3>
                            <p className="text-gray-400 mb-4">Start trading to build your portfolio</p>
                            <button
                                onClick={() => openTradeModal('BTC', 'buy')}
                                className="px-6 py-2 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg text-white font-medium hover:opacity-90 transition-opacity"
                            >
                                Start Trading
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {holdingsWithPnL.map((holding) => {
                                const config = assetConfig[holding.assetCode] || {
                                    icon: '🪙',
                                    color: 'text-gray-400',
                                    bgColor: 'bg-gray-500/20'
                                };
                                const asset = assets.find(a => a.code === holding.assetCode);

                                return (
                                    <div
                                        key={holding.assetCode}
                                        className="bg-[#0f0f1a] rounded-xl p-4 border border-gray-800 hover:border-purple-500/30 transition-colors"
                                    >
                                        <div className="flex items-center justify-between">
                                            {/* Asset Info */}
                                            <div className="flex items-center gap-3">
                                                <div className={`w-12 h-12 rounded-xl ${config.bgColor} flex items-center justify-center`}>
                                                    <span className={`text-2xl ${config.color}`}>{config.icon}</span>
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-white">{holding.assetCode}</h3>
                                                    <p className="text-sm text-gray-400">
                                                        {Number(holding.quantity).toLocaleString()} units
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Value & P&L */}
                                            <div className="text-right">
                                                <p className="font-bold text-white">
                                                    {formatCurrency(holding.currentValue)}
                                                </p>
                                                <p className={`text-sm ${holding.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                    {holding.pnl >= 0 ? '+' : ''}{formatCurrency(holding.pnl)}
                                                    <span className="ml-1">
                                                        ({holding.pnlPercentage >= 0 ? '+' : ''}{holding.pnlPercentage.toFixed(2)}%)
                                                    </span>
                                                </p>
                                            </div>
                                        </div>

                                        {/* Additional Details */}
                                        <div className="mt-4 pt-4 border-t border-gray-800 grid grid-cols-3 gap-4">
                                            <div>
                                                <p className="text-xs text-gray-500">Avg Buy Price</p>
                                                <p className="text-sm text-gray-300">
                                                    {formatCurrency(holding.avgBuyPrice)}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500">Current Price</p>
                                                <p className="text-sm text-gray-300">
                                                    {asset ? formatCurrency(asset.price) : '-'}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500">Total Invested</p>
                                                <p className="text-sm text-gray-300">
                                                    {formatCurrency(holding.totalInvested)}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Trade Buttons */}
                                        <div className="mt-4 flex gap-2">
                                            <button
                                                onClick={() => openTradeModal(holding.assetCode, 'buy')}
                                                className="flex-1 py-2 px-4 bg-green-500/20 text-green-400 rounded-lg text-sm font-medium hover:bg-green-500/30 transition-colors"
                                            >
                                                Buy More
                                            </button>
                                            <button
                                                onClick={() => openTradeModal(holding.assetCode, 'sell')}
                                                className="flex-1 py-2 px-4 bg-red-500/20 text-red-400 rounded-lg text-sm font-medium hover:bg-red-500/30 transition-colors"
                                            >
                                                Sell
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Quick Trade Button */}
                {holdingsWithPnL.length > 0 && (
                    <div className="p-6 pt-0">
                        <button
                            onClick={() => openTradeModal('BTC', 'buy')}
                            className="w-full py-3 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl text-white font-medium hover:opacity-90 transition-opacity"
                        >
                            Trade More Assets
                        </button>
                    </div>
                )}
            </div>

            {/* Trade Modal */}
            <TradeCryptoModal
                isOpen={isTradeModalOpen}
                onClose={() => setIsTradeModalOpen(false)}
                initialAsset={selectedAssetForTrade}
                initialMode={tradeMode}
            />
        </>
    );
}
