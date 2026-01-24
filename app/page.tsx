'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, ArrowUpRight, ArrowDownLeft, Search, User, Copy, Check, ExternalLink, MoreVertical, Pencil, X, Loader, Trash2, Sparkles, Zap } from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';
import Link from 'next/link';

interface Person {
    id: string;
    address: string;
    shortAddress: string;
    name: string;
    customName?: string | null;
    profileName?: string | null;
    payId: string | null;
    avatarUrl: string | null;
    lastTransactionAt: string;
    direction: 'sent' | 'received';
    lastAmount: number;
    assetCode: string;
}

interface Contact {
    id: string;
    contact_address: string;
    contact_name: string;
}

const container = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.08, delayChildren: 0.2 }
    }
};

const item = {
    hidden: { opacity: 0, y: 30, scale: 0.95 },
    show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 300, damping: 24 } }
};




function EditNameModal({
    isOpen,
    onClose,
    person,
    onSave,
}: {
    isOpen: boolean;
    onClose: () => void;
    person: Person;
    onSave: (name: string) => Promise<void>;
}) {
    const [name, setName] = useState(person.customName || person.name || '');
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="w-full max-w-sm"
            >
                <GlassCard className="p-6 border-white/20 shadow-2xl">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <span className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
                                <Pencil size={18} />
                            </span>
                            Edit Contact
                        </h2>
                        <button
                            onClick={onClose}
                            disabled={loading}
                            className="text-gray-400 hover:text-white disabled:opacity-50 transition-colors p-1 hover:bg-white/10 rounded-lg"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {}
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6">
                        <div className="flex items-center gap-4">
                            {person.avatarUrl ? (
                                <img src={person.avatarUrl} alt="" className="w-12 h-12 rounded-full border border-white/10" />
                            ) : (
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center border border-white/10">
                                    <span className="text-lg font-bold text-blue-400">
                                        {(person.name || person.shortAddress).charAt(0).toUpperCase()}
                                    </span>
                                </div>
                            )}
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-white truncate">{person.shortAddress}</p>
                                {person.payId && (
                                    <p className="text-xs text-blue-400/80 truncate">{person.payId}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="text-sm text-gray-300 font-medium mb-2 block">Display Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Enter a friendly name..."
                                maxLength={50}
                                autoFocus
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:bg-black/50 transition-all"
                                disabled={loading}
                            />
                            <p className="text-xs text-gray-500 mt-1.5 text-right">{name.length}/50</p>
                        </div>

                        {error && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="bg-red-500/10 border border-red-500/20 rounded-xl p-3"
                            >
                                <span className="text-sm text-red-400 flex items-center gap-2">
                                    <X size={14} /> {error}
                                </span>
                            </motion.div>
                        )}

                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={loading}
                                className="flex-1 py-3.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl font-medium transition-all disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading || !name.trim()}
                                className="flex-1 py-3.5 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white rounded-xl font-medium transition-all shadow-lg shadow-blue-900/20 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {loading && <Loader size={16} className="animate-spin" />}
                                Save Changes
                            </button>
                        </div>
                    </form>
                </GlassCard>
            </motion.div>
        </div>
    );
}









export default function PeoplePage() {
    const [people, setPeople] = useState<Person[]>([]);
    const [contacts, setContacts] = useState<Map<string, Contact>>(new Map());
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [copiedId, setCopiedId] = useState<string | null>(null);


    const [editingPerson, setEditingPerson] = useState<Person | null>(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);

    useEffect(() => {
        fetchPeople();
        fetchContacts();
    }, []);


    useEffect(() => {
        const handleClickOutside = () => setOpenMenuId(null);
        if (openMenuId) {
            document.addEventListener('click', handleClickOutside);
            return () => document.removeEventListener('click', handleClickOutside);
        }
    }, [openMenuId]);

    const fetchPeople = async () => {
        try {
            setLoading(true);
            setError(null);

            const userId = localStorage.getItem('userId');
            if (!userId) {
                setError('Please log in to view your contacts');
                return;
            }

            const response = await fetch('/api/people?limit=50', {
                headers: {
                    'x-user-id': userId,
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch contacts');
            }

            const data = await response.json();
            setPeople(data.people || []);
        } catch (err: any) {
            console.error('Error fetching people:', err);
            setError(err.message || 'Failed to load contacts');
        } finally {
            setLoading(false);
        }
    };

    const fetchContacts = async () => {
        try {
            const userId = localStorage.getItem('userId');
            if (!userId) return;

            const response = await fetch('/api/contacts', {
                headers: { 'x-user-id': userId },
            });

            if (response.ok) {
                const data = await response.json();
                const contactMap = new Map<string, Contact>();
                (data.contacts || []).forEach((c: Contact) => {
                    contactMap.set(c.contact_address, c);
                });
                setContacts(contactMap);
            }
        } catch (err) {
            console.error('Error fetching contacts:', err);
        }
    };

    const saveContactName = async (person: Person, name: string) => {
        const userId = localStorage.getItem('userId');
        if (!userId) throw new Error('Not authenticated');

        const response = await fetch('/api/contacts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-user-id': userId,
            },
            body: JSON.stringify({
                contactAddress: person.address,
                customName: name,
            }),
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Failed to save contact name');
        }


        const data = await response.json();
        setContacts(prev => {
            const newMap = new Map(prev);
            newMap.set(person.address, data.contact);
            return newMap;
        });


        setPeople(prev => prev.map(p =>
            p.address === person.address
                ? { ...p, customName: name, name: name }
                : p
        ));
    };

    const removeContactName = async (person: Person) => {
        const userId = localStorage.getItem('userId');
        if (!userId) throw new Error('Not authenticated');

        const response = await fetch('/api/contacts', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'x-user-id': userId,
            },
            body: JSON.stringify({
                contactAddress: person.address,
                customName: name,
            }),
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Failed to remove contact name');
        }


        setContacts(prev => {
            const newMap = new Map(prev);
            newMap.delete(person.address);
            return newMap;
        });


        await fetchPeople();
    };


    const getDisplayName = (person: Person): string => {
        const contact = contacts.get(person.address);
        if (contact?.contact_name) return contact.contact_name;
        if (person.profileName) return person.profileName;
        if (person.payId) return person.payId;
        return person.shortAddress;
    };

    const copyAddress = async (address: string, id: string) => {
        await navigator.clipboard.writeText(address);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
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
        return date.toLocaleDateString();
    };

    const formatAmount = (amount: number, assetCode: string) => {
        if (amount >= 1000000) {
            return `${(amount / 1000000).toFixed(1)}M ${assetCode}`;
        }
        if (amount >= 1000) {
            return `${(amount / 1000).toFixed(1)}K ${assetCode}`;
        }
        return `${amount.toFixed(2)} ${assetCode}`;
    };


    const filteredPeople = people.filter((person) => {
        const query = searchQuery.toLowerCase();
        return (
            person.name.toLowerCase().includes(query) ||
            person.address.toLowerCase().includes(query) ||
            (person.payId && person.payId.toLowerCase().includes(query))
        );
    });

    return (
        <div className="container mx-auto px-4 max-w-2xl py-12 space-y-8 min-h-screen">

            {}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="flex flex-col gap-2 relative z-10"
            >
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-3 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-2xl border border-blue-500/20 shadow-lg shadow-blue-500/10">
                        <Users className="text-blue-400" size={24} />
                    </div>
                    <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">
                        Connections
                    </h1>
                </div>
                <p className="text-gray-400 text-sm ml-1">
                    Manage your recent transactions and contacts effortlessly.
                </p>
            </motion.div>

            {}
            {people.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 }}
                >
                    <GlassCard className="py-4 px-6 flex items-center justify-between !bg-white/[0.02]">
                        <div className="flex flex-col">
                            <span className="text-xs text-gray-500 uppercase tracking-wider font-medium">Total Contacts</span>
                            <span className="text-2xl font-bold text-white">{people.length}</span>
                        </div>
                        <div className="w-px h-8 bg-white/10" />
                        <div className="flex flex-col items-end">
                            <span className="text-xs text-gray-500 uppercase tracking-wider font-medium">Active</span>
                            <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                <span className="text-sm font-medium text-green-400">Online</span>
                            </div>
                        </div>
                    </GlassCard>
                </motion.div>
            )}

            {}
            {people.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="relative group z-10"
                >
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition duration-500" />
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-400 transition-colors" size={20} />
                        <input
                            type="text"
                            placeholder="Find by name, address, or Pay ID..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-black/40 backdrop-blur-xl border border-white/10 rounded-xl pl-12 pr-4 py-4 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all shadow-xl"
                        />
                    </div>
                </motion.div>
            )}

            {}
            {error && !loading && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <GlassCard className="p-8 text-center border-red-500/30 bg-red-500/5">
                        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                            <Zap className="text-red-400" size={32} />
                        </div>
                        <h3 className="text-lg font-semibold text-white mb-2">Oops, something went wrong</h3>
                        <p className="text-red-400/80 mb-6 max-w-xs mx-auto">{error}</p>
                        <button
                            onClick={fetchPeople}
                            className="px-6 py-2.5 bg-gradient-to-r from-red-500/20 to-orange-500/20 border border-red-500/30 text-white rounded-xl hover:bg-red-500/30 transition-all"
                        >
                            Try Again
                        </button>
                    </GlassCard>
                </motion.div>
            )}

            {}
            {loading && (
                <div className="flex flex-col items-center justify-center py-20 gap-6">
                    <div className="relative">
                        <div className="w-16 h-16 border-4 border-blue-500/20 rounded-full" />
                        <div className="absolute inset-0 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        <motion.div
                            className="absolute inset-0 flex items-center justify-center"
                            animate={{ scale: [0.8, 1, 0.8], opacity: [0.5, 1, 0.5] }}
                            transition={{ repeat: Infinity, duration: 1.5 }}
                        >
                            <Sparkles size={20} className="text-blue-400" />
                        </motion.div>
                    </div>
                    <p className="text-gray-400 text-sm animate-pulse">Syncing contacts...</p>
                </div>
            )}

            {}
            {!loading && !error && people.length === 0 && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 20 }}
                    className="flex flex-col items-center justify-center py-20 text-center"
                >
                    <div className="relative mb-8 group">
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/40 to-purple-500/40 blur-xl opacity-20 group-hover:opacity-40 transition-opacity duration-700" />
                        <div className="relative w-24 h-24 rounded-2xl bg-gradient-to-br from-gray-800/50 to-black/50 border border-white/10 flex items-center justify-center backdrop-blur-md">
                            <Users className="text-gray-500 group-hover:text-blue-400 transition-colors duration-500" size={40} />
                        </div>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-3">No contacts discovered yet</h3>
                    <p className="text-gray-500 text-center text-sm max-w-sm mb-8 leading-relaxed">
                        Your contact list is built automatically from your transactions.
                        Start interacting with the Stellar network to see people here.
                    </p>
                    <Link
                        href="/dashboard"
                        className="px-8 py-3.5 bg-gradient-to-r from-blue-600 to-violet-600 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-blue-500/25 hover:scale-105 transition-all duration-300 flex items-center gap-2"
                    >
                        Start Transacting <ArrowUpRight size={18} />
                    </Link>
                </motion.div>
            )}

            {}
            {!loading && !error && people.length > 0 && filteredPeople.length === 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center justify-center py-16"
                >
                    <div className="p-4 bg-white/5 rounded-full mb-4">
                        <Search className="text-gray-500" size={32} />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">No results found</h3>
                    <p className="text-gray-500 text-sm">We couldn't find anyone matching "{searchQuery}"</p>
                    <button
                        onClick={() => setSearchQuery('')}
                        className="mt-6 text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors"
                    >
                        Clear Search
                    </button>
                </motion.div>
            )}

            {/* Contact List */}
            {!loading && !error && filteredPeople.length > 0 && (
                <motion.div
                    variants={container}
                    initial="hidden"
                    animate="show"
                    className="space-y-4"
                >
                    <AnimatePresence mode="popLayout">
                        {filteredPeople.map((person) => {
                            const displayName = getDisplayName(person);
                            const hasCustomName = contacts.has(person.address);

                            return (
                                <motion.div
                                    key={person.id}
                                    variants={item}
                                    layout
                                >
                                    <GlassCard
                                        className="p-4 flex items-center gap-4 hover:border-blue-500/30"
                                        hoverEffect={true}
                                    >
                                        {/* Avatar Area */}
                                        <Link href={`/people/${encodeURIComponent(person.address)}`} className="relative flex-shrink-0 group">
                                            <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                            <div className="relative">
                                                {person.avatarUrl ? (
                                                    <img
                                                        src={person.avatarUrl}
                                                        alt={displayName}
                                                        className="w-12 h-12 rounded-full object-cover border border-white/10"
                                                    />
                                                ) : (
                                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-600/20 to-purple-600/20 flex items-center justify-center border border-white/10">
                                                        <span className="text-lg font-bold text-blue-400 shadow-glow">
                                                            {displayName.charAt(0).toUpperCase()}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center border border-[#111] z-10 shadow-sm ${person.direction === 'sent'
                                                    ? 'bg-red-500/10 text-red-400 bg-[#1a0b0b]'
                                                    : 'bg-green-500/10 text-green-400 bg-[#0b1a0b]'
                                                }`}>
                                                {person.direction === 'sent'
                                                    ? <ArrowUpRight size={10} strokeWidth={3} />
                                                    : <ArrowDownLeft size={10} strokeWidth={3} />
                                                }
                                            </div>
                                        </Link>

                                        {/* Info Area */}
                                        <Link href={`/people/${encodeURIComponent(person.address)}`} className="flex-1 min-w-0 group">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <h3 className="font-semibold text-white truncate group-hover:text-blue-200 transition-colors">
                                                    {displayName}
                                                </h3>
                                                {hasCustomName && (
                                                    <span className="px-1.5 py-0.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] uppercase font-bold tracking-wider rounded">
                                                        Altered
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-gray-500 group-hover:text-gray-400 transition-colors">
                                                {person.payId ? (
                                                    <span className="truncate text-purple-400/80">{person.payId}</span>
                                                ) : (
                                                    <span className="font-mono bg-white/5 px-1.5 py-0.5 rounded text-[10px]">{person.shortAddress}</span>
                                                )}
                                                <span>•</span>
                                                <span>{formatDate(person.lastTransactionAt)}</span>
                                            </div>
                                        </Link>

                                        {/* Amount Area */}
                                        <Link href={`/people/${encodeURIComponent(person.address)}`} className="text-right flex-shrink-0">
                                            <p className={`font-bold tabular-nums ${person.direction === 'sent' ? 'text-red-400' : 'text-green-400'
                                                }`}>
                                                {person.direction === 'sent' ? '-' : '+'}
                                                {formatAmount(person.lastAmount, person.assetCode)}
                                            </p>
                                            <p className="text-[10px] text-gray-600 font-medium uppercase tracking-wide">Last Transaction</p>
                                        </Link>

                                        {/* Actions Menu */}
                                        <div className="relative">
                                            <button
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    setOpenMenuId(openMenuId === person.id ? null : person.id);
                                                }}
                                                className={`p-2 rounded-xl hover:bg-white/10 transition-colors ${openMenuId === person.id ? 'text-white bg-white/10' : 'text-gray-500 hover:text-white'}`}
                                            >
                                                <MoreVertical size={18} />
                                            </button>

                                            <AnimatePresence>
                                                {openMenuId === person.id && (
                                                    <motion.div
                                                        initial={{ opacity: 0, scale: 0.9, y: 10, x: -50 }}
                                                        animate={{ opacity: 1, scale: 1, y: 0, x: -160 }}
                                                        exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                                        style={{ translateX: '-80%' }}
                                                        className="absolute top-10 w-48 bg-[#0a0a0a] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 backdrop-blur-3xl ring-1 ring-white/5"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <div className="p-1 space-y-0.5">
                                                            <button
                                                                onClick={() => {
                                                                    setEditingPerson(person);
                                                                    setShowEditModal(true);
                                                                    setOpenMenuId(null);
                                                                }}
                                                                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/10 rounded-lg text-sm text-gray-300 hover:text-white transition group"
                                                            >
                                                                <Pencil size={15} className="group-hover:text-blue-400 transition-colors" />
                                                                {hasCustomName ? 'Edit Name' : 'Set Name'}
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    copyAddress(person.address, person.id);
                                                                    setOpenMenuId(null);
                                                                }}
                                                                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/10 rounded-lg text-sm text-gray-300 hover:text-white transition group"
                                                            >
                                                                {copiedId === person.id ? (
                                                                    <>
                                                                        <Check size={15} className="text-green-400" />
                                                                        <span className="text-green-400 font-medium">Copied!</span>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <Copy size={15} className="group-hover:text-blue-400 transition-colors" />
                                                                        Copy Address
                                                                    </>
                                                                )}
                                                            </button>
                                                            {hasCustomName && (
                                                                <button
                                                                    onClick={async () => {
                                                                        try {
                                                                            await removeContactName(person);
                                                                            setOpenMenuId(null);
                                                                        } catch (err) {
                                                                            console.error(err);
                                                                        }
                                                                    }}
                                                                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-red-500/10 rounded-lg text-sm text-red-400 hover:text-red-300 transition group"
                                                                >
                                                                    <Trash2 size={15} className="group-hover:text-red-400 transition-colors" />
                                                                    Remove Name
                                                                </button>
                                                            )}
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    </GlassCard>
                                </motion.div>
                            )
                        })}
                    </AnimatePresence>
                </motion.div>
            )}

            {!loading && !error && people.length > 0 && (
                <div className="flex justify-center pt-8 opacity-50 hover:opacity-100 transition-opacity">
                    <p className="text-xs text-gray-500 flex items-center gap-2">
                        <Sparkles size={12} className="text-blue-400" />
                        Synced with Stellar Network
                    </p>
                </div>
            )}

            {editingPerson && (
                <EditNameModal
                    isOpen={showEditModal}
                    onClose={() => {
                        setShowEditModal(false);
                        setEditingPerson(null);
                    }}
                    person={editingPerson}
                    onSave={(name) => saveContactName(editingPerson, name)}
                />
            )}
        </div>
    );
}
