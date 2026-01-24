'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, User, Wallet, Copy, Check, Pencil, Save, Loader, QrCode, Shield, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import GlassCard from '@/components/ui/GlassCard';
import { QRCodeSVG } from 'qrcode.react';

interface Profile {
    id: string;
    email: string;
    fullName: string;
    displayName: string;
    avatarUrl: string | null;
    payId: string | null;
    walletAddress: string | null;
    kycStatus: string;
    createdAt: string;
}

export default function MyAccountPage() {
    const router = useRouter();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState('');
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [saveSuccess, setSaveSuccess] = useState(false);

    
    const [copiedAddress, setCopiedAddress] = useState(false);
    const [copiedPayId, setCopiedPayId] = useState(false);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            setLoading(true);
            setError(null);

            const userId = localStorage.getItem('userId');
            if (!userId) {
                setError('Please log in to view your account');
                setLoading(false);
                return;
            }

            const response = await fetch('/api/profile', {
                headers: {
                    'x-user-id': userId,
                },
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to fetch profile');
            }

            const data = await response.json();
            const p = data.profile;
            setProfile({
                id: p.id,
                email: p.email,
                fullName: p.full_name,
                displayName: p.displayName || p.full_name,
                avatarUrl: p.avatar_url,
                payId: p.pay_id,
                walletAddress: p.walletAddress,
                kycStatus: p.kyc_status || 'pending',
                createdAt: p.created_at,
            });
            setEditName(p.displayName || p.full_name || '');
        } catch (err: any) {
            console.error('Error fetching profile:', err);
            setError(err.message || 'Failed to load profile');
        } finally {
            setLoading(false);
        }
    };

    const saveDisplayName = async () => {
        if (!editName.trim()) {
            setSaveError('Display name cannot be empty');
            return;
        }

        if (editName.trim().length > 50) {
            setSaveError('Display name must be 50 characters or less');
            return;
        }

        setSaving(true);
        setSaveError(null);
        setSaveSuccess(false);

        try {
            const userId = localStorage.getItem('userId');
            if (!userId) throw new Error('Not authenticated');

            const response = await fetch('/api/profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': userId,
                },
                body: JSON.stringify({
                    displayName: editName.trim(),
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to update profile');
            }

            const data = await response.json();
            const p = data.profile;
            setProfile(prev => prev ? {
                ...prev,
                displayName: p.displayName || p.display_name || p.full_name,
            } : null);

            setSaveSuccess(true);
            setIsEditing(false);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (err: any) {
            setSaveError(err.message || 'Failed to save');
        } finally {
            setSaving(false);
        }
    };

    const copyToClipboard = async (text: string, type: 'address' | 'payId') => {
        await navigator.clipboard.writeText(text);
        if (type === 'address') {
            setCopiedAddress(true);
            setTimeout(() => setCopiedAddress(false), 2000);
        } else {
            setCopiedPayId(true);
            setTimeout(() => setCopiedPayId(false), 2000);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    const getKycStatusColor = (status: string) => {
        switch (status) {
            case 'verified':
                return 'text-green-400 bg-green-500/20';
            case 'in_review':
                return 'text-yellow-400 bg-yellow-500/20';
            case 'rejected':
                return 'text-red-400 bg-red-500/20';
            default:
                return 'text-gray-400 bg-gray-500/20';
        }
    };

    const getKycStatusText = (status: string) => {
        switch (status) {
            case 'verified':
                return 'Verified';
            case 'in_review':
                return 'Under Review';
            case 'rejected':
                return 'Rejected';
            default:
                return 'Pending';
        }
    };

    return (
        <div className="container mx-auto px-4 max-w-2xl py-6 space-y-6">
            {}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => router.back()}
                    className="p-2 rounded-xl hover:bg-white/10 transition-colors"
                >
                    <ArrowLeft size={20} className="text-white" />
                </button>
                <div>
                    <h1 className="text-xl font-bold text-white">My Account</h1>
                    <p className="text-xs text-gray-500">Manage your profile and display name</p>
                </div>
            </div>

            {}
            {loading && (
                <div className="flex flex-col items-center justify-center py-16 gap-4">
                    <div className="w-12 h-12 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                    <p className="text-gray-400 text-sm">Loading profile...</p>
                </div>
            )}

            {}
            {error && !loading && (
                <GlassCard className="p-6 text-center">
                    <AlertCircle className="text-red-400 mx-auto mb-4" size={40} />
                    <p className="text-red-400 mb-4">{error}</p>
                    <button
                        onClick={fetchProfile}
                        className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors"
                    >
                        Try Again
                    </button>
                </GlassCard>
            )}

            {}
            {!loading && !error && profile && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                >
                    {}
                    <GlassCard className="p-6">
                        <div className="flex items-center gap-4 mb-6">
                            {profile.avatarUrl ? (
                                <img
                                    src={profile.avatarUrl}
                                    alt={profile.displayName}
                                    className="w-20 h-20 rounded-full object-cover border-2 border-white/10"
                                />
                            ) : (
                                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500/30 to-purple-500/30 flex items-center justify-center border-2 border-white/10">
                                    <span className="text-3xl font-bold text-blue-400">
                                        {profile.displayName.charAt(0).toUpperCase()}
                                    </span>
                                </div>
                            )}
                            <div className="flex-1">
                                <h2 className="text-xl font-bold text-white">{profile.displayName}</h2>
                                <p className="text-sm text-gray-500">{profile.email}</p>
                                <div className="flex items-center gap-2 mt-2">
                                    <span className={`px-2 py-0.5 rounded-full text-xs ${getKycStatusColor(profile.kycStatus)}`}>
                                        <Shield size={10} className="inline mr-1" />
                                        {getKycStatusText(profile.kycStatus)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {}
                        <p className="text-xs text-gray-600">
                            Member since {formatDate(profile.createdAt)}
                        </p>
                    </GlassCard>

                    {}
                    <GlassCard className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <User size={18} className="text-blue-400" />
                                <h3 className="font-semibold text-white">Display Name</h3>
                            </div>
                            {!isEditing && (
                                <button
                                    onClick={() => {
                                        setEditName(profile.displayName);
                                        setIsEditing(true);
                                        setSaveError(null);
                                    }}
                                    className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                                >
                                    <Pencil size={16} />
                                </button>
                            )}
                        </div>

                        <p className="text-sm text-gray-500 mb-4">
                            This name will be visible to people you transact with.
                        </p>

                        {isEditing ? (
                            <div className="space-y-4">
                                <div>
                                    <input
                                        type="text"
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        placeholder="Enter your display name"
                                        maxLength={50}
                                        autoFocus
                                        className="w-full bg-black/30 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                                        disabled={saving}
                                    />
                                    <p className="text-xs text-gray-600 mt-1 text-right">{editName.length}/50</p>
                                </div>

                                {saveError && (
                                    <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-3">
                                        <span className="text-sm text-red-400">{saveError}</span>
                                    </div>
                                )}

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => {
                                            setIsEditing(false);
                                            setEditName(profile.displayName);
                                            setSaveError(null);
                                        }}
                                        disabled={saving}
                                        className="flex-1 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-medium transition-colors disabled:opacity-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={saveDisplayName}
                                        disabled={saving || !editName.trim()}
                                        className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:opacity-90 rounded-xl font-medium transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {saving ? (
                                            <Loader size={16} className="animate-spin" />
                                        ) : (
                                            <Save size={16} />
                                        )}
                                        Save
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                                <p className="text-white font-medium">{profile.displayName}</p>
                            </div>
                        )}

                        {saveSuccess && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mt-4 bg-green-500/20 border border-green-500/30 rounded-xl p-3 flex items-center gap-2"
                            >
                                <Check size={16} className="text-green-400" />
                                <span className="text-sm text-green-400">Display name updated successfully!</span>
                            </motion.div>
                        )}
                    </GlassCard>

                    {}
                    <GlassCard className="p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <Wallet size={18} className="text-blue-400" />
                            <h3 className="font-semibold text-white">Wallet Address</h3>
                        </div>

                        <p className="text-sm text-gray-500 mb-4">
                            Your Stellar wallet address (read-only).
                        </p>

                        {profile.walletAddress ? (
                            <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 flex items-center gap-3">
                                <p className="text-white font-mono text-sm flex-1 truncate">
                                    {profile.walletAddress}
                                </p>
                                <button
                                    onClick={() => copyToClipboard(profile.walletAddress!, 'address')}
                                    className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors flex-shrink-0"
                                >
                                    {copiedAddress ? (
                                        <Check size={16} className="text-green-400" />
                                    ) : (
                                        <Copy size={16} />
                                    )}
                                </button>
                            </div>
                        ) : (
                            <p className="text-gray-500 text-sm">No wallet connected</p>
                        )}
                    </GlassCard>

                    {}
                    {profile.payId && (
                        <GlassCard className="p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <QrCode size={18} className="text-blue-400" />
                                <h3 className="font-semibold text-white">Pay ID</h3>
                            </div>

                            <p className="text-sm text-gray-500 mb-4">
                                Share this ID for easy payments.
                            </p>

                            <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 flex items-center gap-3">
                                <p className="text-white font-medium flex-1">{profile.payId}</p>
                                <button
                                    onClick={() => copyToClipboard(profile.payId!, 'payId')}
                                    className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors flex-shrink-0"
                                >
                                    {copiedPayId ? (
                                        <Check size={16} className="text-green-400" />
                                    ) : (
                                        <Copy size={16} />
                                    )}
                                </button>
                            </div>
                        </GlassCard>
                    )}

                    {}
                    {profile.walletAddress && (
                        <GlassCard className="p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <QrCode size={18} className="text-blue-400" />
                                <h3 className="font-semibold text-white">Your QR Code</h3>
                            </div>

                            <p className="text-sm text-gray-500 mb-4">
                                Others can scan this to pay you.
                            </p>

                            <div className="flex justify-center p-6 bg-white rounded-2xl">
                                <QRCodeSVG
                                    value={profile.payId || profile.walletAddress}
                                    size={180}
                                    level="H"
                                    includeMargin={false}
                                />
                            </div>

                            <p className="text-center text-xs text-gray-600 mt-4">
                                {profile.payId || `${profile.walletAddress.slice(0, 10)}...${profile.walletAddress.slice(-10)}`}
                            </p>
                        </GlassCard>
                    )}
                </motion.div>
            )}
        </div>
    );
}
