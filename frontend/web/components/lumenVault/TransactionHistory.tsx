'use client';



import React, { useEffect, useState } from 'react';
import { useWallet } from './WalletProvider';
import { networkProvider } from '@/lib/lumenVault';
import { ArrowUpRight, ArrowDownLeft, ExternalLink, Loader2 } from 'lucide-react';

export function TransactionHistory() {
    const { publicKey } = useWallet();
    const [transactions, setTransactions] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (publicKey) {
            loadHistory();
        }
    }, [publicKey]);

    const loadHistory = async () => {
        if (!publicKey) return;
        try {
            
            
            const result = await networkProvider.getTransactionHistory(publicKey);
            setTransactions(result.transactions || []);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const openExplorer = (hash: string) => {
        window.open(`https://stellar.expert/explorer/testnet/tx/${hash}`, '_blank');
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                <Loader2 className="w-8 h-8 animate-spin mb-2" />
                <p>Loading history...</p>
            </div>
        );
    }

    if (transactions.length === 0) {
        return (
            <div className="text-center py-10 text-gray-400">
                <p>No transactions found</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {transactions.map((tx) => (
                <div
                    key={tx.id}
                    onClick={() => openExplorer(tx.hash)}
                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-750 cursor-pointer transition"
                >
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.successful ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600'
                            }`}>
                            {tx.sourceAccount === publicKey ? <ArrowUpRight size={20} /> : <ArrowDownLeft size={20} />}
                        </div>
                        <div>
                            <div className="font-semibold text-sm">
                                {tx.type === 'payment' ? (tx.sourceAccount === publicKey ? 'Sent' : 'Received') : tx.type}
                            </div>
                            <div className="text-xs text-gray-500 font-mono text-[10px] truncate w-24">
                                {new Date(tx.createdAt).toLocaleDateString()}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className={`text-sm font-bold ${tx.sourceAccount === publicKey ? 'text-gray-900' : 'text-green-600'}`}>
                            {}
                            {tx.successful ? 'Success' : 'Failed'}
                        </span>
                        <ExternalLink size={12} className="text-gray-400" />
                    </div>
                </div>
            ))}
        </div>
    );
}
