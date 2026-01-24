'use client';

import React, { useState, useEffect } from 'react';
import { Receipt, RefreshCw, Filter, AlertCircle } from 'lucide-react';
import TransactionList from '@/components/transactions/TransactionList';
import TransactionDetail, { Transaction } from '@/components/transactions/TransactionDetail';
import { useRouter } from 'next/navigation';

export default function TransactionsPage() {
    const router = useRouter();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState<string>('all');
    const [userId, setUserId] = useState<string | null>(null);

    useEffect(() => {
        const storedUserId = localStorage.getItem('userId');
        if (!storedUserId) {
            console.log('No userId found in localStorage, redirecting to home');
            router.push('/');
        } else {
            console.log('userId found:', storedUserId);
            setUserId(storedUserId);
        }
    }, [router]);

    useEffect(() => {
        if (userId) {
            loadTransactions();
        }
    }, [userId, filter]);

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
                    'x-user-id': userId || '',
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

    if (!userId) {
        return null;
    }

    return (
        <div className="min-h-screen bg-black text-white pt-4 sm:pt-8 pb-24 md:pb-20 px-4 sm:px-6 md:px-8">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-4 sm:mb-8">
                    <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-500/10 rounded-xl flex items-center justify-center">
                            <Receipt className="text-blue-400" size={20} />
                        </div>
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold">Transactions</h1>
                            <p className="text-gray-400 text-xs sm:text-sm">Your payment history</p>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-3 sm:gap-4">
                    {/* Filter Buttons - Horizontal scroll on mobile */}
                    <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
                        <button
                            onClick={() => setFilter('all')}
                            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${filter === 'all'
                                ? 'bg-white text-black'
                                : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                }`}
                        >
                            All
                        </button>
                        <button
                            onClick={() => setFilter('success')}
                            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${filter === 'success'
                                ? 'bg-white text-black'
                                : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                }`}
                        >
                            Success
                        </button>
                        <button
                            onClick={() => setFilter('pending')}
                            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${filter === 'pending'
                                ? 'bg-white text-black'
                                : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                }`}
                        >
                            Pending
                        </button>
                        <button
                            onClick={() => setFilter('failed')}
                            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${filter === 'failed'
                                ? 'bg-white text-black'
                                : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                }`}
                        >
                            Failed
                        </button>
                    </div>

                    {/* Refresh Button */}
                    <button
                        onClick={loadTransactions}
                        disabled={loading}
                        className="p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50 self-end sm:self-auto"
                        title="Refresh"
                    >
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 sm:gap-3">
                        <AlertCircle className="text-red-400 flex-shrink-0" size={18} />
                        <p className="text-red-400 text-sm">{error}</p>
                    </div>
                )}

                {/* Stats - Horizontal scroll on mobile */}
                {!loading && transactions.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-6">
                        <div className="bg-white/5 border border-white/10 rounded-xl p-3 sm:p-4">
                            <p className="text-[10px] sm:text-sm text-gray-400 mb-0.5 sm:mb-1">Total</p>
                            <p className="text-lg sm:text-2xl font-bold">{transactions.length}</p>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-xl p-3 sm:p-4">
                            <p className="text-[10px] sm:text-sm text-gray-400 mb-0.5 sm:mb-1">Success</p>
                            <p className="text-lg sm:text-2xl font-bold text-green-400">
                                {transactions.filter((t) => t.status === 'success').length}
                            </p>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-xl p-3 sm:p-4">
                            <p className="text-[10px] sm:text-sm text-gray-400 mb-0.5 sm:mb-1">Pending</p>
                            <p className="text-lg sm:text-2xl font-bold text-yellow-400">
                                {transactions.filter((t) => t.status === 'pending' || t.status === 'processing').length}
                            </p>
                        </div>
                    </div>
                )}

                {/* Transaction List */}
                <TransactionList
                    transactions={transactions}
                    loading={loading}
                    onTransactionClick={handleTransactionClick}
                />

                {/* Load More */}
                {!loading && transactions.length >= 50 && (
                    <div className="mt-4 sm:mt-6 text-center">
                        <button className="px-4 sm:px-6 py-2.5 sm:py-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors text-xs sm:text-sm font-medium active:scale-95">
                            Load More
                        </button>
                    </div>
                )}
            </div>

            {/* Transaction Detail Modal */}
            {selectedTransaction && (
                <TransactionDetail
                    transaction={selectedTransaction}
                    onClose={handleCloseDetail}
                />
            )}
        </div>
    );
}
