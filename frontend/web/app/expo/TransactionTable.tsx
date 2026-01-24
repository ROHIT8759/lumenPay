'use client';

import React from 'react';
import { ExpoTransaction, shortenAddress, formatTimestamp } from '@/lib/horizonService';
import { ExternalLink, CheckCircle, XCircle } from 'lucide-react';

interface TransactionTableProps {
    transactions: ExpoTransaction[];
    loading: boolean;
    onTransactionClick: (hash: string) => void;
}

export default function TransactionTable({
    transactions,
    loading,
    onTransactionClick,
}: TransactionTableProps) {
    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
                    <p className="text-gray-400">Loading transactions...</p>
                </div>
            </div>
        );
    }

    if (transactions.length === 0) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="text-center">
                    <p className="text-gray-400 text-lg">No transactions found</p>
                    <p className="text-gray-600 text-sm mt-2">Try refreshing or check back later</p>
                </div>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full">
                <thead>
                    <tr className="border-b border-white/10">
                        <th className="text-left py-4 px-4 text-sm font-medium text-gray-400">Status</th>
                        <th className="text-left py-4 px-4 text-sm font-medium text-gray-400">Transaction Hash</th>
                        <th className="text-left py-4 px-4 text-sm font-medium text-gray-400">Source Account</th>
                        <th className="text-left py-4 px-4 text-sm font-medium text-gray-400">Ledger</th>
                        <th className="text-left py-4 px-4 text-sm font-medium text-gray-400">Operations</th>
                        <th className="text-left py-4 px-4 text-sm font-medium text-gray-400">Fee</th>
                        <th className="text-left py-4 px-4 text-sm font-medium text-gray-400">Time</th>
                    </tr>
                </thead>
                <tbody>
                    {transactions.map((tx) => (
                        <tr
                            key={tx.id}
                            onClick={() => onTransactionClick(tx.hash)}
                            className="border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors"
                        >
                            <td className="py-4 px-4">
                                {tx.successful ? (
                                    <CheckCircle className="text-green-400" size={18} />
                                ) : (
                                    <XCircle className="text-red-400" size={18} />
                                )}
                            </td>
                            <td className="py-4 px-4">
                                <div className="flex items-center gap-2">
                                    <code className="text-sm text-blue-400 font-mono">
                                        {shortenAddress(tx.hash, 8)}
                                    </code>
                                    <ExternalLink size={14} className="text-gray-500" />
                                </div>
                            </td>
                            <td className="py-4 px-4">
                                <code className="text-sm text-gray-300 font-mono">
                                    {shortenAddress(tx.source_account)}
                                </code>
                            </td>
                            <td className="py-4 px-4 text-sm text-gray-300">
                                {tx.ledger.toLocaleString()}
                            </td>
                            <td className="py-4 px-4 text-sm text-gray-300">
                                {tx.operation_count}
                            </td>
                            <td className="py-4 px-4 text-sm text-gray-300">
                                {(parseInt(tx.fee_charged) / 10000000).toFixed(7)} XLM
                            </td>
                            <td className="py-4 px-4 text-sm text-gray-400">
                                {formatTimestamp(tx.created_at)}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
