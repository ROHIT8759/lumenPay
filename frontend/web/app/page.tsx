'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import SplineViewer from '@/components/ui/SplineViewer';
import {
  Navbar,
  NavBody,
  NavItems,
  MobileNav,
  NavbarLogo,
  NavbarButton,
  MobileNavHeader,
  MobileNavToggle,
  MobileNavMenu,
} from '@/components/ui/resizable-navbar';
import {
    ArrowRight, Shield, Zap, Globe, Wallet, Lock, Code,
    Clock, Split, ShieldCheck, CheckCircle2, Key,
    Smartphone, FileText, Coins, TrendingUp, X, Check
} from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';
import LoginModal from '@/components/auth/LoginModal';

export default function LandingPage() {
    const [isLoginOpen, setIsLoginOpen] = useState(false);

    const navItems = [
      { name: 'Home', link: '#home' },
      { name: 'About', link: '#about' },
      { name: 'EXPO', link: '#expo' },
    ];

    return (
        <div className="min-h-screen text-white relative flex flex-col">
            {/* Resizable Navbar */}
            <Navbar>
              {/* Desktop Navigation */}
              <NavBody>
                <NavbarLogo />
                <NavItems items={navItems} />
                <div className="flex items-center gap-4">
                  <NavbarButton variant="primary" onClick={() => setIsLoginOpen(true)}>
                    Connect Wallet
                  </NavbarButton>
                </div>
              </NavBody>

              {/* Mobile Navigation */}
              <MobileNav>
                <MobileNavHeader>
                  <NavbarLogo />
                  <MobileNavToggle
                    isOpen={isLoginOpen}
                    onClick={() => setIsLoginOpen(!isLoginOpen)}
                  />
                </MobileNavHeader>

                <MobileNavMenu
                  isOpen={isLoginOpen}
                  onClose={() => setIsLoginOpen(false)}
                >
                  {navItems.map((item) => (
                    <a
                      key={item.link}
                      href={item.link}
                      onClick={() => setIsLoginOpen(false)}
                      className="block px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition"
                    >
                      {item.name}
                    </a>
                  ))}
                  <div className="flex w-full flex-col gap-4 px-4 pt-2">
                    <NavbarButton
                      onClick={() => setIsLoginOpen(false)}
                      variant="primary"
                      className="w-full"
                    >
                      Connect Wallet
                    </NavbarButton>
                  </div>
                </MobileNavMenu>
              </MobileNav>
            </Navbar>

            <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />

            <main className="flex-1 flex flex-col">
                {/* HERO SECTION */}
                <section
                    id="home"
                    className="relative w-full h-screen flex items-start justify-center overflow-hidden"
                >

                    {/* Spline viewer on top */}
                    <div className="absolute inset-0 w-full h-full">
                        <SplineViewer
                            scene="https://prod.spline.design/9KRw1tQcCuthQWLN/scene.splinecode"
                        />
                    </div>

                    {/* Seamless fade - opacity only, preserving colors */}
                    <div
                        className="absolute bottom-0 left-0 right-0 h-64 pointer-events-none"
                        style={{
                            opacity: 0.6,
                            background: 'linear-gradient(to bottom, transparent 0%, black 100%)',
                            filter: 'blur(60px)'
                        }}
                    />
                </section>

                {/* FEATURES SECTION */}
                <section
                    id="features"
                    className="py-32 px-4 md:px-20 relative"
                >
                    <div className="max-w-7xl mx-auto">
                        <div className="text-center mb-20">
                            <h2 className="text-5xl md:text-6xl font-bold mb-6 text-white">The Future of Payments</h2>
                            <p className="text-xl text-gray-400 max-w-3xl mx-auto">Built for speed, secured by design, and accessible to everyone, everywhere.</p>
                        </div>
                        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                            <FeatureCard
                                icon={<Zap className="text-yellow-400" />}
                                title="Lightning Fast"
                                desc="Transactions settle in 3-5 seconds on the Stellar Network."
                                isDark={true}
                            />
                            <FeatureCard
                                icon={<Shield className="text-green-400" />}
                                title="Bank-Grade Security"
                                desc="Your keys are encrypted with AES-256 standard."
                                isDark={true}
                            />
                            <FeatureCard
                                icon={<Globe className="text-blue-400" />}
                                title="Global Reach"
                                desc="Send money to anyone, anywhere, instantly."
                                isDark={true}
                            />
                        </div>
                    </div>
                </section>

                {/* WALLET = IDENTITY */}
                <section
                    className="py-20 px-4 md:px-20 relative"
                >
                    <div className="max-w-6xl mx-auto">
                        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 text-white">Wallet = Identity</h2>
                        <p className="text-gray-300 text-center mb-12 max-w-2xl mx-auto">
                            Your wallet is your identity. You own the keys, you control the funds.
                        </p>
                        <div className="grid md:grid-cols-2 gap-8">
                            <GlassCard isDark={true}>
                                <h3 className="text-xl font-bold mb-6 text-white">Non-Custodial Architecture</h3>
                                <div className="space-y-4">
                                    <CustodyPoint icon={<Key size={18} />} text="Private keys stored locally on your device" isDark={true} />
                                    <CustodyPoint icon={<ShieldCheck size={18} />} text="Backend cannot access or move your funds" isDark={true} />
                                    <CustodyPoint icon={<Smartphone size={18} />} text="All transactions signed on your device" isDark={true} />
                                    <CustodyPoint icon={<CheckCircle2 size={18} />} text="Stellar network is the source of truth" isDark={true} />
                                </div>
                            </GlassCard>
                            <GlassCard isDark={true} className="flex items-center justify-center">
                                <div className="text-center space-y-4">
                                    <div className="w-24 h-24 mx-auto bg-purple-500/20 rounded-2xl flex items-center justify-center border border-white/10">
                                        <Wallet size={48} className="text-white" />
                                    </div>
                                    <p className="text-sm text-gray-300 max-w-xs">
                                        LumenPay never holds your assets. Your wallet, your control, always.
                                    </p>
                                </div>
                            </GlassCard>
                        </div>
                    </div>
                </section>

                {/* HOW IT WORKS */}
                <section
                    className="py-20 px-4 md:px-20 relative"
                >
                    <div className="max-w-6xl mx-auto">
                        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">How LumenPay Works</h2>
                        <div className="grid md:grid-cols-4 gap-6">
                            <StepCard
                                number="01"
                                title="Create Wallet"
                                desc="Generate your LumenVault wallet in seconds"
                                isDark={true}
                            />
                            <StepCard
                                number="02"
                                title="Keys on Device"
                                desc="Private keys encrypted and stored locally"
                                isDark={true}
                            />
                            <StepCard
                                number="03"
                                title="UPI-Style Flow"
                                desc="Scan QR or enter address to pay"
                                isDark={true}
                            />
                            <StepCard
                                number="04"
                                title="Settles on Stellar"
                                desc="Transaction confirms in 3-5 seconds"
                                isDark={true}
                            />
                        </div>
                    </div>
                </section>

                {/* LUMENVAULT PRODUCT */}
                <section
                    className="py-20 px-4 md:px-20 relative"
                >
                    <div className="max-w-6xl mx-auto">
                        <div className="text-center mb-12">
                            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">LumenVault</h2>
                            <p className="text-gray-300 max-w-2xl mx-auto">
                                Embedded self-custody wallet with everything you need for secure payments.
                            </p>
                        </div>
                        <div className="grid md:grid-cols-3 gap-6">
                            <VaultFeature
                                icon={<Key className="text-purple-400" />}
                                title="Local Keys"
                                desc="Private keys never leave your device"
                                isDark={true}
                            />
                            <VaultFeature
                                icon={<Smartphone className="text-blue-400" />}
                                title="Embedded UI"
                                desc="Seamlessly integrated into LumenPay"
                                isDark={true}
                            />
                            <VaultFeature
                                icon={<FileText className="text-green-400" />}
                                title="Transaction History"
                                desc="Complete on-chain activity log"
                                isDark={true}
                            />
                            <VaultFeature
                                icon={<Coins className="text-yellow-400" />}
                                title="Asset Management"
                                desc="View and manage all Stellar assets"
                                isDark={true}
                            />
                            <VaultFeature
                                icon={<ShieldCheck className="text-red-400" />}
                                title="Secure Signing"
                                desc="Multi-layer transaction verification"
                                isDark={true}
                            />
                            <VaultFeature
                                icon={<Code className="text-pink-400" />}
                                title="Contract Interaction"
                                desc="Execute smart contract operations"
                                isDark={true}
                            />
                        </div>
                    </div>
                </section>

                {/* PROGRAMMABLE PAYMENTS */}
                <section
                    className="py-20 px-4 md:px-20 relative"
                >
                    <div className="max-w-6xl mx-auto">
                        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">Programmable Payments</h2>
                        <p className="text-gray-400 text-center mb-12 max-w-2xl mx-auto">
                            Beyond simple transfers. Use Soroban smart contracts for complex payment logic.
                        </p>
                        <div className="grid md:grid-cols-2 gap-6">
                            <ProgrammableCard
                                icon={<Lock className="text-purple-400" />}
                                title="Escrow"
                                desc="Lock funds until conditions are met"
                                example="Payment released when both parties approve"
                                isDark={true}
                            />
                            <ProgrammableCard
                                icon={<Split className="text-blue-400" />}
                                title="Split Payments"
                                desc="Automatically divide payments"
                                example="Revenue sharing across multiple wallets"
                                isDark={true}
                            />
                            <ProgrammableCard
                                icon={<Clock className="text-green-400" />}
                                title="Delayed Settlement"
                                desc="Schedule future payments"
                                example="Recurring subscriptions or salary payouts"
                                isDark={true}
                            />
                            <ProgrammableCard
                                icon={<CheckCircle2 className="text-yellow-400" />}
                                title="Conditional Transfers"
                                desc="Execute based on oracle data"
                                example="Release payment when delivery confirmed"
                                isDark={true}
                            />
                        </div>
                    </div>
                </section>

                {/* COMPARISON TABLE */}
                <section
                    className="py-20 px-4 md:px-20 relative"
                >
                    <div className="max-w-6xl mx-auto">
                        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-white">Why Choose LumenPay</h2>
                        <div className="bg-white/5 backdrop-blur-sm rounded-2xl overflow-hidden border border-white/10">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-white/10">
                                        <th className="text-left p-6 text-gray-300 font-medium">Feature</th>
                                        <th className="text-center p-6 font-bold text-white">LumenPay</th>
                                        <th className="text-center p-6 text-gray-300 font-medium">Traditional Apps</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <ComparisonRow feature="Custody" lumenPay="Non-custodial" traditional="Custodial" isDark={true} />
                                    <ComparisonRow feature="Settlement Time" lumenPay="3-5 seconds" traditional="1-3 business days" isDark={true} />
                                    <ComparisonRow feature="Fees" lumenPay="< $0.01" traditional="2-3%" isDark={true} />
                                    <ComparisonRow feature="Global Reach" lumenPay={true} traditional={false} isDark={true} />
                                    <ComparisonRow feature="Programmable" lumenPay={true} traditional={false} isDark={true} />
                                    <ComparisonRow feature="Transparency" lumenPay="Full on-chain" traditional="Limited" isDark={true} />
                                    <ComparisonRow feature="Downtime" lumenPay="Never (24/7)" traditional="Maintenance windows" isDark={true} />
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>

                {/* BUILT ON STELLAR */}
                <section
                    className="py-20 px-4 md:px-20 relative"
                >
                    <div className="max-w-4xl mx-auto">
                        <GlassCard isDark={true}>
                            <div className="flex flex-col md:flex-row items-center gap-8">
                                <div className="w-20 h-20 bg-purple-500/20 rounded-2xl flex items-center justify-center border border-white/10 shrink-0">
                                    <Globe size={40} className="text-white" />
                                </div>
                                <div className="flex-1 text-center md:text-left">
                                    <h3 className="text-2xl font-bold mb-3">Built on Stellar</h3>
                                    <p className="text-gray-400 mb-4">
                                        LumenPay is powered by the Stellar blockchain, a fast, scalable, and energy-efficient network designed for global payments.
                                    </p>
                                    <div className="flex flex-wrap gap-3 justify-center md:justify-start text-sm">
                                        <span className="px-3 py-1 bg-white/5 rounded-full border border-white/10">5-second finality</span>
                                        <span className="px-3 py-1 bg-white/5 rounded-full border border-white/10">Low energy consumption</span>
                                        <span className="px-3 py-1 bg-white/5 rounded-full border border-white/10">Battle-tested</span>
                                        <span className="px-3 py-1 bg-white/5 rounded-full border border-white/10">Soroban smart contracts</span>
                                    </div>
                                </div>
                            </div>
                        </GlassCard>
                    </div>
                </section>

                {/* FINAL CTA */}
                <section
                    className="py-32 px-4 md:px-20 relative"
                >
                    <div className="max-w-4xl mx-auto text-center">
                        <h2 className="text-4xl md:text-6xl font-bold mb-6 text-white">
                            Ready to Experience the Future?
                        </h2>
                        <p className="text-xl text-gray-300 mb-12 max-w-2xl mx-auto">
                            Join the next generation of payments. Fast, secure, and truly yours.
                        </p>
                        <div className="flex items-center justify-center gap-4 flex-wrap">
                            <button
                                onClick={() => setIsLoginOpen(true)}
                                className="px-8 py-4 bg-white text-black rounded-full font-bold text-lg hover:scale-105 transition-transform flex items-center gap-2"
                            >
                                Launch App <ArrowRight size={20} />
                            </button>
                            <Link
                                href="#"
                                className="px-8 py-4 bg-white/5 backdrop-blur-sm rounded-full font-bold text-lg text-white hover:bg-white/10 transition flex items-center gap-2 border border-white/10"
                            >
                                View Docs <ArrowRight size={20} />
                            </Link>
                        </div>
                    </div>
                </section>

            </main>


        </div>
    );
}

function FeatureCard({ icon, title, desc, isDark = true }: any) {
    return (
        <GlassCard className="flex flex-col items-center text-center gap-4 py-10" isDark={isDark}>
            <div className={`p-4 ${isDark ? 'bg-white/5' : 'bg-gray-900/5'} rounded-full mb-2`}>
                {React.cloneElement(icon, { size: 32 })}
            </div>
            <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{title}</h3>
            <p className={isDark ? 'text-gray-400' : 'text-gray-700'}>{desc}</p>
        </GlassCard>
    )
}

function CapabilityItem({ icon, label, sublabel, delay = 0 }: { icon: React.ReactNode; label: string; sublabel: string; delay?: number }) {
    return (
        <div
            className="group flex items-center gap-3 px-5 py-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-white/5"
            style={{ animationDelay: `${delay}s` }}
        >
            <div className="text-white/70 group-hover:text-white transition-colors">
                {icon}
            </div>
            <div className="flex flex-col">
                <div className="text-sm font-medium text-white">{label}</div>
                <div className="text-xs text-gray-400 group-hover:text-gray-300 transition-colors">{sublabel}</div>
            </div>
        </div>
    )
}

function CustodyPoint({ icon, text, isDark = true }: { icon: React.ReactNode; text: string; isDark?: boolean }) {
    return (
        <div className="flex items-start gap-3">
            <div className={`mt-0.5 ${isDark ? 'text-green-400' : 'text-green-600'}`}>{icon}</div>
            <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{text}</p>
        </div>
    )
}

function StepCard({ number, title, desc, isDark = true }: { number: string; title: string; desc: string; isDark?: boolean }) {
    return (
        <GlassCard className="text-center" isDark={isDark}>
            <div className={`text-5xl font-bold mb-4 ${isDark ? 'text-white/10' : 'text-gray-900/10'}`}>{number}</div>
            <h3 className={`text-lg font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>{title}</h3>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>{desc}</p>
        </GlassCard>
    )
}

function VaultFeature({ icon, title, desc, isDark = true }: { icon: React.ReactNode; title: string; desc: string; isDark?: boolean }) {
    return (
        <GlassCard isDark={isDark}>
            <div className="flex items-start gap-4">
                <div className={`p-3 ${isDark ? 'bg-white/5' : 'bg-gray-900/5'} rounded-lg shrink-0`}>
                    {icon}
                </div>
                <div>
                    <h3 className={`font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>{title}</h3>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>{desc}</p>
                </div>
            </div>
        </GlassCard>
    )
}

function ProgrammableCard({ icon, title, desc, example, isDark = true }: { icon: React.ReactNode; title: string; desc: string; example: string; isDark?: boolean }) {
    return (
        <GlassCard isDark={isDark}>
            <div className="flex items-start gap-4 mb-4">
                <div className={`p-3 ${isDark ? 'bg-white/5' : 'bg-gray-900/5'} rounded-lg shrink-0`}>
                    {icon}
                </div>
                <div>
                    <h3 className={`font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>{title}</h3>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>{desc}</p>
                </div>
            </div>
            <div className="pl-16">
                <div className={`text-xs font-medium mb-1 ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>Example:</div>
                <div className={`text-sm italic ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{example}</div>
            </div>
        </GlassCard>
    )
}

function ComparisonRow({ feature, lumenPay, traditional, isDark = true }: { feature: string; lumenPay: string | boolean; traditional: string | boolean; isDark?: boolean }) {
    return (
        <tr className={`border-b last:border-0 ${isDark ? 'border-white/5' : 'border-gray-900/5'}`}>
            <td className={`p-6 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{feature}</td>
            <td className="p-6 text-center">
                {typeof lumenPay === 'boolean' ? (
                    lumenPay ? <Check className={`inline ${isDark ? 'text-green-400' : 'text-green-600'}`} size={20} /> : <X className={`inline ${isDark ? 'text-red-400' : 'text-red-600'}`} size={20} />
                ) : (
                    <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{lumenPay}</span>
                )}
            </td>
            <td className={`p-6 text-center ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                {typeof traditional === 'boolean' ? (
                    traditional ? <Check className={`inline ${isDark ? 'text-green-400' : 'text-green-600'}`} size={20} /> : <X className={`inline ${isDark ? 'text-gray-500' : 'text-gray-600'}`} size={20} />
                ) : (
                    traditional
                )}
            </td>
        </tr>
    )
}


