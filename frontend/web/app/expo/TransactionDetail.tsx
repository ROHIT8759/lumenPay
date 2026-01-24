'use client';

import React, { useEffect, useState } from 'react';
import { X, Copy, Check, ExternalLink, CheckCircle, XCircle } from 'lucide-react';
import {
    fetchTransactionByHash,
    fetchTransactionOperations,
    ExpoOperation,
    formatTimestamp,
    formatAsset,
    shortenAddress,
} from '@/lib/horizonService';

interface TransactionDetailProps {
    hash: string;
    onClose: () => void;
}

export default function TransactionDetail({ hash, onClose }: TransactionDetailProps) {
    const [transaction, setTransaction] = useState<any>(null);
    const [operations, setOperations] = useState<ExpoOperation[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [copied, setCopied] = useState<string | null>(null);

    useEffect(() => {
        loadTransaction();
    }, [hash]);

    const loadTransaction = async () => {
        setLoading(true);
        setError('');

        try {
            const [txData, opsData] = await Promise.all([
                fetchTransactionByHash(hash),
                fetchTransactionOperations(hash),
            ]);

            setTransaction(txData);
            setOperations(opsData);
        } catch (err: any) {
            setError(err.message || 'Failed to load transaction');
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = async (text: string, label: string) => {
        await navigator.clipboard.writeText(text);
        setCopied(label);
        setTimeout(() => setCopied(null), 2000);
    };

    if (loading) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
                    <p className="text-gray-400">Loading transaction...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
                <div className="bg-[#111] border border-white/10 rounded-2xl p-8 max-w-md w-full mx-4">
                    <div className="text-center">
                        <XCircle className="text-red-400 mx-auto mb-4" size={48} />
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
                        {transaction.successful ? (
                            <CheckCircle className="text-green-400" size={24} />
                        ) : (
                            <XCircle className="text-red-400" size={24} />
                        )}
                        <h2 className="text-xl font-bold">Transaction Details</h2>
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
                    <DetailRow
                        label="Transaction Hash"
                        value={transaction.hash}
                        copyable
                        onCopy={() => copyToClipboard(transaction.hash, 'hash')}
                        copied={copied === 'hash'}
                    />

                    {}
                    <DetailRow
                        label="Status"
                        value={
                            <span className={transaction.successful ? 'text-green-400' : 'text-red-400'}>
                                {transaction.successful ? 'Success' : 'Failed'}
                            </span>
                        }
                    />

                    {}
                    <DetailRow
                        label="Source Account"
                        value={transaction.source_account}
                        copyable
                        onCopy={() => copyToClipboard(transaction.source_account, 'source')}
                        copied={copied === 'source'}
                    />

                    {}
                    <DetailRow label="Ledger" value={transaction.ledger_attr?.toLocaleString()} />

                    {}
                    <DetailRow
                        label="Fee Charged"
                        value={`${(parseInt(transaction.fee_charged) / 10000000).toFixed(7)} XLM`}
                    />

                    {}
                    <DetailRow label="Time" value={formatTimestamp(transaction.created_at)} />

                    {}
                    {transaction.memo && (
                        <DetailRow label="Memo" value={transaction.memo} copyable />
                    )}

                    {}
                    <div>
                        <h3 className="text-sm font-medium text-gray-400 mb-3">
                            Operations ({operations.length})
                        </h3>
                        <div className="space-y-3">
                            {operations.map((op, index) => (
                                <div
                                    key={op.id}
                                    className="bg-white/5 border border-white/10 rounded-lg p-4"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-medium text-blue-400">{op.type}</span>
                                        <span className="text-xs text-gray-500">#{index + 1}</span>
                                    </div>

                                    {op.from && (
                                        <div className="text-sm mb-1">
                                            <span className="text-gray-400">From: </span>
                                            <code className="text-gray-300 font-mono">{shortenAddress(op.from)}</code>
                                        </div>
                                    )}

                                    {op.to && (
                                        <div className="text-sm mb-1">
                                            <span className="text-gray-400">To: </span>
                                            <code className="text-gray-300 font-mono">{shortenAddress(op.to)}</code>
                                        </div>
                                    )}

                                    {op.amount && (
                                        <div className="text-sm">
                                            <span className="text-gray-400">Amount: </span>
                                            <span className="text-white font-medium">
                                                {parseFloat(op.amount).toFixed(7)} {formatAsset(op.asset_type || 'native', op.asset_code)}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {}
                    <a
                        href={`https://stellar.expert/explorer/public/tx/${transaction.hash}`}
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
        <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-400">{label}</span>
            <div className="flex items-center gap-2">
                {typeof value === 'string' ? (
                    <code className="text-sm text-white font-mono break-all">{value}</code>
                ) : (
                    <div className="text-sm text-white">{value}</div>
                )}
                {copyable && onCopy && (
                    <button
                        onClick={onCopy}
                        className="p-1 hover:bg-white/10 rounded transition-colors flex-shrink-0"
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
