'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Shield, Zap, Globe } from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';
import StarfieldBackground from '@/components/ui/StarfieldBackground';
import LoginModal from '@/components/auth/LoginModal';

export default function LandingPage() {
    const [isLoginOpen, setIsLoginOpen] = useState(false);

    return (
        <div className="min-h-screen text-white relative flex flex-col">
            {/* Navbar handled inside here for state simplicity */}
            <LandingNavbar onLogin={() => setIsLoginOpen(true)} />

            <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />

            <main className="flex-1 flex flex-col">
                {/* HERO SECTION */}
                <section id="home" className="flex-1 flex flex-col items-center justify-center text-center px-4 py-20 relative z-10">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                        className="max-w-3xl space-y-6"
                    >
                        <h1 className="text-5xl md:text-7xl font-bold tracking-tight bg-clip-text text-transparent bg-linear-to-r from-white to-gray-500">
                            The Future of Payments is Here.
                        </h1>
                        <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                            StellarPay brings the speed of crypto with the simplicity of UPI.
                            Scan, Pay, and Earn in seconds.
                        </p>

                        <div className="flex items-center justify-center gap-4 pt-8">
                            <button
                                onClick={() => setIsLoginOpen(true)}
                                className="px-8 py-4 bg-white text-black rounded-full font-bold text-lg hover:scale-105 transition-transform flex items-center gap-2"
                            >
                                Launch App <ArrowRight size={20} />
                            </button>
                        </div>
                    </motion.div>
                </section>

                {/* FEATURES SECTION */}
                <section id="features" className="py-20 px-4 md:px-20 relative z-10">
                    <h2 className="text-3xl font-bold text-center mb-12">Why StellarPay?</h2>
                    <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                        <FeatureCard
                            icon={<Zap className="text-yellow-400" />}
                            title="Lightning Fast"
                            desc="Transactions settle in 3-5 seconds on the Stellar Network."
                        />
                        <FeatureCard
                            icon={<Shield className="text-green-400" />}
                            title="Bank-Grade Security"
                            desc="Your keys are encrypted with AES-256 standard."
                        />
                        <FeatureCard
                            icon={<Globe className="text-blue-400" />}
                            title="Global Reach"
                            desc="Send money to anyone, anywhere, instantly."
                        />
                    </div>
                </section>


            </main>


        </div>
    );
}

function LandingNavbar({ onLogin }: { onLogin: () => void }) {
    return (
        <nav className="fixed top-0 inset-x-0 z-50 h-20 flex items-center justify-between px-8 bg-black/50 backdrop-blur-md border-b border-white/5">
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                    <span className="text-black font-bold text-xs">SP</span>
                </div>
                <span className="font-bold text-xl tracking-wider">StellarPay</span>
            </div>

            <div className="hidden md:flex items-center gap-8">
                <Link href="/" className="text-sm font-medium hover:text-white text-gray-400 transition">Home</Link>
                <Link href="/about" className="text-sm font-medium hover:text-white text-gray-400 transition">About</Link>
                <Link href="/expo" className="text-sm font-medium hover:text-white text-gray-400 transition">EXPO</Link>
            </div>

            <button
                onClick={onLogin}
                className="px-5 py-2 glass rounded-full text-sm font-medium hover:bg-white/10 transition"
            >
                Connect Wallet
            </button>
        </nav >
    )
}

function FeatureCard({ icon, title, desc }: any) {
    return (
        <GlassCard className="flex flex-col items-center text-center gap-4 py-10">
            <div className="p-4 bg-white/5 rounded-full mb-2">
                {React.cloneElement(icon, { size: 32 })}
            </div>
            <h3 className="text-xl font-bold">{title}</h3>
            <p className="text-gray-400">{desc}</p>
        </GlassCard>
    )
}

