'use client';

/**
 * TradeCryptoModal Component
 * 
 * Modal for buying and selling crypto/stocks using the Soroban smart contract
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useStockTrading } from '@/hooks/useStockTrading';
import { useLumenVault } from '@/hooks/useLumenVault';
import { stroopsToXLM, formatCurrency } from '@/lib/stockTradingService';

interface TradeCryptoModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialAsset?: string;
    initialMode?: 'buy' | 'sell';
}

// Asset icons mapping
const assetIcons: Record<string, string> = {
    BTC: '₿',
    ETH: 'Ξ',
    SOL: '◎',
    XLM: '✦',
    AAPL: '🍎',
    TSLA: '⚡',
};

export default function TradeCryptoModal({
    isOpen,
    onClose,
    initialAsset = 'BTC',
    initialMode = 'buy',
}: TradeCryptoModalProps) {
    const [vaultState] = useLumenVault();
    const { publicKey, isLocked } = vaultState;
    const {
        assets,
        holdings,
        isTrading,
        error,
        buy,
        sell,
        getAssetPrice,
        formatPrice,
        refreshAssets,
    } = useStockTrading();

    // Form state
    const [mode, setMode] = useState<'buy' | 'sell'>(initialMode);
    const [selectedAsset, setSelectedAsset] = useState(initialAsset);
    const [quantity, setQuantity] = useState('');
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [transactionResult, setTransactionResult] = useState<{
        success: boolean;
        message: string;
    } | null>(null);

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setMode(initialMode);
            setSelectedAsset(initialAsset);
            setQuantity('');
            setShowConfirmation(false);
            setTransactionResult(null);
            refreshAssets();
        }
    }, [isOpen, initialAsset, initialMode, refreshAssets]);

    // Get current asset data
    const currentAsset = useMemo(() => {
        return assets.find(a => a.code === selectedAsset);
    }, [assets, selectedAsset]);

    // Get user's holding for selected asset
    const currentHolding = useMemo(() => {
        return holdings.find(h => h.assetCode === selectedAsset);
    }, [holdings, selectedAsset]);

    // Calculate total cost/proceeds
    const totalAmount = useMemo(() => {
        if (!currentAsset || !quantity || parseFloat(quantity) <= 0) return null;
        const qty = parseFloat(quantity);
        const cost = currentAsset.price * BigInt(Math.floor(qty));
        return cost;
    }, [currentAsset, quantity]);

    // Check if user can sell
    const maxSellQuantity = useMemo(() => {
        if (!currentHolding) return 0;
        return Number(currentHolding.quantity);
    }, [currentHolding]);

    // Validation
    const isValidTrade = useMemo(() => {
        if (!quantity || parseFloat(quantity) <= 0) return false;
        if (!currentAsset?.isActive) return false;
        if (!publicKey || isLocked) return false;

        if (mode === 'sell') {
            return parseFloat(quantity) <= maxSellQuantity;
        }

        return true;
    }, [quantity, currentAsset, publicKey, isLocked, mode, maxSellQuantity]);

    // Handle trade execution
    const handleTrade = async () => {
        if (!isValidTrade) return;

        const qty = Math.floor(parseFloat(quantity));

        const result = mode === 'buy'
            ? await buy(selectedAsset, qty)
            : await sell(selectedAsset, qty);

        setTransactionResult({
            success: result.success,
            message: result.success
                ? `Successfully ${mode === 'buy' ? 'bought' : 'sold'} ${qty} ${selectedAsset}`
                : result.error || 'Transaction failed',
        });

        setShowConfirmation(false);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-[#1a1a2e] rounded-2xl w-full max-w-md mx-4 overflow-hidden shadow-2xl border border-purple-500/20">
                {/* Header */}
                <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-bold text-white">Trade Crypto</h2>
                        <button
                            onClick={onClose}
                            className="text-white/80 hover:text-white transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Transaction Result */}
                {transactionResult && (
                    <div className={`p-4 ${transactionResult.success ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                        <div className="flex items-center gap-2">
                            {transactionResult.success ? (
                                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            ) : (
                                <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            )}
                            <p className={`text-sm ${transactionResult.success ? 'text-green-400' : 'text-red-400'}`}>
                                {transactionResult.message}
                            </p>
                        </div>
                        <button
                            onClick={() => {
                                setTransactionResult(null);
                                setQuantity('');
                            }}
                            className="mt-2 text-sm text-purple-400 hover:text-purple-300"
                        >
                            Make another trade
                        </button>
                    </div>
                )}

                {/* Main Content */}
                {!transactionResult && (
                    <div className="p-6 space-y-6">
                        {/* Buy/Sell Toggle */}
                        <div className="flex rounded-lg bg-[#0f0f1a] p-1">
                            <button
                                onClick={() => setMode('buy')}
                                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${mode === 'buy'
                                        ? 'bg-green-500 text-white'
                                        : 'text-gray-400 hover:text-white'
                                    }`}
                            >
                                Buy
                            </button>
                            <button
                                onClick={() => setMode('sell')}
                                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${mode === 'sell'
                                        ? 'bg-red-500 text-white'
                                        : 'text-gray-400 hover:text-white'
                                    }`}
                            >
                                Sell
                            </button>
                        </div>

                        {/* Asset Selection */}
                        <div>
                            <label className="block text-sm text-gray-400 mb-2">Select Asset</label>
                            <div className="grid grid-cols-3 gap-2">
                                {assets.filter(a => a.isActive).map((asset) => (
                                    <button
                                        key={asset.code}
                                        onClick={() => setSelectedAsset(asset.code)}
                                        className={`p-3 rounded-xl border transition-all ${selectedAsset === asset.code
                                                ? 'border-purple-500 bg-purple-500/20'
                                                : 'border-gray-700 bg-[#0f0f1a] hover:border-purple-500/50'
                                            }`}
                                    >
                                        <div className="text-2xl mb-1">{assetIcons[asset.code] || '🪙'}</div>
                                        <div className="text-sm font-medium text-white">{asset.code}</div>
                                        <div className="text-xs text-gray-400">
                                            {formatCurrency(asset.price)}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Current Price Display */}
                        {currentAsset && (
                            <div className="bg-[#0f0f1a] rounded-xl p-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-400">Current Price</span>
                                    <span className="text-xl font-bold text-white">
                                        {formatCurrency(currentAsset.price)}
                                    </span>
                                </div>
                                {mode === 'sell' && currentHolding && (
                                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-700">
                                        <span className="text-gray-400">Your Holdings</span>
                                        <span className="text-white">
                                            {Number(currentHolding.quantity).toLocaleString()} {selectedAsset}
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Quantity Input */}
                        <div>
                            <label className="block text-sm text-gray-400 mb-2">
                                Quantity
                                {mode === 'sell' && maxSellQuantity > 0 && (
                                    <button
                                        onClick={() => setQuantity(maxSellQuantity.toString())}
                                        className="ml-2 text-purple-400 hover:text-purple-300"
                                    >
                                        Max: {maxSellQuantity}
                                    </button>
                                )}
                            </label>
                            <input
                                type="number"
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value)}
                                placeholder="Enter quantity"
                                min="0"
                                max={mode === 'sell' ? maxSellQuantity : undefined}
                                className="w-full bg-[#0f0f1a] border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                            />
                        </div>

                        {/* Total Amount */}
                        {totalAmount && (
                            <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-xl p-4 border border-purple-500/20">
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-400">
                                        {mode === 'buy' ? 'Total Cost' : 'You Receive'}
                                    </span>
                                    <span className="text-2xl font-bold text-white">
                                        {formatCurrency(totalAmount)}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Error Display */}
                        {error && (
                            <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-3 text-red-400 text-sm">
                                {error}
                            </div>
                        )}

                        {/* Wallet Warning */}
                        {(!publicKey || isLocked) && (
                            <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-xl p-3 text-yellow-400 text-sm">
                                Please connect and unlock your wallet to trade
                            </div>
                        )}

                        {/* Confirmation Dialog */}
                        {showConfirmation ? (
                            <div className="space-y-4">
                                <div className="text-center text-gray-300">
                                    Confirm {mode === 'buy' ? 'purchase' : 'sale'} of{' '}
                                    <span className="font-bold text-white">{quantity} {selectedAsset}</span>
                                    {' '}for{' '}
                                    <span className="font-bold text-white">
                                        {totalAmount ? formatCurrency(totalAmount) : '-'}
                                    </span>?
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setShowConfirmation(false)}
                                        className="flex-1 py-3 rounded-xl border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 transition-all"
                                        disabled={isTrading}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleTrade}
                                        disabled={isTrading}
                                        className={`flex-1 py-3 rounded-xl font-medium transition-all ${mode === 'buy'
                                                ? 'bg-green-500 hover:bg-green-600 text-white'
                                                : 'bg-red-500 hover:bg-red-600 text-white'
                                            } ${isTrading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        {isTrading ? (
                                            <span className="flex items-center justify-center gap-2">
                                                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                </svg>
                                                Processing...
                                            </span>
                                        ) : (
                                            `Confirm ${mode === 'buy' ? 'Buy' : 'Sell'}`
                                        )}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            /* Trade Button */
                            <button
                                onClick={() => setShowConfirmation(true)}
                                disabled={!isValidTrade || isTrading}
                                className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${mode === 'buy'
                                        ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700'
                                        : 'bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700'
                                    } text-white ${!isValidTrade || isTrading ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {mode === 'buy' ? 'Buy' : 'Sell'} {selectedAsset}
                            </button>
                        )}

                        {/* Powered by Badge */}
                        <div className="text-center text-xs text-gray-500">
                            Powered by Stellar Soroban Smart Contracts
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
