'use client';

import React, { useState } from 'react';
import { Search, User, X, QrCode, Copy, Settings, HelpCircle, LogOut, Languages } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { useWallet } from '@/hooks/useWallet';
import QRCodeModal from '@/components/ui/QRCodeModal';
import Link from 'next/link';

export default function MobileTopBar() {
    const pathname = usePathname();
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isQROpen, setIsQROpen] = useState(false);
    const { address, disconnect } = useWallet();


    if (pathname === '/' || pathname === '/expo' || pathname === '/about') return null;

    return (
        <>
            <div className="fixed top-0 left-0 right-0 z-50 px-4 py-3 flex items-center justify-between md:hidden glass bg-black/50 backdrop-blur-md">
                <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer">
                    <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                        <span className="text-black font-bold text-xs">LP</span>
                    </div>
                    <span className="font-bold text-lg tracking-wider">LumenPay</span>
                </Link>

                <div className="flex items-center gap-4">
                    <button className="p-2 rounded-full hover:bg-white/10 transition-colors">
                        <Search size={20} />
                    </button>
                    <button
                        onClick={() => {
                            if (!address) {
                                setIsQROpen(true);
                            } else {
                                setIsProfileOpen(true);
                            }
                        }}
                        className="p-2 rounded-full hover:bg-white/10 transition-colors relative"
                    >
                        <User size={20} />
                        {address && <div className="absolute top-1 right-1 w-2 h-2 bg-green-500 rounded-full border border-black"></div>}
                    </button>
                </div>
            </div>

            { }
            <AnimatePresence>
                {isProfileOpen && address && (
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
                                <button onClick={() => setIsProfileOpen(false)}>
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="flex flex-col items-center mb-8">
                                <div className="w-20 h-20 bg-gradient-to-tr from-blue-500 to-purple-500 rounded-full mb-4 flex items-center justify-center">
                                    <User size={40} className="text-white" />
                                </div>
                                <h3 className="text-lg font-semibold">Rohit Kumar</h3>
                                <div className="flex items-center gap-2 text-sm text-gray-400 mt-2 bg-white/5 px-3 py-1.5 rounded-full cursor-pointer hover:bg-white/10 transition">
                                    <span className="font-mono">{address ? `${address.slice(0, 6)}...${address.slice(-6)}` : 'Not Connected'}</span>
                                    <Copy size={12} />
                                </div>
                            </div>

                            <div className="flex justify-center mb-8">
                                <button
                                    onClick={() => { setIsQROpen(true); setIsProfileOpen(false); }}
                                    className="flex flex-col items-center gap-2 p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition w-full"
                                >
                                    <QrCode size={24} />
                                    <span className="text-xs font-medium">My QR Code</span>
                                </button>
                            </div>

                            <div className="space-y-4 flex-1">
                                <MenuItem icon={<Settings size={20} />} label="Settings" />
                                <MenuItem icon={<HelpCircle size={20} />} label="Get Help" />
                                <MenuItem icon={<Languages size={20} />} label="Language" />
                            </div>

                            <div className="mt-auto pt-6 border-t border-white/10">
                                <button
                                    onClick={disconnect}
                                    className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-red-500/10 text-red-400 hover:text-red-300 transition"
                                >
                                    <LogOut size={20} />
                                    <span>Logout</span>
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            <QRCodeModal
                isOpen={isQROpen}
                onClose={() => setIsQROpen(false)}
                walletAddress={address || ''}
            />
        </>
    );
}

function MenuItem({ icon, label, className = "" }: any) {
    return (
        <button className={`flex items-center gap-3 w-full p-4 rounded-xl hover:bg-white/5 transition-colors ${className}`}>
            {icon}
            <span className="font-medium">{label}</span>
        </button>
    );
}
