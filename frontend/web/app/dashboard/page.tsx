'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Scan, Send, Banknote, TrendingUp, ChevronRight, Gift, Percent, ShieldCheck, FileText, Briefcase, Users, ArrowUpRight, ArrowDownLeft, Copy, Check, QrCode, X, AlertCircle, Loader } from 'lucide-react';
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
import { useLumenVault } from '@/hooks/useLumenVault';
import { fetchAccountByAddress, StellarNetwork } from '@/lib/horizonService';

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

interface Balance {
  asset: string;
  balance: string;
  usdValue: number;
}

export default function Home() {
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showPayIdModal, setShowPayIdModal] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [showCryptoModal, setShowCryptoModal] = useState(false);
  const [showAddMoneyModal, setShowAddMoneyModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [people, setPeople] = useState<Person[]>([]);
  const [peopleLoading, setPeopleLoading] = useState(true);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [totalUsdBalance, setTotalUsdBalance] = useState(0);
  const [balanceLoading, setBalanceLoading] = useState(true);
  const [balance, setBalance] = useState<any>(null);

  // Wallet state from LumenVault
  const [walletState] = useLumenVault();
  const { publicKey, isLocked } = walletState;

  useEffect(() => {
    fetchData();
  }, []);

  // Fetch balance when wallet is connected
  useEffect(() => {
    if (publicKey && !isLocked) {
      fetchBalance();
    }
  }, [publicKey, isLocked]);

  const fetchBalance = async () => {
    if (!publicKey) return;

    setBalanceLoading(true);
    try {
      const account = await fetchAccountByAddress(publicKey, 'testnet');

      // Map balances with USD estimates
      const mappedBalances: Balance[] = account.balances.map(bal => {
        let usdValue = 0;
        const balanceNum = parseFloat(bal.balance);

        // Estimate USD values (in production, use real price feeds)
        if (bal.asset_type === 'native') {
          usdValue = balanceNum * 0.12; // XLM price estimate
        } else if (bal.asset_code === 'USDC') {
          usdValue = balanceNum * 1.0;
        } else if (bal.asset_code === 'USDT') {
          usdValue = balanceNum * 1.0;
        } else {
          usdValue = balanceNum * 0.01; // Default for unknown assets
        }

        return {
          asset: bal.asset_type === 'native' ? 'XLM' : (bal.asset_code || 'Unknown'),
          balance: bal.balance,
          usdValue,
        };
      });

      setBalances(mappedBalances);
      setTotalUsdBalance(mappedBalances.reduce((sum, b) => sum + b.usdValue, 0));
    } catch (err) {
      console.error('Failed to fetch balance:', err);
      // Account might not exist yet (not funded)
      setBalances([{ asset: 'XLM', balance: '0', usdValue: 0 }]);
      setTotalUsdBalance(0);
    } finally {
      setBalanceLoading(false);
    }
  };

  const fetchData = async () => {
    try {
      const userId = localStorage.getItem('userId');
      if (!userId) {
        setPeopleLoading(false);
        setBalanceLoading(false);
        return;
      }

      // Fetch People
      fetch('/api/people?limit=7', {
        headers: { 'x-user-id': userId },
      })
        .then(res => res.json())
        .then(data => setPeople(data.people || []))
        .catch(err => console.error('Error fetching people:', err))
        .finally(() => setPeopleLoading(false));

      // Fetch Wallet & Balance
      const walletRes = await fetch('/api/wallet', {
        headers: { 'x-user-id': userId },
      });

      if (walletRes.ok) {
        const walletData = await walletRes.json();
        if (walletData.publicKey) {
          const balanceRes = await fetch(`/api/wallet/balance?publicKey=${walletData.publicKey}`);
          if (balanceRes.ok) {
            const balanceData = await balanceRes.json();
            setBalance(balanceData);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setBalanceLoading(false);
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
        <h2 className="text-xs sm:text-sm font-semibold text-gray-400 mb-2 sm:mb-3 uppercase tracking-wider">Quick Actions</h2>
        <div className="grid grid-cols-4 gap-2 sm:gap-3 lg:gap-6">
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

      {/* 2. Balance Card */}
      <motion.section variants={item}>
        <GlassCard className="bg-linear-to-br from-blue-900/40 to-black border-blue-500/20">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-sm text-gray-300 mb-1">Total Balance</h2>
              {balanceLoading ? (
                <div className="h-10 w-40 bg-gray-800 animate-pulse rounded" />
              ) : (
                <div className="text-3xl font-bold font-mono tracking-tight">
                  {parseFloat(balance?.usdc || '0').toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  <span className="text-sm text-gray-500 font-sans ml-2">USDC</span>
                </div>
              )}
              {!balanceLoading && (
                <div className="text-xs text-gray-400 mt-1">
                  + {parseFloat(balance?.native || '0').toFixed(2)} XLM
                </div>
              )}
            </div>
            <div className="p-2 bg-blue-500 rounded-lg">
              <Banknote className="text-white" size={20} />
            </div>
          </div>
          <div className="flex gap-2">
            <Link href="/on-ramp" className="flex-1">
              <button className="w-full py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition-colors">Add Money</button>
            </Link>
            <Link href="/off-ramp" className="flex-1">
              <button className="w-full py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors">Withdraw</button>
            </Link>
          </div>
        </GlassCard>
      </motion.section>

      {/* 3. People */}
      <motion.section variants={item}>
        <div className="flex justify-between items-end mb-2 sm:mb-3">
          <h2 className="text-xs sm:text-sm font-semibold text-gray-400 uppercase tracking-wider">People</h2>
          <Link href="/people" className="text-xs text-blue-400 hover:text-blue-300">View All</Link>
        </div>

        {/* Loading State */}
        {peopleLoading && (
          <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i} className="flex flex-col items-center gap-2 min-w-[56px] sm:min-w-[60px] animate-pulse">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gray-800" />
                <div className="w-10 sm:w-12 h-2.5 sm:h-3 rounded bg-gray-800" />
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!peopleLoading && people.length === 0 && (
          <GlassCard className="p-4 sm:p-6 text-center">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-gray-800 to-black border border-white/10 flex items-center justify-center mx-auto mb-2 sm:mb-3">
              <Users className="text-gray-600" size={18} />
            </div>
            <p className="text-gray-400 text-xs sm:text-sm mb-1">No contacts yet</p>
            <p className="text-gray-600 text-[10px] sm:text-xs">Send or receive money to see people here</p>
          </GlassCard>
        )}

        {/* People List */}
        {!peopleLoading && people.length > 0 && (
          <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4">
            {people.map((person) => (
              <Link
                key={person.id}
                href={`/people/${encodeURIComponent(person.address)}`}
                className="flex flex-col items-center gap-1.5 sm:gap-2 min-w-[56px] sm:min-w-[60px] group"
              >
                <div className="relative">
                  {person.avatarUrl ? (
                    <img
                      src={person.avatarUrl}
                      alt={person.name}
                      className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover border border-white/10 group-hover:border-blue-500/50 transition-colors"
                    />
                  ) : (
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10 group-hover:border-blue-500/50 transition-colors flex items-center justify-center">
                      <span className="text-xs sm:text-sm font-bold text-blue-400">
                        {person.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  {/* Direction indicator */}
                  <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full flex items-center justify-center ${person.direction === 'sent'
                    ? 'bg-red-500/30 text-red-400'
                    : 'bg-green-500/30 text-green-400'
                    }`}>
                    {person.direction === 'sent'
                      ? <ArrowUpRight size={8} />
                      : <ArrowDownLeft size={8} />
                    }
                  </div>
                </div>
                <span className="text-[10px] sm:text-xs text-gray-400 truncate w-full text-center group-hover:text-white transition-colors">
                  {person.name.split(' ')[0]}
                </span>
              </Link>
            ))}
          </div>
        )}
      </motion.section>

      {/* 4. Billing & Retail */}
      <motion.section variants={item}>
        <div className="flex justify-between items-end mb-2 sm:mb-3">
          <h2 className="text-xs sm:text-sm font-semibold text-gray-400 uppercase tracking-wider">Billing & Retail</h2>
          <Link href="/billing" className="text-xs text-blue-400 hover:text-blue-300">View All</Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
          <Link href="/billing/loans">
            <GlassCard className="flex flex-col items-center justify-center gap-1.5 sm:gap-2 py-4 sm:py-6" hoverEffect>
              <Banknote className="text-purple-400" size={20} />
              <span className="text-xs sm:text-sm font-medium">Loans</span>
            </GlassCard>
          </Link>
          <Link href="/billing">
            <GlassCard className="flex flex-col items-center justify-center gap-1.5 sm:gap-2 py-4 sm:py-6" hoverEffect>
              <ShieldCheck className="text-cyan-400" size={20} />
              <span className="text-xs sm:text-sm font-medium">RWA Assets</span>
            </GlassCard>
          </Link>
          <Link href="/billing/portfolio">
            <GlassCard className="flex flex-col items-center justify-center gap-1.5 sm:gap-2 py-4 sm:py-6" hoverEffect>
              <TrendingUp className="text-green-400" size={20} />
              <span className="text-xs sm:text-sm font-medium">Portfolio</span>
            </GlassCard>
          </Link>
          <Link href="/billing/kyc">
            <GlassCard className="flex flex-col items-center justify-center gap-1.5 sm:gap-2 py-4 sm:py-6" hoverEffect>
              <FileText className="text-amber-400" size={20} />
              <span className="text-xs sm:text-sm font-medium">KYC</span>
            </GlassCard>
          </Link>
        </div>
      </motion.section>

      {/* 4. Offers & Rewards */}
      <motion.section variants={item} className="grid grid-cols-2 gap-3">
        <GlassCard className="relative overflow-hidden group" hoverEffect>
          <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition">
            <Gift size={48} />
          </div>
          <div className="flex flex-col gap-0.5 sm:gap-1">
            <Gift className="text-purple-400 mb-1 sm:mb-2" size={20} />
            <h3 className="font-bold text-sm sm:text-base">Rewards</h3>
            <p className="text-[10px] sm:text-xs text-gray-400">Scratch cards & more</p>
          </div>
        </GlassCard>
        <GlassCard className="relative overflow-hidden group" hoverEffect>
          <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition">
            <Percent size={48} />
          </div>
          <div className="flex flex-col gap-0.5 sm:gap-1">
            <Percent className="text-green-400 mb-1 sm:mb-2" size={20} />
            <h3 className="font-bold text-sm sm:text-base">Offers</h3>
            <p className="text-[10px] sm:text-xs text-gray-400">Cashback deals</p>
          </div>
        </GlassCard>
        <GlassCard className="col-span-2 flex items-center justify-between" hoverEffect>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-blue-500/20 rounded-lg text-blue-400">
              <Users size={18} />
            </div>
            <div>
              <h3 className="font-bold text-xs sm:text-sm">Refer & Earn</h3>
              <p className="text-[10px] sm:text-xs text-gray-400">Invite friends to Steller</p>
            </div>
          </div>
          <ChevronRight size={16} className="text-gray-500" />
        </GlassCard>
      </motion.section>

      {/* 6. Smart Contract Integration */}
      <motion.section variants={item}>
        <h2 className="text-xs sm:text-sm font-semibold text-gray-400 mb-2 sm:mb-3 uppercase tracking-wider">Smart Contract</h2>
        <ContractInteraction />
      </motion.section>

      {/* 7. Transactions CTA */}
      <motion.section variants={item}>
        <Link href="/transactions">
          <GlassCard className="flex items-center justify-between" hoverEffect>
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="p-1.5 sm:p-2 bg-white/5 rounded-full">
                <FileText size={18} />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-sm sm:text-base">See all transactions</span>
                <span className="text-[10px] sm:text-xs text-gray-400">Track your spending</span>
              </div>
            </div>
            <ChevronRight className="text-gray-500" size={18} />
          </GlassCard>
        </Link>
      </motion.section>

      {/* 6. Balance Card */}
      <motion.section variants={item} className="pb-8">
        <GlassCard className="bg-linear-to-br from-blue-900/40 to-black border-blue-500/20">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-xs sm:text-sm text-gray-300 mb-0.5 sm:mb-1">Total Balance</h2>
              <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight">$12,450.00 <span className="text-[10px] sm:text-sm text-gray-500 font-sans">USDC</span></div>
            </div>
            <div className="p-2 bg-blue-500 rounded-lg">
              <Banknote className="text-white" size={20} />
            </div>
          </div>
          {/* Balance breakdown */}
          {publicKey && !isLocked && balances.length > 0 && (
            <div className="mb-3 space-y-1 max-h-20 overflow-y-auto">
              {balances.map((bal, idx) => (
                <div key={idx} className="flex justify-between text-xs text-gray-400">
                  <span>{bal.asset}</span>
                  <span className="font-mono">{parseFloat(bal.balance).toLocaleString(undefined, { maximumFractionDigits: 4 })}</span>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <button className="flex-1 py-2 sm:py-2.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs sm:text-sm font-medium transition-colors active:scale-95">Add Money</button>
            <button className="flex-1 py-2 sm:py-2.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs sm:text-sm font-medium transition-colors active:scale-95">Withdraw</button>
          </div>
        </GlassCard>
      </motion.section>

      {/* Modals */}
      <QRScannerModal isOpen={showQRScanner} onClose={() => setShowQRScanner(false)} />
      <PayIdModal isOpen={showPayIdModal} onClose={() => setShowPayIdModal(false)} />
      <BankPayoutModal isOpen={showBankModal} onClose={() => setShowBankModal(false)} />
      <CryptoTradingModal isOpen={showCryptoModal} onClose={() => setShowCryptoModal(false)} />

      {/* Add Money Modal */}
      <AddMoneyModal
        isOpen={showAddMoneyModal}
        onClose={() => setShowAddMoneyModal(false)}
        publicKey={publicKey}
        onSuccess={fetchBalance}
      />

      {/* Withdraw Modal */}
      <WithdrawModal
        isOpen={showWithdrawModal}
        onClose={() => setShowWithdrawModal(false)}
        publicKey={publicKey}
        balances={balances}
        onSuccess={fetchBalance}
      />
    </motion.div>
  );
}

// Add Money Modal Component
function AddMoneyModal({
  isOpen,
  onClose,
  publicKey,
  onSuccess
}: {
  isOpen: boolean;
  onClose: () => void;
  publicKey: string | null;
  onSuccess: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [fundingTestnet, setFundingTestnet] = useState(false);
  const [fundingResult, setFundingResult] = useState<{ success: boolean; message: string } | null>(null);

  const copyAddress = () => {
    if (publicKey) {
      navigator.clipboard.writeText(publicKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const fundWithFriendbot = async () => {
    if (!publicKey) return;

    setFundingTestnet(true);
    setFundingResult(null);

    try {
      const response = await fetch(`https://friendbot.stellar.org?addr=${publicKey}`);
      if (response.ok) {
        setFundingResult({ success: true, message: 'Successfully funded with 10,000 XLM (testnet)!' });
        onSuccess();
      } else {
        throw new Error('Funding failed');
      }
    } catch (err: any) {
      setFundingResult({
        success: false,
        message: err.message?.includes('createAccountAlreadyExist')
          ? 'Account already funded. You can only use Friendbot once per account.'
          : 'Failed to fund account. Please try again.'
      });
    } finally {
      setFundingTestnet(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <GlassCard className="max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Add Money</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {publicKey ? (
          <div className="space-y-4">
            {/* QR Code Section */}
            <div className="bg-white rounded-xl p-4 flex justify-center">
              <div className="text-center">
                <div className="w-40 h-40 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <QrCode size={120} className="text-gray-800" />
                </div>
                <p className="text-gray-600 text-xs">Scan to deposit</p>
              </div>
            </div>

            {/* Address Display */}
            <div className="bg-white/5 rounded-lg p-3">
              <label className="text-xs text-gray-400 mb-1 block">Your Stellar Address</label>
              <div className="flex items-center gap-2">
                <code className="text-xs flex-1 font-mono break-all text-gray-300">
                  {publicKey}
                </code>
                <button
                  onClick={copyAddress}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                </button>
              </div>
            </div>

            {/* Testnet Faucet */}
            <div className="border-t border-white/10 pt-4">
              <p className="text-xs text-gray-400 mb-2">Testing on Testnet?</p>
              <button
                onClick={fundWithFriendbot}
                disabled={fundingTestnet}
                className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-800 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                {fundingTestnet ? (
                  <>
                    <Loader size={16} className="animate-spin" />
                    Funding...
                  </>
                ) : (
                  <>
                    <Gift size={16} />
                    Get Free 10,000 XLM (Testnet)
                  </>
                )}
              </button>

              {fundingResult && (
                <div className={`mt-2 p-2 rounded-lg text-xs flex items-center gap-2 ${fundingResult.success ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                  }`}>
                  {fundingResult.success ? <Check size={14} /> : <AlertCircle size={14} />}
                  {fundingResult.message}
                </div>
              )}
            </div>

            {/* Instructions */}
            <div className="text-xs text-gray-500 space-y-1">
              <p>• Send XLM or supported tokens to this address</p>
              <p>• Minimum first deposit: 1 XLM (to activate account)</p>
              <p>• Network: Stellar Testnet</p>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <AlertCircle size={48} className="mx-auto mb-4 text-yellow-400" />
            <p className="text-gray-400">Please connect and unlock your wallet first</p>
          </div>
        )}
      </GlassCard>
    </div>
  );
}

// Withdraw Modal Component
function WithdrawModal({
  isOpen,
  onClose,
  publicKey,
  balances,
  onSuccess
}: {
  isOpen: boolean;
  onClose: () => void;
  publicKey: string | null;
  balances: Balance[];
  onSuccess: () => void;
}) {
  const [destination, setDestination] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedAsset, setSelectedAsset] = useState('XLM');
  const [memo, setMemo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const selectedBalance = balances.find(b => b.asset === selectedAsset);
  const maxAmount = selectedBalance ? parseFloat(selectedBalance.balance) : 0;

  const handleWithdraw = async () => {
    if (!publicKey || !destination || !amount) {
      setError('Please fill in all required fields');
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (amountNum > maxAmount) {
      setError('Insufficient balance');
      return;
    }

    // Validate Stellar address format
    if (!destination.startsWith('G') || destination.length !== 56) {
      setError('Invalid Stellar address format');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // This would integrate with your signing engine and transaction service
      const response = await fetch('/api/transactions/build-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: publicKey,
          destination,
          amount: amountNum.toString(),
          asset: selectedAsset,
          memo,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create transaction');
      }

      // In production, you'd sign and submit the transaction here
      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
        setSuccess(false);
        setDestination('');
        setAmount('');
        setMemo('');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Withdrawal failed');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <GlassCard className="max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Withdraw</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {success ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check size={32} className="text-green-400" />
            </div>
            <h3 className="text-lg font-bold mb-2">Withdrawal Initiated!</h3>
            <p className="text-gray-400 text-sm">Your transaction is being processed</p>
          </div>
        ) : publicKey ? (
          <div className="space-y-4">
            {/* Asset Selection */}
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Asset</label>
              <select
                value={selectedAsset}
                onChange={(e) => setSelectedAsset(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-blue-500"
              >
                {balances.map((bal) => (
                  <option key={bal.asset} value={bal.asset} className="bg-gray-900">
                    {bal.asset} ({parseFloat(bal.balance).toFixed(4)} available)
                  </option>
                ))}
              </select>
            </div>

            {/* Destination Address */}
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Destination Address</label>
              <input
                type="text"
                placeholder="G..."
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Amount */}
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Amount</label>
              <div className="relative">
                <input
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  max={maxAmount}
                  step="any"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 pr-16"
                />
                <button
                  onClick={() => setAmount((maxAmount - 0.0001).toFixed(7))}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-blue-400 hover:text-blue-300"
                >
                  MAX
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Available: {maxAmount.toFixed(4)} {selectedAsset}
              </p>
            </div>

            {/* Memo (Optional) */}
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Memo (Optional)</label>
              <input
                type="text"
                placeholder="Transaction memo"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-500/20 border border-red-500 rounded-lg p-3 flex gap-2 text-sm text-red-400">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              onClick={handleWithdraw}
              disabled={loading || !destination || !amount}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader size={18} className="animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Send size={18} />
                  Withdraw {selectedAsset}
                </>
              )}
            </button>

            {/* Fee Notice */}
            <p className="text-xs text-gray-500 text-center">
              Network fee: ~0.00001 XLM
            </p>
          </div>
        ) : (
          <div className="text-center py-8">
            <AlertCircle size={48} className="mx-auto mb-4 text-yellow-400" />
            <p className="text-gray-400">Please connect and unlock your wallet first</p>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
