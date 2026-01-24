'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Activity, RefreshCw, Database, AlertCircle } from 'lucide-react';
import ExpoSearchBar from './SearchBar';
import TransactionTable from './TransactionTable';
import TransactionDetail from './TransactionDetail';
import WalletView from './WalletView';
import { fetchRecentTransactions, ExpoTransaction, StellarNetwork } from '@/lib/horizonService';

export default function ExpoPage() {
    const [transactions, setTransactions] = useState<ExpoTransaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [selectedTx, setSelectedTx] = useState<string | null>(null);
    const [selectedWallet, setSelectedWallet] = useState<string | null>(null);
    const [network, setNetwork] = useState<StellarNetwork>('mainnet');

    useEffect(() => {
        loadTransactions();
    }, [network]);

    useEffect(() => {
        if (!autoRefresh) return;

        const interval = setInterval(() => {
            loadTransactions(true);
        }, 10000);

        return () => clearInterval(interval);
    }, [autoRefresh]);

    const loadTransactions = async (silent: boolean = false) => {
        if (!silent) setLoading(true);
        setError('');

        try {
            const data = await fetchRecentTransactions(20, network);
            setTransactions(data);
        } catch (err: any) {
            setError(err.message || 'Failed to load transactions');
        } finally {
            if (!silent) setLoading(false);
        }
    };

    const handleSearch = (query: string, type: 'transaction' | 'account' | 'unknown') => {
        if (type === 'transaction') {
            setSelectedTx(query);
        } else if (type === 'account') {
            setSelectedWallet(query);
        } else {


            setError('Invalid search query. Please enter a valid transaction hash or wallet address.');
        }
    };

    const handleTransactionClick = (hash: string) => {
        setSelectedTx(hash);
    };

    return (
        <div className="min-h-screen bg-black text-white">
            { }
            <nav className="fixed top-0 inset-x-0 z-40 h-20 flex items-center justify-between px-8 bg-black/50 backdrop-blur-md border-b border-white/5">
                <Link href="/" className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                        <span className="text-black font-bold text-xs">SP</span>
                    </div>
                    <span className="font-bold text-xl tracking-wider">StellarPay</span>
                </Link>

                <div className="flex items-center gap-6">
                    <Link href="/" className="text-sm font-medium hover:text-white text-gray-400 transition">
                        Home
                    </Link>
                    <Link href="/about" className="text-sm font-medium hover:text-white text-gray-400 transition">
                        About
                    </Link>
                    <Link href="/expo" className="text-sm font-medium text-white">
                        EXPO
                    </Link>
                </div>

                <Link
                    href="/dashboard"
                    className="px-5 py-2 bg-white/10 rounded-full text-sm font-medium hover:bg-white/20 transition"
                >
                    Launch App
                </Link>
            </nav>

            { }
            <main className="pt-32 pb-20 px-4 md:px-8 max-w-7xl mx-auto">
                { }
                <div className="text-center mb-12">
                    <div className="flex items-center justify-center gap-3 mb-4">
                        <Activity className="text-blue-400" size={40} />
                        <h1 className="text-5xl font-bold">EXPO</h1>
                    </div>
                    <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                        Real-time Stellar Network Explorer
                    </p>
                    <div className="mt-4 flex items-center justify-center gap-4">
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Database size={16} />
                            <span>Public Stellar Network Data</span>
                        </div>

                        {/* Network Selector */}
                        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full p-1">
                            <button
                                onClick={() => setNetwork('mainnet')}
                                className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${network === 'mainnet'
                                        ? 'bg-blue-500 text-white'
                                        : 'text-gray-400 hover:text-white'
                                    }`}
                            >
                                Mainnet
                            </button>
                            <button
                                onClick={() => setNetwork('testnet')}
                                className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${network === 'testnet'
                                        ? 'bg-orange-500 text-white'
                                        : 'text-gray-400 hover:text-white'
                                    }`}
                            >
                                Testnet
                            </button>
                        </div>
                    </div>
                </div>

                { }
                <div className="flex justify-center mb-12">
                    <ExpoSearchBar onSearch={handleSearch} />
                </div>

                { }
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-2xl font-bold">Live Transactions</h2>
                        <p className="text-sm text-gray-400 mt-1">
                            Latest transactions on the Stellar network
                        </p>
                    </div>

                    <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 text-sm text-gray-400">
                            <input
                                type="checkbox"
                                checked={autoRefresh}
                                onChange={(e) => setAutoRefresh(e.target.checked)}
                                className="w-4 h-4 rounded"
                            />
                            Auto-refresh
                        </label>

                        <button
                            onClick={() => loadTransactions()}
                            disabled={loading}
                            className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors disabled:opacity-50"
                        >
                            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                            Refresh
                        </button>
                    </div>
                </div>

                { }
                {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3">
                        <AlertCircle className="text-red-400" size={20} />
                        <p className="text-red-400">{error}</p>
                    </div>
                )}

                { }
                <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                    <TransactionTable
                        transactions={transactions}
                        loading={loading}
                        onTransactionClick={handleTransactionClick}
                    />
                </div>

                { }
                <div className="mt-12 text-center text-sm text-gray-500">
                    <p>
                        Data sourced from{' '}
                        <a
                            href="https://horizon.stellar.org"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 transition-colors"
                        >
                            Stellar Horizon API
                        </a>
                    </p>
                    <p className="mt-2">
                        All transactions are read from the public Stellar network in real-time
                    </p>
                </div>
            </main>

            { }
            {selectedTx && (
                <TransactionDetail hash={selectedTx} onClose={() => setSelectedTx(null)} />
            )}

            {selectedWallet && (
                <WalletView
                    address={selectedWallet}
                    onClose={() => setSelectedWallet(null)}
                    onTransactionClick={handleTransactionClick}
                />
            )}
        </div>
    );
}
