'use client';

import React, { useEffect, useState } from 'react';
import { X, Copy, Check, ExternalLink, Wallet as WalletIcon } from 'lucide-react';
import {
    fetchAccountByAddress,
    fetchAccountTransactions,
    ExpoAccount,
    ExpoTransaction,
    formatTimestamp,
    shortenAddress,
} from '@/lib/horizonService';
import { useWallet } from '@/hooks/useWallet';

interface WalletViewProps {
    address: string;
    onClose: () => void;
    onTransactionClick: (hash: string) => void;
}

export default function WalletView({ address, onClose, onTransactionClick }: WalletViewProps) {
    const { address: userAddress } = useWallet();
    const [account, setAccount] = useState<ExpoAccount | null>(null);
    const [transactions, setTransactions] = useState<ExpoTransaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);

    const isOwnWallet = userAddress && userAddress.toLowerCase() === address.toLowerCase();

    useEffect(() => {
        loadWallet();
    }, [address]);

    const loadWallet = async () => {
        setLoading(true);
        setError('');

        try {
            const [accountData, txData] = await Promise.all([
                fetchAccountByAddress(address),
                fetchAccountTransactions(address, 10),
            ]);

            setAccount(accountData);
            setTransactions(txData);
        } catch (err: any) {
            setError(err.message || 'Failed to load wallet');
        } finally {
            setLoading(false);
        }
    };

    const copyAddress = async () => {
        await navigator.clipboard.writeText(address);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (loading) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
                    <p className="text-gray-400">Loading wallet...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
                <div className="bg-[#111] border border-white/10 rounded-2xl p-8 max-w-md w-full mx-4">
                    <div className="text-center">
                        <WalletIcon className="text-red-400 mx-auto mb-4" size={48} />
                        <h2 className="text-xl font-bold mb-2">Error</h2>
                        <p className="text-gray-400 mb-6">{error}</p>
                        <button
                            onClick={onClose}
                            className="px-6 py-2 bg-white text-black rounded-full font-medium hover:bg-gray-200 transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-[#111] border border-white/10 rounded-2xl max-w-4xl w-full my-8">
                {}
                <div className="flex items-center justify-between p-6 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <WalletIcon className="text-blue-400" size={24} />
                        <div>
                            <h2 className="text-xl font-bold">Wallet Details</h2>
                            {isOwnWallet && (
                                <span className="text-xs text-green-400">This is your wallet</span>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {}
                <div className="p-6 space-y-6">
                    {}
                    <div>
                        <span className="text-sm font-medium text-gray-400 block mb-2">Wallet Address</span>
                        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg p-3">
                            <code className="text-sm text-white font-mono flex-1 break-all">{address}</code>
                            <button
                                onClick={copyAddress}
                                className="p-2 hover:bg-white/10 rounded transition-colors flex-shrink-0"
                            >
                                {copied ? (
                                    <Check className="text-green-400" size={16} />
                                ) : (
                                    <Copy className="text-gray-400" size={16} />
                                )}
                            </button>
                        </div>
                    </div>

                    {}
                    <div>
                        <h3 className="text-sm font-medium text-gray-400 mb-3">Balances</h3>
                        <div className="space-y-2">
                            {account?.balances.map((balance, index) => (
                                <div
                                    key={index}
                                    className="bg-white/5 border border-white/10 rounded-lg p-4 flex items-center justify-between"
                                >
                                    <div>
                                        <span className="text-white font-medium">
                                            {balance.asset_type === 'native' ? 'XLM' : balance.asset_code}
                                        </span>
                                        {balance.asset_type !== 'native' && balance.asset_issuer && (
                                            <div className="text-xs text-gray-500 font-mono mt-1">
                                                {shortenAddress(balance.asset_issuer)}
                                            </div>
                                        )}
                                    </div>
                                    <span className="text-xl font-bold text-white">
                                        {parseFloat(balance.balance).toLocaleString(undefined, {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 7,
                                        })}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                            <span className="text-sm text-gray-400 block mb-1">Sequence</span>
                            <span className="text-lg font-medium text-white">{account?.sequence}</span>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                            <span className="text-sm text-gray-400 block mb-1">Subentries</span>
                            <span className="text-lg font-medium text-white">{account?.subentry_count}</span>
                        </div>
                    </div>

                    {}
                    <div>
                        <h3 className="text-sm font-medium text-gray-400 mb-3">
                            Recent Transactions ({transactions.length})
                        </h3>
                        <div className="space-y-2">
                            {transactions.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    No recent transactions
                                </div>
                            ) : (
                                transactions.map((tx) => (
                                    <button
                                        key={tx.id}
                                        onClick={() => {
                                            onClose();
                                            onTransactionClick(tx.hash);
                                        }}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10 transition-colors text-left"
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <code className="text-sm text-blue-400 font-mono">
                                                {shortenAddress(tx.hash, 8)}
                                            </code>
                                            <span className="text-xs text-gray-500">
                                                {formatTimestamp(tx.created_at)}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-gray-400">
                                                {tx.operation_count} operation{tx.operation_count !== 1 ? 's' : ''}
                                            </span>
                                            <span className="text-gray-300">
                                                {(parseInt(tx.fee_charged) / 10000000).toFixed(7)} XLM
                                            </span>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>

                    {}
                    <a
                        href={`https://stellar.expert/explorer/public/account/${address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                    >
                        View on Stellar Expert
                        <ExternalLink size={14} />
                    </a>
                </div>
            </div>
        </div>
    );
}
