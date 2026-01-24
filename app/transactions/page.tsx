'use client';

import React, { useState, useEffect } from 'react';
import { Receipt, RefreshCw, Filter, AlertCircle } from 'lucide-react';
import TransactionList from '@/components/transactions/TransactionList';
import TransactionDetail, { Transaction } from '@/components/transactions/TransactionDetail';
import { useWallet } from '@/hooks/useWallet';
import { useRouter } from 'next/navigation';

export default function TransactionsPage() {
    const { address } = useWallet();
    const router = useRouter();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState<string>('all');

    
    useEffect(() => {
        if (!address) {
            router.push('/');
        }
    }, [address, router]);

    useEffect(() => {
        if (address) {
            loadTransactions();
        }
    }, [address, filter]);

    const loadTransactions = async () => {
        setLoading(true);
        setError('');

        try {
            const params = new URLSearchParams({
                limit: '50',
                offset: '0',
            });

            if (filter !== 'all') {
                params.append('status', filter);
            }

            const response = await fetch(`/api/transactions?${params}`, {
                headers: {
                    'x-user-id': address || '',
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch transactions');
            }

            const data = await response.json();
            setTransactions(data.transactions || []);
        } catch (err: any) {
            console.error('Error loading transactions:', err);
            setError(err.message || 'Failed to load transactions');
        } finally {
            setLoading(false);
        }
    };

    const handleTransactionClick = (transaction: Transaction) => {
        setSelectedTransaction(transaction);
    };

    const handleCloseDetail = () => {
        setSelectedTransaction(null);
    };

    if (!address) {
        return null; 
    }

    return (
        <div className="min-h-screen bg-black text-white pt-24 pb-20 px-4 md:px-8">
            <div className="max-w-4xl mx-auto">
                {}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center">
                            <Receipt className="text-blue-400" size={24} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold">Transactions</h1>
                            <p className="text-gray-400 text-sm">Your payment history</p>
                        </div>
                    </div>
                </div>

                {}
                <div className="flex items-center justify-between mb-6 gap-4">
                    {}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setFilter('all')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'all'
                                    ? 'bg-white text-black'
                                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                }`}
                        >
                            All
                        </button>
                        <button
                            onClick={() => setFilter('success')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'success'
                                    ? 'bg-white text-black'
                                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                }`}
                        >
                            Success
                        </button>
                        <button
                            onClick={() => setFilter('pending')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'pending'
                                    ? 'bg-white text-black'
                                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                }`}
                        >
                            Pending
                        </button>
                        <button
                            onClick={() => setFilter('failed')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'failed'
                                    ? 'bg-white text-black'
                                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                }`}
                        >
                            Failed
                        </button>
                    </div>

                    {}
                    <button
                        onClick={loadTransactions}
                        disabled={loading}
                        className="p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50"
                        title="Refresh"
                    >
                        <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>

                {}
                {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3">
                        <AlertCircle className="text-red-400 flex-shrink-0" size={20} />
                        <p className="text-red-400">{error}</p>
                    </div>
                )}

                {}
                {!loading && transactions.length > 0 && (
                    <div className="grid grid-cols-3 gap-4 mb-6">
                        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                            <p className="text-sm text-gray-400 mb-1">Total</p>
                            <p className="text-2xl font-bold">{transactions.length}</p>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                            <p className="text-sm text-gray-400 mb-1">Success</p>
                            <p className="text-2xl font-bold text-green-400">
                                {transactions.filter((t) => t.status === 'success').length}
                            </p>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                            <p className="text-sm text-gray-400 mb-1">Pending</p>
                            <p className="text-2xl font-bold text-yellow-400">
                                {transactions.filter((t) => t.status === 'pending' || t.status === 'processing').length}
                            </p>
                        </div>
                    </div>
                )}

                {}
                <TransactionList
                    transactions={transactions}
                    loading={loading}
                    onTransactionClick={handleTransactionClick}
                />

                {}
                {!loading && transactions.length >= 50 && (
                    <div className="mt-6 text-center">
                        <button className="px-6 py-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors text-sm font-medium">
                            Load More
                        </button>
                    </div>
                )}
            </div>

            {}
            {selectedTransaction && (
                <TransactionDetail
                    transaction={selectedTransaction}
                    onClose={handleCloseDetail}
                />
            )}
        </div>
    );
}
