'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, ArrowUpRight, ArrowDownLeft, Search, User, Copy, Check, ExternalLink, MoreVertical, Pencil, X, Loader, Trash2 } from 'lucide-react';
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
        transition: { staggerChildren: 0.05 }
    }
};

const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
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
                                        {(person.name || person.shortAddress).charAt(0).toUpperCase()}
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
                setLoading(false);
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
        <div className="container mx-auto px-4 max-w-2xl py-6 space-y-6">
            {}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                        <Users className="text-blue-400" size={20} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-white">People</h1>
                        <p className="text-xs text-gray-500">
                            {people.length > 0 ? `${people.length} contacts from transactions` : 'Recent transaction contacts'}
                        </p>
                    </div>
                </div>
            </div>

            {}
            {people.length > 0 && (
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                    <input
                        type="text"
                        placeholder="Search by name, address, or Pay ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-black/30 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 transition-colors"
                    />
                </div>
            )}

            {}
            {loading && (
                <div className="flex flex-col items-center justify-center py-16 gap-4">
                    <div className="w-12 h-12 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                    <p className="text-gray-400 text-sm">Loading contacts...</p>
                </div>
            )}

            {}
            {error && !loading && (
                <GlassCard className="p-6 text-center">
                    <p className="text-red-400 mb-4">{error}</p>
                    <button
                        onClick={fetchPeople}
                        className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors"
                    >
                        Try Again
                    </button>
                </GlassCard>
            )}

            {}
            {!loading && !error && people.length === 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center justify-center py-16"
                >
                    <div className="w-24 h-24 rounded-full bg-gray-800 border border-white/10 flex items-center justify-center mb-6">
                        <Users className="text-gray-600" size={40} />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">No contacts yet</h3>
                    <p className="text-gray-500 text-center text-sm max-w-xs mb-6">
                        Send or receive money to see your contacts here. Your transaction history will build your contact list automatically.
                    </p>
                    <Link
                        href="/dashboard"
                        className="px-6 py-3 bg-blue-500 text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
                    >
                        Make a Transaction
                    </Link>
                </motion.div>
            )}

            {}
            {!loading && !error && people.length > 0 && filteredPeople.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12">
                    <Search className="text-gray-600 mb-4" size={40} />
                    <h3 className="text-lg font-semibold text-white mb-2">No results found</h3>
                    <p className="text-gray-500 text-sm">Try a different search term</p>
                </div>
            )}

            {}
            {!loading && !error && filteredPeople.length > 0 && (
                <motion.div
                    variants={container}
                    initial="hidden"
                    animate="show"
                    className="space-y-3"
                >
                    <AnimatePresence>
                        {filteredPeople.map((person) => {
                            const displayName = getDisplayName(person);
                            const hasCustomName = contacts.has(person.address);

                            return (
                                <motion.div
                                    key={person.id}
                                    variants={item}
                                    layout
                                >
                                    <GlassCard className="p-4 hover:bg-white/5 transition-colors group">
                                        <div className="flex items-center gap-4">
                                            {}
                                            <Link href={`/people/${encodeURIComponent(person.address)}`} className="relative flex-shrink-0">
                                                {person.avatarUrl ? (
                                                    <img
                                                        src={person.avatarUrl}
                                                        alt={displayName}
                                                        className="w-12 h-12 rounded-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                                                        <span className="text-lg font-bold text-blue-400">
                                                            {displayName.charAt(0).toUpperCase()}
                                                        </span>
                                                    </div>
                                                )}
                                                {}
                                                <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center ${person.direction === 'sent'
                                                    ? 'bg-red-500/20 text-red-400'
                                                    : 'bg-green-500/20 text-green-400'
                                                    }`}>
                                                    {person.direction === 'sent'
                                                        ? <ArrowUpRight size={12} />
                                                        : <ArrowDownLeft size={12} />
                                                    }
                                                </div>
                                            </Link>

                                            {}
                                            <Link href={`/people/${encodeURIComponent(person.address)}`} className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-semibold text-white truncate">
                                                        {displayName}
                                                    </h3>
                                                    {hasCustomName && (
                                                        <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 text-[10px] rounded">
                                                            Custom
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                                    {person.payId ? (
                                                        <span className="truncate">{person.payId}</span>
                                                    ) : (
                                                        <span className="font-mono">{person.shortAddress}</span>
                                                    )}
                                                    <span>•</span>
                                                    <span>{formatDate(person.lastTransactionAt)}</span>
                                                </div>
                                            </Link>

                                            {}
                                            <Link href={`/people/${encodeURIComponent(person.address)}`} className="text-right">
                                                <p className={`font-semibold ${person.direction === 'sent' ? 'text-red-400' : 'text-green-400'
                                                    }`}>
                                                    {person.direction === 'sent' ? '-' : '+'}
                                                    {formatAmount(person.lastAmount, person.assetCode)}
                                                </p>
                                                <p className="text-xs text-gray-500">Last tx</p>
                                            </Link>

                                            {}
                                            <div className="relative">
                                                <button
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        setOpenMenuId(openMenuId === person.id ? null : person.id);
                                                    }}
                                                    className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                                                >
                                                    <MoreVertical size={16} />
                                                </button>

                                                {}
                                                <AnimatePresence>
                                                    {openMenuId === person.id && (
                                                        <motion.div
                                                            initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                                            exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                                            className="absolute right-0 top-full mt-1 w-48 bg-[#111] border border-white/10 rounded-xl shadow-xl overflow-hidden z-20"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <button
                                                                onClick={() => {
                                                                    setEditingPerson(person);
                                                                    setShowEditModal(true);
                                                                    setOpenMenuId(null);
                                                                }}
                                                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/10 text-sm text-gray-300 hover:text-white transition"
                                                            >
                                                                <Pencil size={16} />
                                                                {hasCustomName ? 'Edit Name' : 'Set Name'}
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    copyAddress(person.address, person.id);
                                                                    setOpenMenuId(null);
                                                                }}
                                                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/10 text-sm text-gray-300 hover:text-white transition"
                                                            >
                                                                {copiedId === person.id ? (
                                                                    <>
                                                                        <Check size={16} className="text-green-400" />
                                                                        Copied!
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <Copy size={16} />
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
                                                                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-500/10 text-sm text-red-400 hover:text-red-300 transition"
                                                                >
                                                                    <Trash2 size={16} />
                                                                    Remove Custom Name
                                                                </button>
                                                            )}
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        </div>
                                    </GlassCard>
                                </motion.div>
                            )
                        })}
                    </AnimatePresence>
                </motion.div>
            )}

            {}
            {!loading && !error && people.length > 0 && (
                <p className="text-center text-xs text-gray-600 pt-4">
                    Tap the menu to set custom names for your contacts
                </p>
            )}

            {}
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
