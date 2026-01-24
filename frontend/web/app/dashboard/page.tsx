'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Scan, Send, Banknote, TrendingUp, ChevronRight, Gift, Percent, ShieldCheck, FileText, Briefcase, Users, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';
import ContractInteraction from '@/components/dashboard/ContractInteraction';
import Link from 'next/link';
import {
  QRScannerModal,
  PayIdModal,
  BankPayoutModal,
  CryptoTradingModal,
  ActionBtn,
} from '@/components/quick-actions/QuickActionsModals';

interface Person {
  id: string;
  address: string;
  shortAddress: string;
  name: string;
  payId: string | null;
  avatarUrl: string | null;
  lastTransactionAt: string;
  direction: 'sent' | 'received';
  lastAmount: number;
  assetCode: string;
}

// Animation variants
const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

export default function Home() {
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showPayIdModal, setShowPayIdModal] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [showCryptoModal, setShowCryptoModal] = useState(false);
  const [people, setPeople] = useState<Person[]>([]);
  const [peopleLoading, setPeopleLoading] = useState(true);

  useEffect(() => {
    fetchPeople();
  }, []);

  const fetchPeople = async () => {
    try {
      setPeopleLoading(true);
      const userId = localStorage.getItem('userId');
      if (!userId) {
        setPeopleLoading(false);
        return;
      }

      const response = await fetch('/api/people?limit=7', {
        headers: { 'x-user-id': userId },
      });

      if (response.ok) {
        const data = await response.json();
        setPeople(data.people || []);
      }
    } catch (err) {
      console.error('Error fetching people:', err);
    } finally {
      setPeopleLoading(false);
    }
  };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-md sm:max-w-2xl lg:max-w-4xl xl:max-w-6xl space-y-4 sm:space-y-6"
    >
      {/* 1. Quick Actions */}
      <motion.section variants={item}>
        <h2 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">Quick Actions</h2>
        <div className="grid grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          <ActionBtn
            icon={<Scan />}
            label="Scan QR"
            color="text-blue-400"
            onClick={() => setShowQRScanner(true)}
          />
          <ActionBtn
            icon={<Send />}
            label="Pay ID"
            color="text-green-400"
            onClick={() => setShowPayIdModal(true)}
          />
          <ActionBtn
            icon={<Banknote />}
            label="To Bank"
            color="text-purple-400"
            onClick={() => setShowBankModal(true)}
          />
          <ActionBtn
            icon={<TrendingUp />}
            label="Stocks"
            color="text-orange-400"
            onClick={() => setShowCryptoModal(true)}
          />
        </div>
      </motion.section>

      {/* 2. People */}
      <motion.section variants={item}>
        <div className="flex justify-between items-end mb-3">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">People</h2>
          <Link href="/people" className="text-xs text-blue-400 hover:text-blue-300">View All</Link>
        </div>

        {/* Loading State */}
        {peopleLoading && (
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i} className="flex flex-col items-center gap-2 min-w-[60px] animate-pulse">
                <div className="w-14 h-14 rounded-full bg-gray-800" />
                <div className="w-12 h-3 rounded bg-gray-800" />
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!peopleLoading && people.length === 0 && (
          <GlassCard className="p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-800 to-black border border-white/10 flex items-center justify-center mx-auto mb-3">
              <Users className="text-gray-600" size={20} />
            </div>
            <p className="text-gray-400 text-sm mb-1">No contacts yet</p>
            <p className="text-gray-600 text-xs">Send or receive money to see people here</p>
          </GlassCard>
        )}

        {/* People List */}
        {!peopleLoading && people.length > 0 && (
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
            {people.map((person) => (
              <Link
                key={person.id}
                href={`/people/${encodeURIComponent(person.address)}`}
                className="flex flex-col items-center gap-2 min-w-[60px] group"
              >
                <div className="relative">
                  {person.avatarUrl ? (
                    <img
                      src={person.avatarUrl}
                      alt={person.name}
                      className="w-14 h-14 rounded-full object-cover border border-white/10 group-hover:border-blue-500/50 transition-colors"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10 group-hover:border-blue-500/50 transition-colors flex items-center justify-center">
                      <span className="text-sm font-bold text-blue-400">
                        {person.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  {/* Direction indicator */}
                  <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center ${person.direction === 'sent'
                    ? 'bg-red-500/30 text-red-400'
                    : 'bg-green-500/30 text-green-400'
                    }`}>
                    {person.direction === 'sent'
                      ? <ArrowUpRight size={10} />
                      : <ArrowDownLeft size={10} />
                    }
                  </div>
                </div>
                <span className="text-xs text-gray-400 truncate w-full text-center group-hover:text-white transition-colors">
                  {person.name.split(' ')[0]}
                </span>
              </Link>
            ))}
          </div>
        )}
      </motion.section>

      {/* 3. Billing & Retail */}
      <motion.section variants={item}>
        <div className="flex justify-between items-end mb-3">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Billing & Retail</h2>
          <Link href="/billing" className="text-xs text-blue-400 hover:text-blue-300">View All</Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          <Link href="/billing/loans">
            <GlassCard className="flex flex-col items-center justify-center gap-2 py-6" hoverEffect>
              <Banknote className="text-purple-400" size={24} />
              <span className="text-sm font-medium">Loans</span>
            </GlassCard>
          </Link>
          <Link href="/billing">
            <GlassCard className="flex flex-col items-center justify-center gap-2 py-6" hoverEffect>
              <ShieldCheck className="text-cyan-400" size={24} />
              <span className="text-sm font-medium">RWA Assets</span>
            </GlassCard>
          </Link>
          <Link href="/billing/portfolio">
            <GlassCard className="flex flex-col items-center justify-center gap-2 py-6" hoverEffect>
              <TrendingUp className="text-green-400" size={24} />
              <span className="text-sm font-medium">Portfolio</span>
            </GlassCard>
          </Link>
          <Link href="/billing/kyc">
            <GlassCard className="flex flex-col items-center justify-center gap-2 py-6" hoverEffect>
              <FileText className="text-amber-400" size={24} />
              <span className="text-sm font-medium">KYC</span>
            </GlassCard>
          </Link>
        </div>
      </motion.section>

      {/* 4. Offers & Rewards */}
      <motion.section variants={item} className="grid grid-cols-2 gap-3">
        <GlassCard className="relative overflow-hidden group" hoverEffect>
          <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition">
            <Gift size={60} />
          </div>
          <div className="flex flex-col gap-1">
            <Gift className="text-purple-400 mb-2" />
            <h3 className="font-bold">Rewards</h3>
            <p className="text-xs text-gray-400">Scratch cards & more</p>
          </div>
        </GlassCard>
        <GlassCard className="relative overflow-hidden group" hoverEffect>
          <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition">
            <Percent size={60} />
          </div>
          <div className="flex flex-col gap-1">
            <Percent className="text-green-400 mb-2" />
            <h3 className="font-bold">Offers</h3>
            <p className="text-xs text-gray-400">Cashback deals</p>
          </div>
        </GlassCard>
        <GlassCard className="col-span-2 flex items-center justify-between" hoverEffect>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
              <Users size={20} />
            </div>
            <div>
              <h3 className="font-bold text-sm">Refer & Earn</h3>
              <p className="text-xs text-gray-400">Invite friends to Steller</p>
            </div>
          </div>
          <ChevronRight size={16} className="text-gray-500" />
        </GlassCard>
      </motion.section>

      {/* 5. Smart Contract Integration */}
      <motion.section variants={item}>
        <h2 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">Smart Contract</h2>
        <ContractInteraction />
      </motion.section>

      {/* 6. Transactions CTA */}
      <motion.section variants={item}>
        <Link href="/transactions">
          <GlassCard className="flex items-center justify-between" hoverEffect>
            <div className="flex items-center gap-4">
              <div className="p-2 bg-white/5 rounded-full">
                <FileText size={20} />
              </div>
              <div className="flex flex-col">
                <span className="font-bold">See all transactions</span>
                <span className="text-xs text-gray-400">Track your spending</span>
              </div>
            </div>
            <ChevronRight className="text-gray-500" />
          </GlassCard>
        </Link>
      </motion.section>

      {/* 6. Balance Card */}
      <motion.section variants={item} className="pb-8">
        <GlassCard className="bg-gradient-to-br from-blue-900/40 to-black border-blue-500/20">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-sm text-gray-300 mb-1">Total Balance</h2>
              <div className="text-3xl font-bold font-mono tracking-tight">$12,450.00 <span className="text-sm text-gray-500 font-sans">USDC</span></div>
            </div>
            <div className="p-2 bg-blue-500 rounded-lg">
              <Banknote className="text-white" size={20} />
            </div>
          </div>
          <div className="flex gap-2">
            <button className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition-colors">Add Money</button>
            <button className="flex-1 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors">Withdraw</button>
          </div>
        </GlassCard>
      </motion.section>

      {/* Modals */}
      <QRScannerModal isOpen={showQRScanner} onClose={() => setShowQRScanner(false)} />
      <PayIdModal isOpen={showPayIdModal} onClose={() => setShowPayIdModal(false)} />
      <BankPayoutModal isOpen={showBankModal} onClose={() => setShowBankModal(false)} />
      <CryptoTradingModal isOpen={showCryptoModal} onClose={() => setShowCryptoModal(false)} />
    </motion.div>
  );
}
