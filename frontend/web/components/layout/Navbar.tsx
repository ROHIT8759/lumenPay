'use client';

import React, { useState } from 'react';
import { Home, Users, Briefcase, Gift, FileText, User, Settings, HelpCircle, LogOut, QrCode, Languages, Copy, Check, UserCircle } from 'lucide-react';
import { useWallet } from '@/components/lumenVault/WalletProvider';
import { motion, AnimatePresence } from 'framer-motion';
import QRCodeModal from '@/components/ui/QRCodeModal';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

export default function Navbar() {
    const pathname = usePathname();
    const router = useRouter();
    const { publicKey, signOut } = useWallet();
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isQROpen, setIsQROpen] = useState(false);
    const [copied, setCopied] = useState(false);

    const copyAddress = async () => {
        if (publicKey) {
            await navigator.clipboard.writeText(publicKey);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const navItems = [
        { label: 'Home', href: '/dashboard', icon: Home },
        { label: 'People', href: '/people', icon: Users },
        { label: 'Services', href: '/services', icon: Briefcase },
        { label: 'Offers', href: '/offers', icon: Gift },
        { label: 'Transactions', href: '/transactions', icon: FileText },
    ];


    if (pathname === '/' || pathname === '/expo' || pathname === '/about') return null;

    return (
        <>
            <nav className="hidden md:flex fixed top-0 inset-x-0 z-50 h-20 items-center justify-between px-8 bg-black/50 backdrop-blur-md border-b border-white/5">
                <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer">
                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                        <span className="text-black font-bold">LP</span>
                    </div>
                    <span className="font-bold text-xl tracking-wider">LumenPay</span>
                </Link>

                <div className="flex items-center gap-1">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        const Icon = item.icon;

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300
                  ${isActive ? 'bg-white text-black font-medium' : 'text-gray-400 hover:text-white hover:bg-white/5'}
                `}
                            >
                                <Icon size={18} />
                                <span>{item.label}</span>
                            </Link>
                        )
                    })}
                </div>

                <div className="relative">
                    <button
                        onClick={() => {
                            if (!publicKey) {
                                router.push('/wallet/sync');
                            } else {
                                setIsProfileOpen(!isProfileOpen);
                            }
                        }}
                        className="flex items-center gap-4 hover:bg-white/5 p-2 rounded-full transition-colors"
                    >
                        <div className="text-right hidden lg:block">
                            <div className="text-sm font-medium">My Wallet</div>
                            <div className="text-xs text-gray-500 font-mono">
                                {publicKey ? `${publicKey.slice(0, 4)}...${publicKey.slice(-4)}` : 'Connect'}
                            </div>
                        </div>
                        <div className="w-10 h-10 bg-blue-500 rounded-full border-2 border-black flex items-center justify-center">
                            <User className="text-white" size={20} />
                        </div>
                    </button>

                    { }
                    <AnimatePresence>
                        {isProfileOpen && publicKey && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setIsProfileOpen(false)} />
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    className="absolute right-0 top-full mt-2 w-72 bg-[#111] border border-white/10 rounded-2xl shadow-xl overflow-hidden z-50 p-2"
                                >
                                    <div className="p-4 border-b border-white/5 mb-2">
                                        <p className="text-sm font-bold text-white">My Account</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <p className="text-xs text-gray-500 truncate font-mono flex-1">{publicKey}</p>
                                            <button
                                                onClick={copyAddress}
                                                className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                                                title="Copy address"
                                            >
                                                {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <button
                                            onClick={() => {
                                                router.push('/account');
                                                setIsProfileOpen(false);
                                            }}
                                            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/10 text-sm text-gray-300 hover:text-white transition"
                                        >
                                            <UserCircle size={18} />
                                            My Account
                                        </button>
                                        <button
                                            onClick={() => { setIsQROpen(true); setIsProfileOpen(false); }}
                                            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/10 text-sm text-gray-300 hover:text-white transition"
                                        >
                                            <QrCode size={18} />
                                            QRCode
                                        </button>
                                        <button className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/10 text-sm text-gray-300 hover:text-white transition">
                                            <Settings size={18} />
                                            Settings
                                        </button>
                                        <button className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/10 text-sm text-gray-300 hover:text-white transition">
                                            <HelpCircle size={18} />
                                            Get Help
                                        </button>
                                        <button className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/10 text-sm text-gray-300 hover:text-white transition">
                                            <Languages size={18} />
                                            Language
                                        </button>
                                        <div className="h-px bg-white/5 my-2" />
                                        <button
                                            onClick={signOut}
                                            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-red-500/10 text-sm text-red-400 hover:text-red-300 transition"
                                        >
                                            <LogOut size={18} />
                                            Logout
                                        </button>
                                    </div>
                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>
                </div>
            </nav>

            <QRCodeModal
                isOpen={isQROpen}
                onClose={() => setIsQROpen(false)}
                walletAddress={publicKey || ''}
            />
        </>
    );
}
