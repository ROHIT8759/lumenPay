'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Activity, RefreshCw, Database, AlertCircle, TrendingUp, Layers, Clock, Zap } from 'lucide-react';
import ExpoSearchBar from './SearchBar';
import TransactionTable from './TransactionTable';
import TransactionDetail from './TransactionDetail';
import WalletView from './WalletView';
import { fetchRecentTransactions, ExpoTransaction, StellarNetwork } from '@/lib/horizonService';

interface NetworkStats {
    latestLedger: number;
    ledgerTime: string;
    transactionCount: number;
    operationCount: number;
    averageFee: string;
    baseReserve: string;
}

export default function ExpoPage() {
    const [transactions, setTransactions] = useState<ExpoTransaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [selectedTx, setSelectedTx] = useState<string | null>(null);
    const [selectedWallet, setSelectedWallet] = useState<string | null>(null);
    const [network, setNetwork] = useState<StellarNetwork>('mainnet');
    const [networkStats, setNetworkStats] = useState<NetworkStats | null>(null);
    const [statsLoading, setStatsLoading] = useState(true);

    useEffect(() => {
        loadTransactions();
        loadNetworkStats();
    }, [network]);

    useEffect(() => {
        if (!autoRefresh) return;

        const interval = setInterval(() => {
            loadTransactions(true);
            loadNetworkStats(true);
        }, 10000);

        return () => clearInterval(interval);
    }, [autoRefresh, network]);

    const loadNetworkStats = async (silent: boolean = false) => {
        if (!silent) setStatsLoading(true);

        try {
            const horizonUrl = network === 'mainnet' 
                ? 'https://horizon.stellar.org' 
                : 'https://horizon-testnet.stellar.org';
            
            // Fetch latest ledger info from Horizon
            const response = await fetch(`${horizonUrl}/ledgers?order=desc&limit=1`);
            const data = await response.json();
            
            if (data._embedded?.records?.[0]) {
                const ledger = data._embedded.records[0];
                setNetworkStats({
                    latestLedger: ledger.sequence,
                    ledgerTime: ledger.closed_at,
                    transactionCount: ledger.successful_transaction_count,
                    operationCount: ledger.operation_count,
                    averageFee: (ledger.fee_pool / 10000000).toFixed(2),
                    baseReserve: ledger.base_reserve_in_stroops ? 
                        (ledger.base_reserve_in_stroops / 10000000).toFixed(1) : '0.5'
                });
            }
        } catch (err: any) {
            console.error('Failed to load network stats:', err);
        } finally {
            if (!silent) setStatsLoading(false);
        }
    };

    const loadTransactions = async (silent: boolean = false) => {
        if (!silent) setLoading(true);
        setError('');

        try {
            const data = await fetchRecentTransactions(20, network);
            console.log('Loaded transactions:', data.length, 'First tx hash:', data[0]?.hash);
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
        console.log('Transaction clicked:', hash, 'Network:', network);
        if (!hash || hash.length < 10) {
            setError('Invalid transaction hash');
            return;
        }
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

                        {/* Network Toggle Button */}
                        <button
                            onClick={() => setNetwork(network === 'mainnet' ? 'testnet' : 'mainnet')}
                            className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-all group"
                        >
                            <span className={`text-xs font-medium ${network === 'mainnet' ? 'text-blue-400' : 'text-orange-400'}`}>
                                {network === 'mainnet' ? 'Mainnet' : 'Testnet'}
                            </span>
                            <div className="w-10 h-5 bg-black/40 rounded-full relative">
                                <div className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${network === 'mainnet'
                                        ? 'left-0.5 bg-blue-500'
                                        : 'left-5 bg-orange-500'
                                    }`} />
                            </div>
                        </button>
                    </div>
                </div>

                { }
                <div className="flex justify-center mb-12">
                    <ExpoSearchBar onSearch={handleSearch} />
                </div>

                {/* Network Statistics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
                    <div className="bg-white/5 border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-all">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                                <Layers className="text-blue-400" size={20} />
                            </div>
                            <span className="text-sm text-gray-400">Latest Ledger</span>
                        </div>
                        {statsLoading ? (
                            <div className="h-8 bg-white/5 rounded animate-pulse" />
                        ) : (
                            <>
                                <p className="text-2xl font-bold text-white">
                                    {networkStats?.latestLedger.toLocaleString() || '0'}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                    {networkStats?.ledgerTime ? new Date(networkStats.ledgerTime).toLocaleTimeString() : 'N/A'}
                                </p>
                            </>
                        )}
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-all">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                                <TrendingUp className="text-green-400" size={20} />
                            </div>
                            <span className="text-sm text-gray-400">Transactions</span>
                        </div>
                        {statsLoading ? (
                            <div className="h-8 bg-white/5 rounded animate-pulse" />
                        ) : (
                            <>
                                <p className="text-2xl font-bold text-white">
                                    {networkStats?.transactionCount.toLocaleString() || '0'}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">Last ledger</p>
                            </>
                        )}
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-all">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                                <Zap className="text-purple-400" size={20} />
                            </div>
                            <span className="text-sm text-gray-400">Operations</span>
                        </div>
                        {statsLoading ? (
                            <div className="h-8 bg-white/5 rounded animate-pulse" />
                        ) : (
                            <>
                                <p className="text-2xl font-bold text-white">
                                    {networkStats?.operationCount.toLocaleString() || '0'}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">Last ledger</p>
                            </>
                        )}
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-all">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
                                <Clock className="text-orange-400" size={20} />
                            </div>
                            <span className="text-sm text-gray-400">Base Reserve</span>
                        </div>
                        {statsLoading ? (
                            <div className="h-8 bg-white/5 rounded animate-pulse" />
                        ) : (
                            <>
                                <p className="text-2xl font-bold text-white">
                                    {networkStats?.baseReserve || '0.5'} XLM
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                    Avg Fee: {networkStats?.averageFee || '0'} XLM
                                </p>
                            </>
                        )}
                    </div>
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
                        {' '}and{' '}
                        <a
                            href={`https://stellar.expert/explorer/${network === 'mainnet' ? 'public' : 'testnet'}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 transition-colors"
                        >
                            Stellar Expert
                        </a>
                    </p>
                    <p className="mt-2">
                        All transactions are read from the public Stellar network in real-time
                    </p>
                </div>
            </main>

            { }
            {selectedTx && (
                <TransactionDetail hash={selectedTx} onClose={() => setSelectedTx(null)} network={network} />
            )}

            {selectedWallet && (
                <WalletView
                    address={selectedWallet}
                    onClose={() => setSelectedWallet(null)}
                    onTransactionClick={handleTransactionClick}
                    network={network}
                />
            )}
        </div>
    );
}
