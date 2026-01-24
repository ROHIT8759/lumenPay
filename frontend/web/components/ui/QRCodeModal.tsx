'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import GlassCard from '@/components/ui/GlassCard';
import { X, Copy, Check } from 'lucide-react';
import QRCodeDisplay from '@/components/ui/QRCodeDisplay';
import LoginModal from '@/components/auth/LoginModal';
import { useState } from 'react';

interface QRCodeModalProps {
    isOpen: boolean;
    onClose: () => void;
    walletAddress: string;
}

export default function QRCodeModal({ isOpen, onClose, walletAddress }: QRCodeModalProps) {
    const [copied, setCopied] = useState(false);

    const copyToClipboard = () => {
        navigator.clipboard.writeText(walletAddress);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    
    if (!walletAddress) {
        return <LoginModal isOpen={isOpen} onClose={onClose} />;
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
                        onClick={onClose}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                            className="relative w-full max-w-sm max-h-[90vh] overflow-y-auto"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <GlassCard className="p-6 relative flex flex-col items-center text-center">
                                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
                                    <X size={20} />
                                </button>

                                <h2 className="text-xl font-bold mb-6">Receive Payment</h2>

                                <div className="bg-white p-4 rounded-3xl mb-6">
                                    <QRCodeDisplay value={walletAddress} size={200} />
                                </div>

                                <p className="text-xs text-gray-400 mb-2">Scan to pay directly to this wallet</p>

                                <div
                                    onClick={copyToClipboard}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 flex items-center justify-between cursor-pointer hover:bg-white/10 transition group"
                                >
                                    <div className="text-left overflow-hidden">
                                        <div className="text-xs text-gray-400">Wallet Address</div>
                                        <div className="text-sm font-mono truncate text-gray-200 w-48">
                                            {walletAddress}
                                        </div>
                                    </div>
                                    <div className="p-2 bg-white/10 rounded-lg group-hover:bg-white/20 transition">
                                        {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                                    </div>
                                </div>
                            </GlassCard>
                        </motion.div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
