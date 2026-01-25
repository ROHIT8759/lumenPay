'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowUpRight, ArrowDownLeft, Copy, Check, Clock, CheckCircle, XCircle, AlertCircle, Send, RefreshCw, Loader, X, Repeat, Pencil, MoreVertical } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import GlassCard from '@/components/ui/GlassCard';

interface Transaction {
    id: string;
    txHash: string | null;
    direction: 'sent' | 'received';
    amount: number;
    assetCode: string;
    memo: string | null;
    status: 'pending' | 'processing' | 'success' | 'failed' | 'cancelled';
    fee: number;
    createdAt: string;
    confirmedAt: string | null;
    senderDisplayName?: string | null; 
}

interface PersonInfo {
    address: string;
    shortAddress: string;
    name: string | null; 
    customName?: string | null; 
    payId: string | null;
    avatarUrl: string | null;
}

interface Contact {
    id: string;
    contact_address: string;
    contact_name: string;
}




function EditNameModal({
    isOpen,
    onClose,
    person,
    onSave,
}: {
    isOpen: boolean;
    onClose: () => void;
    person: PersonInfo;
    onSave: (name: string) => Promise<void>;
}) {
    const displayName = person.customName || person.name || person.payId || person.shortAddress;
    const [name, setName] = useState(displayName);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setName(person.customName || person.name || '');
            setError(null);
        }
    }, [isOpen, person]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!name.trim()) {
            setError('Name cannot be empty');
            return;
        }

        if (name.trim().length > 50) {
            setError('Name must be 50 characters or less');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            await onSave(name.trim());
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to save name');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-sm"
            >
                <GlassCard className="p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <Pencil size={18} className="text-blue-400" />
                            Edit Contact Name
                        </h2>
                        <button
                            onClick={onClose}
                            disabled={loading}
                            className="text-gray-400 hover:text-white disabled:opacity-50 transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {}
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-4">
                        <div className="flex items-center gap-3">
                            {person.avatarUrl ? (
                                <img src={person.avatarUrl} alt="" className="w-10 h-10 rounded-full" />
                            ) : (
                                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                                    <span className="text-sm font-bold text-blue-400">
                                        {displayName.charAt(0).toUpperCase()}
                                    </span>
                                </div>
                            )}
                            <div className="min-w-0 flex-1">
                                <p className="text-xs text-gray-500 font-mono truncate">{person.shortAddress}</p>
                                {person.payId && (
                                    <p className="text-xs text-gray-500 truncate">{person.payId}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="text-sm text-gray-400 mb-2 block">Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Enter a name for this contact"
                                maxLength={50}
                                autoFocus
                                className="w-full bg-black/30 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                                disabled={loading}
                            />
                            <p className="text-xs text-gray-600 mt-1 text-right">{name.length}/50</p>
                        </div>

                        {error && (
                            <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-3">
                                <span className="text-sm text-red-400">{error}</span>
                            </div>
                        )}

                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={loading}
                                className="flex-1 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-medium transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading || !name.trim()}
                                className="flex-1 py-3 bg-blue-500 hover:opacity-90 rounded-xl font-medium transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {loading && <Loader size={16} className="animate-spin" />}
                                Save
                            </button>
                        </div>
                    </form>
                </GlassCard>
            </motion.div>
        </div>
    );
}




function PayAgainModal({
    isOpen,
    onClose,
    person,
    defaultAmount,
    onSuccess,
}: {
    isOpen: boolean;
    onClose: () => void;
    person: PersonInfo;
    defaultAmount: number;
    onSuccess: () => void;
}) {
    const [amount, setAmount] = useState(defaultAmount.toString());
    const [memo, setMemo] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [step, setStep] = useState<'input' | 'confirm' | 'processing' | 'success' | 'failed'>('input');
    const [txHash, setTxHash] = useState<string | null>(null);
    const [transactionId, setTransactionId] = useState<string | null>(null);

    
    useEffect(() => {
        if (isOpen) {
            setAmount(defaultAmount.toString());
            setMemo('');
            setError(null);
            setStep('input');
            setTxHash(null);
            setTransactionId(null);
        }
    }, [isOpen, defaultAmount]);

    const handleInitiate = async () => {
        if (!amount || parseFloat(amount) <= 0) {
            setError('Please enter a valid amount');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const userId = localStorage.getItem('userId');
            if (!userId) throw new Error('Not authenticated');

            const response = await fetch('/api/pay', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': userId,
                },
                body: JSON.stringify({
                    action: 'initiate',
                    recipientAddress: person.address,
                    amount: parseFloat(amount),
                    asset: 'XLM',
                    memo: memo || undefined,
                }),
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to initiate payment');

            setTransactionId(data.transactionId);
            setStep('confirm');
        } catch (err: any) {
            setError(err.message || 'Failed to initiate payment');
        } finally {
            setLoading(false);
        }
    };

    const handleConfirm = async () => {
        if (!transactionId) return;

        setStep('processing');
        setError(null);

        try {
            const userId = localStorage.getItem('userId');
            if (!userId) throw new Error('Not authenticated');

            const response = await fetch('/api/pay', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': userId,
                },
                body: JSON.stringify({
                    action: 'confirm',
                    transactionId,
                }),
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Payment failed');
            }

            setTxHash(data.txHash);
            setStep('success');
            onSuccess();
        } catch (err: any) {
            setError(err.message || 'Payment failed');
            setStep('failed');
        }
    };

    const handleClose = () => {
        if (loading || step === 'processing') return;
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-md"
            >
                <GlassCard className="p-6">
                    {}
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Repeat size={20} className="text-blue-400" />
                            Pay Again
                        </h2>
                        <button
                            onClick={handleClose}
                            disabled={loading || step === 'processing'}
                            className="text-gray-400 hover:text-white disabled:opacity-50 transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {}
                    {step === 'input' && (
                        <div className="space-y-4">
                            {}
                            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                                <p className="text-xs text-gray-500 mb-2">Sending to</p>
                                <div className="flex items-center gap-3">
                                    {person.avatarUrl ? (
                                        <img src={person.avatarUrl} alt="" className="w-10 h-10 rounded-full" />
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                                            <span className="text-sm font-bold text-blue-400">
                                                {(person.name || person.shortAddress).charAt(0).toUpperCase()}
                                            </span>
                                        </div>
                                    )}
                                    <div>
                                        <p className="font-semibold text-white">
                                            {person.name || person.payId || person.shortAddress}
                                        </p>
                                        <p className="text-xs text-gray-500 font-mono">
                                            {person.shortAddress}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {}
                            <div>
                                <label className="text-sm text-gray-400 mb-2 block">Amount (XLM)</label>
                                <input
                                    type="number"
                                    placeholder="0.00"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    min="0"
                                    step="any"
                                    className="w-full bg-black/30 border border-white/20 rounded-xl px-4 py-3 text-2xl font-bold text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-center"
                                    disabled={loading}
                                    autoFocus
                                />
                            </div>

                            {}
                            <div>
                                <label className="text-sm text-gray-400 mb-2 block">Note (optional)</label>
                                <input
                                    type="text"
                                    placeholder="What's this for?"
                                    value={memo}
                                    onChange={(e) => setMemo(e.target.value)}
                                    maxLength={28}
                                    className="w-full bg-black/30 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                                    disabled={loading}
                                />
                            </div>

                            {}
                            {error && (
                                <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-3 flex items-start gap-2">
                                    <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
                                    <span className="text-sm text-red-400">{error}</span>
                                </div>
                            )}

                            {}
                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={handleClose}
                                    disabled={loading}
                                    className="flex-1 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-medium transition-colors disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleInitiate}
                                    disabled={loading || !amount || parseFloat(amount) <= 0}
                                    className="flex-1 py-3 bg-blue-500 hover:opacity-90 rounded-xl font-medium transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {loading && <Loader size={16} className="animate-spin" />}
                                    Continue
                                </button>
                            </div>
                        </div>
                    )}

                    {}
                    {step === 'confirm' && (
                        <div className="space-y-4">
                            <div className="text-center py-4">
                                <p className="text-gray-400 mb-2">You are about to send</p>
                                <p className="text-4xl font-bold text-white mb-2">{parseFloat(amount).toFixed(2)} XLM</p>
                                <p className="text-gray-400">to</p>
                                <p className="font-semibold text-white mt-2">
                                    {person.name || person.payId || person.shortAddress}
                                </p>
                                {memo && (
                                    <p className="text-sm text-gray-500 mt-2 italic">"{memo}"</p>
                                )}
                            </div>

                            {error && (
                                <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-3 flex items-start gap-2">
                                    <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
                                    <span className="text-sm text-red-400">{error}</span>
                                </div>
                            )}

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setStep('input')}
                                    className="flex-1 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-medium transition-colors"
                                >
                                    Back
                                </button>
                                <button
                                    onClick={handleConfirm}
                                    className="flex-1 py-3 bg-green-600 hover:bg-green-500 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                                >
                                    <CheckCircle size={18} />
                                    Confirm Payment
                                </button>
                            </div>
                        </div>
                    )}

                    {}
                    {step === 'processing' && (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 border-3 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
                            <p className="text-lg font-semibold text-white mb-2">Processing Payment</p>
                            <p className="text-gray-400 text-sm">Please wait while we submit your transaction...</p>
                        </div>
                    )}

                    {}
                    {step === 'success' && (
                        <div className="text-center py-6">
                            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                                <CheckCircle size={32} className="text-green-400" />
                            </div>
                            <p className="text-lg font-semibold text-white mb-2">Payment Sent!</p>
                            <p className="text-gray-400 text-sm mb-4">
                                {parseFloat(amount).toFixed(2)} XLM sent to {person.name || person.shortAddress}
                            </p>
                            {txHash && (
                                <a
                                    href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-400 text-sm hover:underline"
                                >
                                    View on Explorer →
                                </a>
                            )}
                            <button
                                onClick={handleClose}
                                className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl font-medium transition-colors mt-6"
                            >
                                Done
                            </button>
                        </div>
                    )}

                    {}
                    {step === 'failed' && (
                        <div className="text-center py-6">
                            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                                <XCircle size={32} className="text-red-400" />
                            </div>
                            <p className="text-lg font-semibold text-white mb-2">Payment Failed</p>
                            <p className="text-red-400 text-sm mb-4">{error || 'Something went wrong'}</p>
                            <div className="flex gap-3">
                                <button
                                    onClick={handleClose}
                                    className="flex-1 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-medium transition-colors"
                                >
                                    Close
                                </button>
                                <button
                                    onClick={() => {
                                        setError(null);
                                        setStep('input');
                                    }}
                                    className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                                >
                                    <RefreshCw size={16} />
                                    Try Again
                                </button>
                            </div>
                        </div>
                    )}
                </GlassCard>
            </motion.div>
        </div>
    );
}




export default function TransactionChatPage() {
    const params = useParams();
    const router = useRouter();
    const personId = params.personId as string;

    const [person, setPerson] = useState<PersonInfo | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    
    const [contact, setContact] = useState<Contact | null>(null);
    const [showEditName, setShowEditName] = useState(false);
    const [showMenu, setShowMenu] = useState(false);

    
    const [showPayAgain, setShowPayAgain] = useState(false);
    const [payAgainAmount, setPayAgainAmount] = useState(0);

    
    const hasSuccessfulSentTx = transactions.some(
        tx => tx.direction === 'sent' && tx.status === 'success'
    );

    
    const lastSuccessfulSentTx = [...transactions]
        .reverse()
        .find(tx => tx.direction === 'sent' && tx.status === 'success');

    
    const getDisplayName = (): string => {
        if (contact?.contact_name) return contact.contact_name;
        if (person?.customName) return person.customName;
        if (person?.name) return person.name;
        if (person?.payId) return person.payId;
        return person?.shortAddress || 'Unknown';
    };

    useEffect(() => {
        if (personId) {
            fetchTransactionHistory();
            fetchContact();
        }
    }, [personId]);

    
    useEffect(() => {
        const handleClick = () => setShowMenu(false);
        if (showMenu) {
            document.addEventListener('click', handleClick);
            return () => document.removeEventListener('click', handleClick);
        }
    }, [showMenu]);

    
    useEffect(() => {
        if (!loading && scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [loading, transactions]);

    const fetchContact = async () => {
        try {
            const userId = localStorage.getItem('userId');
            if (!userId) return;

            const response = await fetch(`/api/contacts?address=${encodeURIComponent(personId)}`, {
                headers: { 'x-user-id': userId },
            });

            if (response.ok) {
                const data = await response.json();
                setContact(data.contact || null);
            }
        } catch (err) {
            console.error('Error fetching contact:', err);
        }
    };

    const saveContactName = async (name: string) => {
        const userId = localStorage.getItem('userId');
        if (!userId) throw new Error('Not authenticated');

        const response = await fetch('/api/contacts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-user-id': userId,
            },
            body: JSON.stringify({
                contactAddress: personId,
                customName: name,
            }),
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Failed to save contact name');
        }

        const data = await response.json();
        setContact(data.contact);

        
        if (person) {
            setPerson({ ...person, customName: name });
        }
    };

    const fetchTransactionHistory = async () => {
        try {
            setLoading(true);
            setError(null);

            const userId = localStorage.getItem('userId');
            if (!userId) {
                setError('Please log in to view transaction history');
                setLoading(false);
                return;
            }

            const response = await fetch(`/api/people/${personId}/transactions`, {
                headers: {
                    'x-user-id': userId,
                },
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to fetch transactions');
            }

            const data = await response.json();
            setPerson(data.person);
            setTransactions(data.transactions || []);
        } catch (err: any) {
            console.error('Error fetching transaction history:', err);
            setError(err.message || 'Failed to load transaction history');
        } finally {
            setLoading(false);
        }
    };

    const copyAddress = async () => {
        if (person?.address) {
            await navigator.clipboard.writeText(person.address);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const isToday = date.toDateString() === now.toDateString();
        const isYesterday = new Date(now.getTime() - 86400000).toDateString() === date.toDateString();

        if (isToday) {
            return `Today, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        }
        if (isYesterday) {
            return `Yesterday, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        }
        return date.toLocaleDateString([], {
            day: 'numeric',
            month: 'short',
            year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const formatAmount = (amount: number, assetCode: string) => {
        if (amount >= 1000000) {
            return `${(amount / 1000000).toFixed(2)}M ${assetCode}`;
        }
        if (amount >= 1000) {
            return `${(amount / 1000).toFixed(2)}K ${assetCode}`;
        }
        return `${amount.toFixed(2)} ${assetCode}`;
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'success':
                return <CheckCircle size={12} className="text-green-400" />;
            case 'pending':
            case 'processing':
                return <Clock size={12} className="text-yellow-400" />;
            case 'failed':
            case 'cancelled':
                return <XCircle size={12} className="text-red-400" />;
            default:
                return <AlertCircle size={12} className="text-gray-400" />;
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'success':
                return 'Completed';
            case 'pending':
                return 'Pending';
            case 'processing':
                return 'Processing';
            case 'failed':
                return 'Failed';
            case 'cancelled':
                return 'Cancelled';
            default:
                return status;
        }
    };

    
    const groupedTransactions = transactions.reduce((groups, tx) => {
        const date = new Date(tx.createdAt).toDateString();
        if (!groups[date]) {
            groups[date] = [];
        }
        groups[date].push(tx);
        return groups;
    }, {} as Record<string, Transaction[]>);

    const formatGroupDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const isToday = date.toDateString() === now.toDateString();
        const isYesterday = new Date(now.getTime() - 86400000).toDateString() === date.toDateString();

        if (isToday) return 'Today';
        if (isYesterday) return 'Yesterday';
        return date.toLocaleDateString([], { day: 'numeric', month: 'long', year: 'numeric' });
    };

    return (
        <div className="flex flex-col h-[calc(100vh-5rem)] max-w-2xl mx-auto">
            {}
            <div className="flex items-center gap-4 p-4 bg-black/50 backdrop-blur-md border-b border-white/10">
                <button
                    onClick={() => router.back()}
                    className="p-2 rounded-xl hover:bg-white/10 transition-colors"
                >
                    <ArrowLeft size={20} className="text-white" />
                </button>

                {person && (
                    <>
                        {}
                        {person.avatarUrl ? (
                            <img
                                src={person.avatarUrl}
                                alt={getDisplayName()}
                                className="w-10 h-10 rounded-full object-cover"
                            />
                        ) : (
                            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                                <span className="text-sm font-bold text-blue-400">
                                    {getDisplayName().charAt(0).toUpperCase()}
                                </span>
                            </div>
                        )}

                        {}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <h1 className="font-semibold text-white truncate">
                                    {getDisplayName()}
                                </h1>
                                {contact?.contact_name && (
                                    <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 text-[10px] rounded">
                                        Custom
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <p className="text-xs text-gray-500 font-mono truncate">
                                    {person.payId || person.shortAddress}
                                </p>
                                <button
                                    onClick={copyAddress}
                                    className="p-1 rounded hover:bg-white/10 transition-colors"
                                >
                                    {copied ? (
                                        <Check size={12} className="text-green-400" />
                                    ) : (
                                        <Copy size={12} className="text-gray-500" />
                                    )}
                                </button>
                            </div>
                        </div>

                        {}
                        <div className="relative">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowMenu(!showMenu);
                                }}
                                className="p-2 rounded-xl hover:bg-white/10 transition-colors"
                            >
                                <MoreVertical size={18} className="text-gray-400" />
                            </button>

                            <AnimatePresence>
                                {showMenu && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                        className="absolute right-0 top-full mt-1 w-48 bg-[#111] border border-white/10 rounded-xl shadow-xl overflow-hidden z-20"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <button
                                            onClick={() => {
                                                setShowEditName(true);
                                                setShowMenu(false);
                                            }}
                                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/10 text-sm text-gray-300 hover:text-white transition"
                                        >
                                            <Pencil size={16} />
                                            {contact?.contact_name ? 'Edit Name' : 'Set Name'}
                                        </button>
                                        <button
                                            onClick={() => {
                                                copyAddress();
                                                setShowMenu(false);
                                            }}
                                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/10 text-sm text-gray-300 hover:text-white transition"
                                        >
                                            <Copy size={16} />
                                            Copy Address
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {}
                        {hasSuccessfulSentTx && (
                            <button
                                onClick={() => {
                                    setPayAgainAmount(lastSuccessfulSentTx?.amount || 0);
                                    setShowPayAgain(true);
                                }}
                                className="px-4 py-2 bg-blue-500 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity flex items-center gap-2"
                            >
                                <Repeat size={14} />
                                Pay Again
                            </button>
                        )}
                    </>
                )}

                {loading && (
                    <div className="flex items-center gap-3 flex-1">
                        <div className="w-10 h-10 rounded-full bg-gray-800 animate-pulse" />
                        <div className="flex-1">
                            <div className="w-24 h-4 bg-gray-800 rounded animate-pulse mb-1" />
                            <div className="w-32 h-3 bg-gray-800 rounded animate-pulse" />
                        </div>
                    </div>
                )}
            </div>

            {}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-6"
            >
                {}
                {loading && (
                    <div className="flex flex-col items-center justify-center h-full gap-4">
                        <div className="w-10 h-10 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                        <p className="text-gray-400 text-sm">Loading transactions...</p>
                    </div>
                )}

                {}
                {error && !loading && (
                    <div className="flex flex-col items-center justify-center h-full gap-4">
                        <AlertCircle className="text-red-400" size={40} />
                        <p className="text-red-400 text-center">{error}</p>
                        <button
                            onClick={fetchTransactionHistory}
                            className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors"
                        >
                            Try Again
                        </button>
                    </div>
                )}

                {}
                {!loading && !error && transactions.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full gap-4">
                        <div className="w-20 h-20 rounded-full bg-gray-800 border border-white/10 flex items-center justify-center">
                            <Send className="text-gray-600" size={32} />
                        </div>
                        <h3 className="text-lg font-semibold text-white">No transactions yet</h3>
                        <p className="text-gray-500 text-center text-sm max-w-xs">
                            You haven't made any transactions with this user yet. Send or request money to start.
                        </p>
                        <Link
                            href="/dashboard"
                            className="px-6 py-3 bg-blue-500 text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
                        >
                            Send Money
                        </Link>
                    </div>
                )}

                {/* Transaction Messages */}
                {!loading && !error && transactions.length > 0 && (
                    <AnimatePresence>
                        {Object.entries(groupedTransactions).map(([date, txs]) => (
                            <div key={date} className="space-y-3">
                                {/* Date Separator */}
                                <div className="flex items-center justify-center">
                                    <span className="px-3 py-1 bg-white/5 rounded-full text-xs text-gray-500">
                                        {formatGroupDate(date)}
                                    </span>
                                </div>

                                {/* Transactions for this date */}
                                {txs.map((tx, index) => (
                                    <motion.div
                                        key={tx.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.02 }}
                                        className={`flex ${tx.direction === 'sent' ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div
                                            className={`max-w-[80%] rounded-2xl p-4 ${tx.direction === 'sent'
                                                ? 'bg-blue-500/20 border border-blue-500/20 rounded-br-md'
                                                : 'bg-white/5 border border-white/10 rounded-bl-md'
                                                }`}
                                        >
                                            {/* Direction Label */}
                                            <div className="flex items-center gap-2 mb-2">
                                                {tx.direction === 'sent' ? (
                                                    <>
                                                        <ArrowUpRight size={14} className="text-blue-400" />
                                                        <span className="text-xs text-blue-400 font-medium">You paid</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <ArrowDownLeft size={14} className="text-green-400" />
                                                        <span className="text-xs text-green-400 font-medium">You received</span>
                                                    </>
                                                )}
                                            </div>

                                            {/* Amount */}
                                            <p className={`text-2xl font-bold ${tx.direction === 'sent' ? 'text-white' : 'text-green-400'
                                                }`}>
                                                {tx.direction === 'sent' ? '-' : '+'}
                                                {formatAmount(tx.amount, tx.assetCode)}
                                            </p>

                                            {/* Memo if exists */}
                                            {tx.memo && (
                                                <p className="text-sm text-gray-400 mt-2 italic">
                                                    "{tx.memo}"
                                                </p>
                                            )}

                                            {/* Status and Time */}
                                            <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/5">
                                                <div className="flex items-center gap-1.5">
                                                    {getStatusIcon(tx.status)}
                                                    <span className={`text-xs ${tx.status === 'success' ? 'text-green-400' :
                                                        tx.status === 'failed' || tx.status === 'cancelled' ? 'text-red-400' :
                                                            'text-yellow-400'
                                                        }`}>
                                                        {getStatusText(tx.status)}
                                                    </span>
                                                </div>
                                                <span className="text-xs text-gray-500">
                                                    {new Date(tx.createdAt).toLocaleTimeString([], {
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                    })}
                                                </span>
                                            </div>

                                            {/* Transaction Hash (if available) */}
                                            {tx.txHash && (
                                                <a
                                                    href={`https://stellar.expert/explorer/testnet/tx/${tx.txHash}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-xs text-blue-400/70 hover:text-blue-400 mt-2 block truncate"
                                                >
                                                    View on Explorer →
                                                </a>
                                            )}

                                            {/* Pay Again Button on Sent Transactions */}
                                            {tx.direction === 'sent' && tx.status === 'success' && person && (
                                                <button
                                                    onClick={() => {
                                                        setPayAgainAmount(tx.amount);
                                                        setShowPayAgain(true);
                                                    }}
                                                    className="w-full mt-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-2"
                                                >
                                                    <Repeat size={12} />
                                                    Pay {formatAmount(tx.amount, tx.assetCode)} Again
                                                </button>
                                            )}
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        ))}
                    </AnimatePresence>
                )}
            </div>

            {/* Bottom Action Bar */}
            {!loading && person && (
                <div className="p-4 bg-black/50 backdrop-blur-md border-t border-white/10">
                    <div className="flex gap-3">
                        {hasSuccessfulSentTx ? (
                            <button
                                onClick={() => {
                                    setPayAgainAmount(lastSuccessfulSentTx?.amount || 0);
                                    setShowPayAgain(true);
                                }}
                                className="flex-1 py-3 bg-blue-500 text-white rounded-xl font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                            >
                                <Repeat size={18} />
                                Pay Again
                            </button>
                        ) : (
                            <button
                                onClick={() => {
                                    setPayAgainAmount(0);
                                    setShowPayAgain(true);
                                }}
                                className="flex-1 py-3 bg-blue-500 text-white rounded-xl font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                            >
                                <Send size={18} />
                                Send Money
                            </button>
                        )}
                        <button
                            onClick={() => {
                                // Copy Pay ID or address for requesting
                                if (person.payId) {
                                    navigator.clipboard.writeText(person.payId);
                                } else {
                                    navigator.clipboard.writeText(person.address);
                                }
                            }}
                            className="px-6 py-3 bg-white/10 text-white rounded-xl font-medium hover:bg-white/20 transition-colors"
                        >
                            Request
                        </button>
                    </div>
                </div>
            )}

            {/* Pay Again Modal */}
            {person && (
                <PayAgainModal
                    isOpen={showPayAgain}
                    onClose={() => setShowPayAgain(false)}
                    person={person}
                    defaultAmount={payAgainAmount}
                    onSuccess={fetchTransactionHistory}
                />
            )}

            {/* Edit Name Modal */}
            {person && (
                <EditNameModal
                    isOpen={showEditName}
                    onClose={() => setShowEditName(false)}
                    person={person}
                    onSave={saveContactName}
                />
            )}
        </div>
    );
}
