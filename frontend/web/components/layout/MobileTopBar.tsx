'use client';

import React, { useState } from 'react';
import { Search, User, X, QrCode, Copy, Settings, HelpCircle, LogOut, Languages, Home, Users, FileText, Briefcase, Wallet } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname, useRouter } from 'next/navigation';
import { useWallet } from '@/components/lumenVault/WalletProvider';
import QRCodeModal from '@/components/ui/QRCodeModal';
import Link from 'next/link';

export default function MobileTopBar() {
    const pathname = usePathname();
    const router = useRouter();
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isQROpen, setIsQROpen] = useState(false);
    const { publicKey, signOut } = useWallet();

    // Navigation items for bottom bar
    const navItems = [
        { label: 'Home', href: '/dashboard', icon: Home },
        { label: 'People', href: '/people', icon: Users },
        { label: 'Wallet', href: '/wallet', icon: Wallet },
        { label: 'History', href: '/transactions', icon: FileText },
    ];

    if (pathname === '/' || pathname === '/expo' || pathname === '/about') return null;

    return (
        <>
            {/* Top Bar */}
            <div className="fixed top-0 left-0 right-0 z-50 px-4 py-3 flex items-center justify-between md:hidden glass bg-black/80 backdrop-blur-xl border-b border-white/5">
                <Link href="/dashboard" className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-xs">LP</span>
                    </div>
                    <span className="font-bold text-lg tracking-wider">LumenPay</span>
                </Link>

                <div className="flex items-center gap-2">
                    <button className="p-2.5 rounded-full hover:bg-white/10 transition-colors">
                        <Search size={20} />
                    </button>
                    <button
                        onClick={() => {
                            if (!publicKey) {
                                router.push('/wallet/sync');
                            } else {
                                setIsProfileOpen(true);
                            }
                        }}
                        className="p-2.5 rounded-full hover:bg-white/10 transition-colors relative"
                    >
                        <User size={20} />
                        {publicKey && <div className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-black"></div>}
                    </button>
                </div>
            </div>

            {/* Bottom Navigation Bar - Mobile Only */}
            <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-black/90 backdrop-blur-xl border-t border-white/10 safe-area-bottom">
                <div className="flex items-center justify-around py-2 px-2">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                        const Icon = item.icon;

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex flex-col items-center gap-1 py-2 px-4 rounded-xl transition-all duration-200 min-w-[60px] ${isActive
                                        ? 'bg-white/10 text-white'
                                        : 'text-gray-500 hover:text-gray-300'
                                    }`}
                            >
                                <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                                <span className={`text-[10px] font-medium ${isActive ? 'text-white' : ''}`}>
                                    {item.label}
                                </span>
                            </Link>
                        );
                    })}
                </div>
            </div>

            {/* Profile Drawer */}
            <AnimatePresence>
                {isProfileOpen && publicKey && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
                            onClick={() => setIsProfileOpen(false)}
                        />
                        <motion.div
                            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed inset-y-0 right-0 z-50 w-[85%] max-w-sm bg-[#0a0a0a] border-l border-white/10 p-6 shadow-2xl flex flex-col"
                        >
                            <div className="flex items-center justify-between mb-8">
                                <h2 className="text-xl font-bold">Profile</h2>
                                <button
                                    onClick={() => setIsProfileOpen(false)}
                                    className="p-2 rounded-full hover:bg-white/10 transition"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="flex flex-col items-center mb-8">
                                <div className="w-20 h-20 bg-gradient-to-tr from-blue-500 to-purple-500 rounded-full mb-4 flex items-center justify-center ring-4 ring-white/10">
                                    <User size={40} className="text-white" />
                                </div>
                                <h3 className="text-lg font-semibold">My Wallet</h3>
                                <div className="flex items-center gap-2 text-sm text-gray-400 mt-2 bg-white/5 px-4 py-2 rounded-full cursor-pointer hover:bg-white/10 transition active:scale-95">
                                    <span className="font-mono text-xs">{publicKey ? `${publicKey.slice(0, 6)}...${publicKey.slice(-6)}` : 'Not Connected'}</span>
                                    <Copy size={14} />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 mb-6">
                                <button
                                    onClick={() => { setIsQROpen(true); setIsProfileOpen(false); }}
                                    className="flex flex-col items-center gap-2 p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition active:scale-95"
                                >
                                    <QrCode size={24} className="text-blue-400" />
                                    <span className="text-xs font-medium">My QR</span>
                                </button>
                                <Link
                                    href="/account"
                                    onClick={() => setIsProfileOpen(false)}
                                    className="flex flex-col items-center gap-2 p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition active:scale-95"
                                >
                                    <User size={24} className="text-purple-400" />
                                    <span className="text-xs font-medium">Account</span>
                                </Link>
                            </div>

                            <div className="space-y-2 flex-1">
                                <MenuItem icon={<Settings size={20} />} label="Settings" />
                                <MenuItem icon={<HelpCircle size={20} />} label="Get Help" />
                                <MenuItem icon={<Languages size={20} />} label="Language" />
                            </div>

                            <div className="mt-auto pt-6 border-t border-white/10">
                                <button
                                    onClick={() => {
                                        signOut();
                                        setIsProfileOpen(false);
                                    }}
                                    className="flex items-center justify-center gap-3 w-full p-4 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition active:scale-95"
                                >
                                    <LogOut size={20} />
                                    <span className="font-medium">Disconnect Wallet</span>
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            <QRCodeModal
                isOpen={isQROpen}
                onClose={() => setIsQROpen(false)}
                walletAddress={publicKey || ''}
            />
        </>
    );
}

function MenuItem({ icon, label, onClick, className = "" }: { icon: React.ReactNode; label: string; onClick?: () => void; className?: string }) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-3 w-full p-4 rounded-xl hover:bg-white/5 transition-colors active:scale-[0.98] ${className}`}
        >
            <span className="text-gray-400">{icon}</span>
            <span className="font-medium">{label}</span>
        </button>
    );
}
