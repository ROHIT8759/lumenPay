'use client';

import React from 'react';
import { ArrowUpRight, ArrowDownLeft, Clock, CheckCircle, XCircle, AlertCircle, Inbox } from 'lucide-react';
import { Transaction } from './TransactionDetail';

interface TransactionListProps {
    transactions: Transaction[];
    loading: boolean;
    onTransactionClick: (transaction: Transaction) => void;
}

export default function TransactionList({
    transactions,
    loading,
    onTransactionClick,
}: TransactionListProps) {
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
                <div className="text-center max-w-md">
                    <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Inbox className="text-gray-500" size={40} />
                    </div>
                    <h3 className="text-xl font-bold mb-2">No transactions yet</h3>
                    <p className="text-gray-400">
                        Your payments and transactions will appear here once you start using the platform.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {transactions.map((tx) => (
                <TransactionCard
                    key={tx.id}
                    transaction={tx}
                    onClick={() => onTransactionClick(tx)}
                />
            ))}
        </div>
    );
}

function TransactionCard({
    transaction,
    onClick,
}: {
    transaction: Transaction;
    onClick: () => void;
}) {
    const getTypeLabel = () => {
        const typeMap: Record<string, string> = {
            payment_out: 'Sent',
            payment_in: 'Received',
            loan_disbursement: 'Loan',
            loan_repayment: 'Loan Repayment',
            flash_loan_borrow: 'Flash Loan',
            flash_loan_repay: 'Flash Loan Repay',
            rwa_purchase: 'RWA Purchase',
            rwa_sale: 'RWA Sale',
            bank_payout: 'Bank Payout',
            emi_payment: 'EMI Payment',
            reward_claim: 'Reward',
            topup: 'Top-up',
        };
        return typeMap[transaction.tx_type] || transaction.tx_type;
    };

    const getStatusIcon = () => {
        switch (transaction.status) {
            case 'success':
                return <CheckCircle className="text-green-400" size={18} />;
            case 'failed':
                return <XCircle className="text-red-400" size={18} />;
            case 'pending':
            case 'processing':
                return <Clock className="text-yellow-400" size={18} />;
            default:
                return <AlertCircle className="text-gray-400" size={18} />;
        }
    };

    const getDirectionIcon = () => {
        const isSent = transaction.tx_direction === 'sent' || transaction.tx_type.includes('out');
        return isSent ? (
            <div className="w-10 h-10 bg-red-500/10 rounded-full flex items-center justify-center">
                <ArrowUpRight className="text-red-400" size={20} />
            </div>
        ) : (
            <div className="w-10 h-10 bg-green-500/10 rounded-full flex items-center justify-center">
                <ArrowDownLeft className="text-green-400" size={20} />
            </div>
        );
    };

    const getCounterpartyName = () => {
        if (transaction.tx_direction === 'sent' || transaction.tx_type.includes('out')) {
            return transaction.receiver_display_name || transaction.recipient_name || 'Unknown';
        }
        return transaction.sender_display_name || 'Unknown';
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;

        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const isSent = transaction.tx_direction === 'sent' || transaction.tx_type.includes('out');

    return (
        <button
            onClick={onClick}
            className="w-full bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-all duration-200 hover:scale-[1.01]"
        >
            <div className="flex items-center gap-4">
                {}
                {getDirectionIcon()}

                {}
                <div className="flex-1 text-left">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-white">{getTypeLabel()}</span>
                        {getStatusIcon()}
                    </div>
                    <p className="text-sm text-gray-400">{getCounterpartyName()}</p>
                    <p className="text-xs text-gray-600 mt-1">{formatDate(transaction.created_at)}</p>
                </div>

                {}
                <div className="text-right">
                    <p className={`text-lg font-bold ${isSent ? 'text-red-400' : 'text-green-400'}`}>
                        {isSent ? '-' : '+'}
                        {(transaction.amount / 10000000).toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-400">{transaction.asset_code}</p>
                </div>
            </div>

            {}
            {(transaction.reference || transaction.memo) && (
                <div className="mt-3 pt-3 border-t border-white/5">
                    <p className="text-xs text-gray-500 truncate">
                        {transaction.reference || transaction.memo}
                    </p>
                </div>
            )}
        </button>
    );
}
