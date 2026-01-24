'use client';

import React, { useState } from 'react';
import { X, Copy, Check, ExternalLink, ArrowUpRight, ArrowDownLeft, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface Transaction {
    id: string;
    tx_hash: string | null;
    tx_type: string;
    tx_direction: string | null;
    amount: number;
    asset_code: string;
    sender_wallet: string | null;
    sender_display_name: string | null;
    receiver_wallet: string | null;
    receiver_display_name: string | null;
    recipient_name: string | null;
    recipient_address: string | null;
    pay_id_used: string | null;
    memo: string | null;
    reference: string | null;
    status: string;
    error_message: string | null;
    fee: number;
    related_feature: string | null;
    meta_data: any;
    created_at: string;
    confirmed_at: string | null;
}

interface TransactionDetailProps {
    transaction: Transaction;
    onClose: () => void;
}

export default function TransactionDetail({ transaction, onClose }: TransactionDetailProps) {
    const [copied, setCopied] = useState<string | null>(null);

    const copyToClipboard = async (text: string, label: string) => {
        if (!text) return;
        await navigator.clipboard.writeText(text);
        setCopied(label);
        setTimeout(() => setCopied(null), 2000);
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        });
    };

    const getStatusIcon = () => {
        switch (transaction.status) {
            case 'success':
                return <CheckCircle className="text-green-400" size={24} />;
            case 'failed':
                return <XCircle className="text-red-400" size={24} />;
            case 'pending':
            case 'processing':
                return <Clock className="text-yellow-400" size={24} />;
            default:
                return <AlertCircle className="text-gray-400" size={24} />;
        }
    };

    const getTypeLabel = () => {
        const typeMap: Record<string, string> = {
            payment_out: 'Payment Sent',
            payment_in: 'Payment Received',
            loan_disbursement: 'Loan Disbursed',
            loan_repayment: 'Loan Repayment',
            flash_loan_borrow: 'Flash Loan Borrowed',
            flash_loan_repay: 'Flash Loan Repaid',
            rwa_purchase: 'RWA Purchase',
            rwa_sale: 'RWA Sale',
            bank_payout: 'Bank Payout',
            emi_payment: 'EMI Payment',
            reward_claim: 'Reward Claimed',
            topup: 'Account Top-up',
        };
        return typeMap[transaction.tx_type] || transaction.tx_type;
    };

    const getDirectionIcon = () => {
        if (transaction.tx_direction === 'sent' || transaction.tx_type.includes('out')) {
            return <ArrowUpRight className="text-red-400" size={20} />;
        }
        return <ArrowDownLeft className="text-green-400" size={20} />;
    };

    const counterpartyName =
        transaction.tx_direction === 'sent'
            ? transaction.receiver_display_name || transaction.recipient_name || 'Unknown'
            : transaction.sender_display_name || 'Unknown';

    const counterpartyAddress =
        transaction.tx_direction === 'sent'
            ? transaction.receiver_wallet || transaction.recipient_address
            : transaction.sender_wallet;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
                <div className="fixed inset-0" onClick={onClose} />

                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative bg-[#111] border border-white/10 rounded-2xl max-w-2xl w-full my-8 z-10"
                >
                    {}
                    <div className="flex items-center justify-between p-6 border-b border-white/10">
                        <div className="flex items-center gap-3">
                            {getStatusIcon()}
                            <div>
                                <h2 className="text-xl font-bold">{getTypeLabel()}</h2>
                                <p className="text-sm text-gray-400 capitalize">{transaction.status}</p>
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
                        <div className="text-center py-6 bg-white/5 rounded-xl border border-white/10">
                            <div className="flex items-center justify-center gap-2 mb-2">
                                {getDirectionIcon()}
                                <span className="text-4xl font-bold">
                                    {(transaction.amount / 10000000).toFixed(7)}
                                </span>
                                <span className="text-2xl text-gray-400">{transaction.asset_code}</span>
                            </div>
                            <p className="text-sm text-gray-400 mt-2">
                                Fee: {(transaction.fee / 10000000).toFixed(7)} {transaction.asset_code}
                            </p>
                        </div>

                        {}
                        <DetailRow
                            label={transaction.tx_direction === 'sent' ? 'To' : 'From'}
                            value={
                                <div className="flex flex-col gap-1">
                                    <span className="text-white font-medium">{counterpartyName}</span>
                                    {counterpartyAddress && (
                                        <code className="text-xs text-gray-400 font-mono break-all">
                                            {counterpartyAddress}
                                        </code>
                                    )}
                                </div>
                            }
                            copyable={!!counterpartyAddress}
                            onCopy={() => copyToClipboard(counterpartyAddress!, 'address')}
                            copied={copied === 'address'}
                        />

                        {}
                        {transaction.pay_id_used && (
                            <DetailRow
                                label="Pay ID"
                                value={<code className="text-blue-400">@{transaction.pay_id_used}</code>}
                                copyable
                                onCopy={() => copyToClipboard(transaction.pay_id_used!, 'payid')}
                                copied={copied === 'payid'}
                            />
                        )}

                        {}
                        {transaction.tx_hash && (
                            <DetailRow
                                label="Transaction Hash"
                                value={
                                    <code className="text-xs text-gray-300 font-mono break-all">
                                        {transaction.tx_hash}
                                    </code>
                                }
                                copyable
                                onCopy={() => copyToClipboard(transaction.tx_hash!, 'hash')}
                                copied={copied === 'hash'}
                            />
                        )}

                        {}
                        {(transaction.reference || transaction.memo) && (
                            <DetailRow
                                label="Reference"
                                value={transaction.reference || transaction.memo}
                            />
                        )}

                        {}
                        {transaction.related_feature && (
                            <DetailRow
                                label="Category"
                                value={
                                    <span className="px-3 py-1 bg-blue-500/10 text-blue-400 rounded-full text-sm capitalize">
                                        {transaction.related_feature.replace('_', ' ')}
                                    </span>
                                }
                            />
                        )}

                        {}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <DetailRow label="Created" value={formatDate(transaction.created_at)} />
                            {transaction.confirmed_at && (
                                <DetailRow label="Confirmed" value={formatDate(transaction.confirmed_at)} />
                            )}
                        </div>

                        {}
                        {transaction.error_message && (
                            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                                <p className="text-sm text-red-400">
                                    <span className="font-medium">Error: </span>
                                    {transaction.error_message}
                                </p>
                            </div>
                        )}

                        {}
                        <DetailRow
                            label="Transaction ID"
                            value={<code className="text-xs text-gray-500 font-mono">{transaction.id}</code>}
                            copyable
                            onCopy={() => copyToClipboard(transaction.id, 'id')}
                            copied={copied === 'id'}
                        />

                        {}
                        {transaction.tx_hash && (
                            <a
                                href={`https://stellar.expert/explorer/public/tx/${transaction.tx_hash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors py-3"
                            >
                                View on Stellar Explorer
                                <ExternalLink size={14} />
                            </a>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}

function DetailRow({
    label,
    value,
    copyable,
    onCopy,
    copied,
}: {
    label: string;
    value: React.ReactNode;
    copyable?: boolean;
    onCopy?: () => void;
    copied?: boolean;
}) {
    return (
        <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-gray-400">{label}</span>
            <div className="flex items-center gap-2">
                <div className="flex-1">
                    {typeof value === 'string' ? (
                        <span className="text-white">{value}</span>
                    ) : (
                        value
                    )}
                </div>
                {copyable && onCopy && (
                    <button
                        onClick={onCopy}
                        className="p-2 hover:bg-white/10 rounded transition-colors flex-shrink-0"
                    >
                        {copied ? (
                            <Check className="text-green-400" size={16} />
                        ) : (
                            <Copy className="text-gray-400" size={16} />
                        )}
                    </button>
                )}
            </div>
        </div>
    );
}
