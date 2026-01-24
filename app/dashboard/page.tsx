'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, Radio, Activity, Wallet, ChevronRight, RefreshCw, Server } from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';
import TransactionList from '@/components/transactions/TransactionList';
import { Transaction } from '@/components/transactions/TransactionDetail';
import { useWallet } from '@/hooks/useWallet';

export default function Dashboard() {
  const { address } = useWallet();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  
  useEffect(() => {
    const fetchTx = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ limit: '10' });
        const response = await fetch(`/api/transactions?${params}`, {
          headers: { 'x-user-id': address || 'demo-user' }
        });
        if (response.ok) {
          const data = await response.json();
          setTransactions(data.transactions || []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchTx();

    
    const interval = setInterval(fetchTx, 10000);
    return () => clearInterval(interval);
  }, [address]);

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex flex-col gap-6">

        {}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">LumenPay Dashboard</h1>
            <p className="text-accent flex items-center gap-2 mt-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-accent"></span>
              </span>
              Live Network View
            </p>
          </div>
          <div className="flex gap-3">
            <button className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm font-mono text-gray-400 flex items-center gap-2">
              <Server size={14} />
              Stellar Testnet
            </button>
          </div>
        </div>

        {}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">

          {}
          <div className="lg:col-span-1 space-y-6">
            <GlassCard className="p-6 bg-surface/50 border-white/10">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-primary/20 rounded-xl text-accent">
                  <Wallet size={24} />
                </div>
                <h2 className="text-xl font-bold text-white">Wallet Info</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Total Balance</p>
                  <div className="text-4xl font-mono font-bold text-white">
                    $12,340.50
                    <span className="text-lg text-gray-500 ml-2">USDC</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/5">
                  <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">Network Status</p>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-gray-300">TPS</span>
                    <span className="font-mono text-success">1,240</span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-gray-300">Ledger</span>
                    <span className="font-mono text-accent">#4928301</span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-gray-300">Avg Cost</span>
                    <span className="font-mono text-white">0.00001 XLM</span>
                  </div>
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-6 bg-gradient-to-br from-primary/30 to-surface/50 border-accent/20">
              <div className="flex items-center gap-3 mb-4">
                <Shield className="text-accent" size={20} />
                <h3 className="font-bold text-white">Judge Mode Active</h3>
              </div>
              <p className="text-sm text-gray-400 mb-4">
                You are viewing the transparency layer. Transactions here are settled directly on-chain.
              </p>
              <a href="/admin" className="text-sm text-accent hover:underline flex items-center gap-1">
                Open Admin Console <ChevronRight size={14} />
              </a>
            </GlassCard>
          </div>

          {}
          <div className="lg:col-span-2">
            <GlassCard className="h-full min-h-[500px] flex flex-col p-0 overflow-hidden bg-surface/30">
              <div className="p-6 border-b border-white/5 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <Activity className="text-gray-400" size={20} />
                  <h2 className="text-xl font-bold text-white">Live Transactions</h2>
                </div>
                <button onClick={() => window.location.reload()} className="p-2 hover:bg-white/5 rounded-full">
                  <RefreshCw size={16} className="text-gray-500" />
                </button>
              </div>

              <div className="flex-1 overflow-auto p-4">
                {loading ? (
                  <div className="flex items-center justify-center h-40">
                    <span className="animate-spin h-6 w-6 border-2 border-accent border-t-transparent rounded-full"></span>
                  </div>
                ) : (
                  <TransactionList
                    transactions={transactions}
                    loading={false}
                    onTransactionClick={(t) => console.log(t)} 
                  />
                )}
              </div>
            </GlassCard>
          </div>

        </div>
      </div>
    </div>
  );
}
