'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Shield, Zap, Globe, Smartphone, CreditCard, Users, QrCode, Wallet, TrendingUp, Menu, X } from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';
import StarfieldBackground from '@/components/ui/StarfieldBackground';
import LoginModal from '@/components/auth/LoginModal';

// Animation variants
const fadeInUp = {
    initial: { opacity: 0, y: 30 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6 }
};

const staggerContainer = {
    animate: {
        transition: {
            staggerChildren: 0.1
        }
    }
};

export default function LandingPage() {
    const [isLoginOpen, setIsLoginOpen] = useState(false);

    return (
        <div className="min-h-screen text-white relative flex flex-col overflow-x-hidden">
            {/* Navbar handled inside here for state simplicity */}
            <LandingNavbar onLogin={() => setIsLoginOpen(true)} />

            <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />

            <main className="flex-1 flex flex-col">
                {/* HERO SECTION */}
                <section id="home" className="min-h-[90vh] sm:min-h-screen flex flex-col items-center justify-center text-center px-4 sm:px-6 lg:px-8 py-16 sm:py-20 relative z-10">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                        className="max-w-4xl space-y-4 sm:space-y-6"
                    >
                        {/* Badge */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.2 }}
                            className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-white/5 border border-white/10 text-xs sm:text-sm text-gray-300"
                        >
                            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                            Powered by Stellar Network
                        </motion.div>

                        <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-gray-200 to-gray-500 leading-tight">
                            The Future of
                            <br className="hidden sm:block" />
                            <span className="text-gradient-primary"> Payments</span> is Here.
                        </h1>
                        <p className="text-base sm:text-lg md:text-xl text-gray-400 max-w-2xl mx-auto px-4">
                            LumenPay brings the speed of crypto with the simplicity of UPI.
                            Scan, Pay, and Earn in seconds.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 pt-6 sm:pt-8 px-4">
                            <button
                                onClick={() => setIsLoginOpen(true)}
                                className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-white text-black rounded-full font-bold text-base sm:text-lg hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-white/20"
                            >
                                Launch App <ArrowRight size={20} />
                            </button>
                            <Link
                                href="/about"
                                className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-white/5 border border-white/10 text-white rounded-full font-medium text-base sm:text-lg hover:bg-white/10 transition-all duration-300 flex items-center justify-center gap-2"
                            >
                                Learn More
                            </Link>
                        </div>

                        {/* Stats */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5, duration: 0.6 }}
                            className="grid grid-cols-3 gap-4 sm:gap-8 pt-8 sm:pt-12 max-w-lg mx-auto"
                        >
                            <div className="text-center">
                                <div className="text-xl sm:text-2xl md:text-3xl font-bold text-white">3-5s</div>
                                <div className="text-xs sm:text-sm text-gray-500">Settlement</div>
                            </div>
                            <div className="text-center border-x border-white/10">
                                <div className="text-xl sm:text-2xl md:text-3xl font-bold text-white">$0.001</div>
                                <div className="text-xs sm:text-sm text-gray-500">Per Transaction</div>
                            </div>
                            <div className="text-center">
                                <div className="text-xl sm:text-2xl md:text-3xl font-bold text-white">24/7</div>
                                <div className="text-xs sm:text-sm text-gray-500">Available</div>
                            </div>
                        </motion.div>
                    </motion.div>
                </section>

                {/* FEATURES SECTION */}
                <section id="features" className="py-16 sm:py-20 lg:py-24 px-4 sm:px-6 lg:px-20 relative z-10">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                        className="text-center mb-10 sm:mb-16"
                    >
                        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4">Why Choose LumenPay?</h2>
                        <p className="text-gray-400 max-w-2xl mx-auto text-sm sm:text-base px-4">
                            Experience the next generation of digital payments with cutting-edge technology
                        </p>
                    </motion.div>
                    <motion.div
                        variants={staggerContainer}
                        initial="initial"
                        whileInView="animate"
                        viewport={{ once: true }}
                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 max-w-6xl mx-auto"
                    >
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
                        <FeatureCard
                            icon={<QrCode className="text-purple-400" />}
                            title="QR Payments"
                            desc="Scan and pay instantly with our smart QR system."
                        />
                        <FeatureCard
                            icon={<Wallet className="text-pink-400" />}
                            title="Multi-Asset Support"
                            desc="Hold and transfer multiple currencies in one wallet."
                        />
                        <FeatureCard
                            icon={<TrendingUp className="text-cyan-400" />}
                            title="Real-time Tracking"
                            desc="Monitor all your transactions in real-time."
                        />
                    </motion.div>
                </section>

                {/* HOW IT WORKS SECTION */}
                <section className="py-16 sm:py-20 lg:py-24 px-4 sm:px-6 lg:px-20 relative z-10">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-center mb-10 sm:mb-16"
                    >
                        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4">How It Works</h2>
                        <p className="text-gray-400 max-w-2xl mx-auto text-sm sm:text-base px-4">
                            Get started in three simple steps
                        </p>
                    </motion.div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 max-w-5xl mx-auto">
                        <StepCard
                            number="01"
                            title="Create Wallet"
                            desc="Set up your secure wallet in seconds with just a passphrase"
                            icon={<Wallet className="text-blue-400" size={28} />}
                        />
                        <StepCard
                            number="02"
                            title="Add Funds"
                            desc="Deposit crypto or receive payments from anyone globally"
                            icon={<CreditCard className="text-green-400" size={28} />}
                        />
                        <StepCard
                            number="03"
                            title="Start Paying"
                            desc="Scan QR codes or use Pay ID to send money instantly"
                            icon={<Smartphone className="text-purple-400" size={28} />}
                        />
                    </div>
                </section>

                {/* CTA SECTION */}
                <section className="py-16 sm:py-20 lg:py-24 px-4 sm:px-6 relative z-10">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        className="max-w-4xl mx-auto"
                    >
                        <div className="glass-card bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10 rounded-2xl sm:rounded-3xl p-6 sm:p-10 lg:p-16 text-center border border-white/10">
                            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4">
                                Ready to Get Started?
                            </h2>
                            <p className="text-gray-400 mb-6 sm:mb-8 max-w-xl mx-auto text-sm sm:text-base">
                                Join thousands of users who are already experiencing the future of payments.
                            </p>
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
                                <button
                                    onClick={() => setIsLoginOpen(true)}
                                    className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-white text-black rounded-full font-bold hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2"
                                >
                                    Create Free Account <ArrowRight size={20} />
                                </button>
                                <Link
                                    href="/expo"
                                    className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 glass rounded-full font-medium hover:bg-white/10 transition-all duration-300 text-center"
                                >
                                    View Demo
                                </Link>
                            </div>
                        </div>
                    </motion.div>
                </section>


            </main>


        </div>
    );
}

function LandingNavbar({ onLogin }: { onLogin: () => void }) {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    return (
        <>
            <nav className="fixed top-0 inset-x-0 z-50 h-16 sm:h-20 flex items-center justify-between px-4 sm:px-8 bg-black/70 backdrop-blur-xl border-b border-white/5">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-xs sm:text-sm">LP</span>
                    </div>
                    <span className="font-bold text-lg sm:text-xl tracking-wider">LumenPay</span>
                </div>

                {/* Desktop Navigation */}
                <div className="hidden md:flex items-center gap-8">
                    <Link href="/" className="text-sm font-medium hover:text-white text-gray-400 transition">Home</Link>
                    <Link href="/about" className="text-sm font-medium hover:text-white text-gray-400 transition">About</Link>
                    <Link href="/expo" className="text-sm font-medium hover:text-white text-gray-400 transition">Demo</Link>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={onLogin}
                        className="hidden sm:flex px-4 sm:px-6 py-2 sm:py-2.5 bg-white text-black rounded-full text-sm font-semibold hover:scale-105 transition-all duration-300"
                    >
                        Connect Wallet
                    </button>

                    {/* Mobile Menu Button */}
                    <button
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className="md:hidden p-2 rounded-lg hover:bg-white/10 transition-colors"
                    >
                        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>
            </nav>

            {/* Mobile Menu Overlay */}
            {isMobileMenuOpen && (
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="fixed top-16 inset-x-0 z-40 bg-black/95 backdrop-blur-xl border-b border-white/10 md:hidden"
                >
                    <div className="px-4 py-6 space-y-4">
                        <Link
                            href="/"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="block py-3 px-4 text-lg font-medium hover:bg-white/5 rounded-xl transition"
                        >
                            Home
                        </Link>
                        <Link
                            href="/about"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="block py-3 px-4 text-lg font-medium hover:bg-white/5 rounded-xl transition"
                        >
                            About
                        </Link>
                        <Link
                            href="/expo"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="block py-3 px-4 text-lg font-medium hover:bg-white/5 rounded-xl transition"
                        >
                            Demo
                        </Link>
                        <div className="pt-4 border-t border-white/10">
                            <button
                                onClick={() => {
                                    setIsMobileMenuOpen(false);
                                    onLogin();
                                }}
                                className="w-full py-3 bg-white text-black rounded-full font-semibold text-lg hover:bg-gray-100 transition"
                            >
                                Connect Wallet
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}
        </>
    );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactElement; title: string; desc: string }) {
    return (
        <motion.div variants={fadeInUp}>
            <GlassCard className="flex flex-col items-center text-center gap-3 sm:gap-4 p-6 sm:p-8 lg:py-10 h-full">
                <div className="p-3 sm:p-4 bg-white/5 rounded-full">
                    {React.cloneElement(icon, { size: 28 })}
                </div>
                <h3 className="text-lg sm:text-xl font-bold">{title}</h3>
                <p className="text-gray-400 text-sm sm:text-base">{desc}</p>
            </GlassCard>
        </motion.div>
    );
}

function StepCard({ number, title, desc, icon }: { number: string; title: string; desc: string; icon: React.ReactElement }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative"
        >
            <GlassCard className="p-6 sm:p-8 text-center h-full">
                <div className="absolute -top-3 -right-3 sm:-top-4 sm:-right-4 w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center font-bold text-sm sm:text-base">
                    {number}
                </div>
                <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-4 bg-white/5 rounded-full flex items-center justify-center">
                    {icon}
                </div>
                <h3 className="text-lg sm:text-xl font-bold mb-2">{title}</h3>
                <p className="text-gray-400 text-sm sm:text-base">{desc}</p>
            </GlassCard>
        </motion.div>
    );
}

