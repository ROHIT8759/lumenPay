'use client';
import React from 'react';
import { NetworkType } from '@/lib/lumenVault/transactionBuilder';
import { ArrowRight, AlertTriangle, Check, X, ShieldCheck } from 'lucide-react';

interface ApprovalModalProps {
    isOpen: boolean;
    type: 'payment' | 'contract';
    details: {
        amount?: string;
        asset?: string;
        recipient?: string;
        contractAddress?: string;
        method?: string;
        fee: string;
        network: NetworkType;
    };
    onApprove: () => void;
    onReject: () => void;
    isProcessing?: boolean;
}

export function ApprovalModal({
    isOpen,
    type,
    details,
    onApprove,
    onReject,
    isProcessing = false
}: ApprovalModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-900 w-full max-w-sm rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden scale-100 animate-in zoom-in-95 duration-200">

                { }
                <div className="bg-gray-50 dark:bg-gray-800/50 p-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${details.network === 'testnet' ? 'bg-yellow-400' : 'bg-green-500'}`} />
                        <span className="text-xs font-mono uppercase tracking-widest text-gray-500">
                            {details.network}
                        </span>
                    </div>
                    <span className="text-xs font-semibold px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">
                        {type === 'payment' ? 'SEND PAYMENT' : 'CONTRACT CALL'}
                    </span>
                </div>

                { }
                <div className="p-6 space-y-6">

                    { }
                    <div className="text-center">
                        {type === 'payment' ? (
                            <>
                                <div className="text-gray-500 text-sm mb-1">Sending</div>
                                <div className="text-3xl font-bold text-gray-900 dark:text-white">
                                    {details.amount} <span className="text-lg text-gray-500">{details.asset || 'XLM'}</span>
                                </div>
                                <div className="flex items-center justify-center gap-2 mt-4 text-gray-500">
                                    <span className="bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full text-xs font-mono truncate max-w-[120px]">
                                        You
                                    </span>
                                    <ArrowRight size={16} />
                                    <span className="bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full text-xs font-mono truncate max-w-[120px]">
                                        {details.recipient}
                                    </span>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="text-gray-500 text-sm mb-1">Interacting with</div>
                                <div className="text-xl font-mono font-bold text-gray-900 dark:text-white truncate px-4">
                                    {details.contractAddress}
                                </div>
                                <div className="mt-2 text-sm bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 py-1 px-3 rounded-full inline-block">
                                    Method: <span className="font-mono font-bold">{details.method}</span>
                                </div>
                            </>
                        )}
                    </div>

                    { }
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 space-y-3 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-500">Network Fee</span>
                            <span className="font-medium text-gray-900 dark:text-white">
                                {details.fee} XLM
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Total Total</span>
                            <span className="font-bold text-gray-900 dark:text-white">
                                {type === 'payment' && details.asset === 'XLM'
                                    ? (parseFloat(details.amount || '0') + parseFloat(details.fee)).toFixed(7)
                                    : details.fee
                                } XLM
                            </span>
                        </div>
                    </div>

                    { }
                    <div className="flex items-start gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/10 rounded-lg text-xs text-yellow-800 dark:text-yellow-400">
                        <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
                        <p>
                            Review transaction details carefully. This action cannot be undone once confirmed.
                        </p>
                    </div>

                </div>

                { }
                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800 grid grid-cols-2 gap-3">
                    <button
                        onClick={onReject}
                        disabled={isProcessing}
                        className="py-3 px-4 rounded-xl border border-gray-200 dark:border-gray-700 font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                    >
                        Reject
                    </button>
                    <button
                        onClick={onApprove}
                        disabled={isProcessing}
                        className="py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition flex items-center justify-center gap-2"
                    >
                        {isProcessing ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Signing...
                            </>
                        ) : (
                            <>
                                Confirm
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
