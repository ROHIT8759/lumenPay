'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Zap, Globe, Lock, CreditCard, Smartphone } from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';

export default function AboutPage() {
    return (
        <div className="min-h-screen text-white pt-20 px-6 md:px-20 pb-20">
            <div className="max-w-6xl mx-auto space-y-20">

                { }
                <section className="text-center space-y-6">
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-4xl md:text-6xl font-bold text-white"
                    >
                        About LumenPay
                    </motion.h1>
                    <p className="text-xl text-gray-400 max-w-3xl mx-auto">
                        We are bridging the gap between the complex world of Web3 and the simplicity of everyday payments.
                    </p>
                </section>

                { }
                <section className="grid md:grid-cols-2 gap-12 items-center">
                    <div className="space-y-6">
                        <h2 className="text-3xl font-bold">Our Mission</h2>
                        <p className="text-gray-400 leading-relaxed text-lg">
                            Blockchain technology promises financial freedom, but it remains inaccessible to most due to complex wallets, confusing addresses, and slow transactions.
                        </p>
                        <p className="text-gray-400 leading-relaxed text-lg">
                            **LumenPay** changes that. We leverage the speed and low cost of the Stellar Network to create a payment experience that feels as simple as using UPI or Apple Pay, but with the power of self-custody crypto.
                        </p>
                    </div>
                    <div className="bg-white/5 rounded-2xl p-8 border border-white/10 backdrop-blur-sm">
                        <h3 className="text-xl font-bold mb-4">Why Stellar?</h3>
                        <ul className="space-y-4">
                            <li className="flex items-center gap-3">
                                <Zap className="text-yellow-400" size={24} />
                                <span>3-5 second transaction finality</span>
                            </li>
                            <li className="flex items-center gap-3">
                                <CreditCard className="text-green-400" size={24} />
                                <span>Fraction of a cent transaction fees</span>
                            </li>
                            <li className="flex items-center gap-3">
                                <Globe className="text-blue-400" size={24} />
                                <span>Built for cross-border payments</span>
                            </li>
                        </ul>
                    </div>
                </section>

                { }
                <section>
                    <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
                    <div className="grid md:grid-cols-3 gap-8">
                        <StepCard
                            step="01"
                            title="Connect Wallet"
                            desc="Log in securely using your favorite Stellar wallet like Freighter or Albedo."
                        />
                        <StepCard
                            step="02"
                            title="Scan QR"
                            desc="Scan any LumenPay QR code from a merchant or friend."
                        />
                        <StepCard
                            step="03"
                            title="Instant Pay"
                            desc="Confirm the amount and pay. The funds settle instantly."
                        />
                    </div>
                </section>

                { }
                <section>
                    <h2 className="text-3xl font-bold text-center mb-12">Key Features</h2>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <FeatureDetails
                            icon={<Zap />}
                            title="Lightning Settlements"
                            desc="No more waiting days for transfers. Payments clear in seconds."
                        />
                        <FeatureDetails
                            icon={<Lock />}
                            title="Non-Custodial"
                            desc="We never hold your funds. You have full control of your private keys."
                        />
                        <FeatureDetails
                            icon={<Shield />}
                            title="Bank-Grade Security"
                            desc="Audited smart contracts and AES-256 encryption keep you safe."
                        />
                        <FeatureDetails
                            icon={<Smartphone />}
                            title="Mobile First"
                            desc="Designed for the phone in your pocket, not just the desktop."
                        />
                        <FeatureDetails
                            icon={<Globe />}
                            title="Borderless"
                            desc="Send USDC or XLM to anyone in the world without exchange fees."
                        />
                        <FeatureDetails
                            icon={<CreditCard />}
                            title="Merchant Friendly"
                            desc="Easy integration for shops to accept crypto payments."
                        />
                    </div>
                </section>

            </div>
        </div>
    );
}

function StepCard({ step, title, desc }: { step: string, title: string, desc: string }) {
    return (
        <GlassCard className="p-8 relative overflow-hidden group hover:bg-white/10 transition-colors">
            <span className="text-6xl font-black text-white/5 absolute -top-4 -right-4 transition-transform group-hover:scale-110">{step}</span>
            <h3 className="text-xl font-bold mb-3 relative z-10">{title}</h3>
            <p className="text-gray-400 relative z-10">{desc}</p>
        </GlassCard>
    );
}

function FeatureDetails({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
    return (
        <div className="p-6 rounded-xl bg-white/5 border border-white/5 hover:border-white/20 transition-all">
            <div className="text-blue-400 mb-4">{React.cloneElement(icon as React.ReactElement, { size: 32 })}</div>
            <h3 className="text-lg font-bold mb-2">{title}</h3>
            <p className="text-sm text-gray-400">{desc}</p>
        </div>
    )
}
