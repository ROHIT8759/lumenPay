'use client';



import React, { useState } from 'react';
import { useWallet } from './WalletProvider';
import { Wallet, Send, QrCode, History, LogOut, Copy, Check, Code } from 'lucide-react';
import { SendPayment } from './SendPayment';
import { SmartContractInterface } from './SmartContractInterface';

import { TransactionHistory } from './TransactionHistory';


type Tab = 'home' | 'send' | 'receive' | 'history' | 'contracts';

export function WalletDashboard() {
    const { publicKey, balances, lockWallet, network, switchNetwork } = useWallet();
    const [activeTab, setActiveTab] = useState<Tab>('home');
    const [copied, setCopied] = useState(false);

    const copyAddress = () => {
        if (publicKey) {
            navigator.clipboard.writeText(publicKey);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const truncateAddress = (addr: string) => {
        return `${addr.slice(0, 6)}...${addr.slice(-6)}`;
    };

    
    if (activeTab === 'home') {
        return (
            <div className="p-6 space-y-6">
                {}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
                            L
                        </div>
                        <span className="font-bold text-lg">LumenVault</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <select
                            value={network}
                            onChange={(e) => switchNetwork(e.target.value as any)}
                            className="bg-gray-100 dark:bg-gray-800 text-xs rounded-full px-3 py-1 outline-none border-none"
                        >
                            <option value="testnet">Testnet</option>
                            <option value="public">Mainnet</option>
                        </select>
                        <button onClick={lockWallet} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                            <LogOut size={18} />
                        </button>
                    </div>
                </div>

                {}
                <div className="bg-blue-600 rounded-2xl p-6 text-white shadow-xl">
                    <p className="text-blue-100 text-sm font-medium">Total Balance</p>
                    <div className="flex items-baseline gap-1 mt-1">
                        <h1 className="text-4xl font-bold">{parseFloat(balances.native).toFixed(2)}</h1>
                        <span className="text-lg opacity-80">XLM</span>
                    </div>
                    {parseFloat(balances.usdc) > 0 && (
                        <p className="text-sm mt-1 opacity-90">{parseFloat(balances.usdc).toFixed(2)} USDC</p>
                    )}

                    <div className="mt-6 flex items-center justify-between bg-white/10 rounded-lg p-2.5 backdrop-blur-sm">
                        <span className="font-mono text-xs opacity-90 truncate max-w-[180px]">
                            {publicKey ? truncateAddress(publicKey) : ''}
                        </span>
                        <button onClick={copyAddress} className="p-1.5 hover:bg-white/20 rounded transition">
                            {copied ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                    </div>
                </div>

                {}
                <div className="grid grid-cols-4 gap-3">
                    <ActionButton icon={<Send />} label="Send" onClick={() => setActiveTab('send')} />
                    <ActionButton icon={<QrCode />} label="Receive" onClick={() => setActiveTab('receive')} />
                    <ActionButton icon={<History />} label="History" onClick={() => setActiveTab('history')} />
                    <ActionButton icon={<Code />} label="Contract" onClick={() => setActiveTab('contracts')} />
                </div>

                {}
                <div className="space-y-3">
                    <h3 className="font-semibold text-gray-500 text-sm uppercase tracking-wider">Assets</h3>
                    <AssetItem code="XLM" name="Stellar Lumens" amount={parseFloat(balances.native)} icon="linear-gradient(135deg, #000, #333)" />
                    {parseFloat(balances.usdc) > 0 && (
                        <AssetItem code="USDC" name="USD Coin" amount={parseFloat(balances.usdc)} icon="#2775CA" />
                    )}
                    {}
                    {balances.assets.map((asset: any, idx: number) => (
                        <AssetItem key={idx} code={asset.code} name="Custom Asset" amount={parseFloat(asset.balance)} />
                    ))}
                </div>
            </div>
        );
    }

    
    if (activeTab === 'send') {
        return <SendPayment onBack={() => setActiveTab('home')} />;
    }

    if (activeTab === 'contracts') {
        return <SmartContractInterface onBack={() => setActiveTab('home')} />;
    }

    if (activeTab === 'receive') {
        return (
            <div className="p-6 h-full flex flex-col">
                <button onClick={() => setActiveTab('home')} className="mb-6 text-sm font-medium text-gray-500 hover:text-gray-900 dark:hover:text-white">
                    ← Back
                </button>
                <div className="flex-1 flex flex-col items-center justify-center space-y-6 text-center">
                    <h2 className="text-xl font-bold">Receive Assets</h2>
                    <div className="bg-white p-4 rounded-xl shadow-lg">
                        {}
                        <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${publicKey}`}
                            alt="Wallet QR"
                            className="w-48 h-48"
                        />
                    </div>
                    <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg break-all font-mono text-sm max-w-xs">
                        {publicKey}
                    </div>
                    <button
                        onClick={copyAddress}
                        className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        {copied ? <Check size={16} /> : <Copy size={16} />}
                        {copied ? 'Copied' : 'Copy Address'}
                    </button>
                    <p className="text-xs text-gray-500 max-w-xs">
                        Send only Stellar (XLM) or Stellar-based assets to this address.
                    </p>
                </div>
            </div>
        );
    }

    if (activeTab === 'history') {
        return (
            <div className="p-6 h-full flex flex-col">
                <button onClick={() => setActiveTab('home')} className="mb-6 text-sm font-medium text-gray-500 hover:text-gray-900 dark:hover:text-white">
                    ← Back
                </button>
                <h2 className="text-xl font-bold mb-4">History</h2>
                <div className="flex-1 overflow-y-auto pr-1">
                    <TransactionHistory />
                </div>
            </div>
        );
    }

    return null;
}


function ActionButton({ icon, label, onClick }: { icon: any, label: string, onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className="flex flex-col items-center justify-center py-4 bg-gray-50 dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-colors gap-2 group"
        >
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                {icon}
            </div>
            <span className="text-sm font-medium">{label}</span>
        </button>
    );
}

function AssetItem({ code, name, amount, icon }: { code: string, name: string, amount: number, icon?: string }) {
    return (
        <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 hover:shadow-sm transition-shadow">
            <div className="flex items-center gap-3">
                <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-xs"
                    style={{ background: icon || 'gray' }}
                >
                    {code[0]}
                </div>
                <div>
                    <h4 className="font-bold">{code}</h4>
                    <p className="text-xs text-gray-500">{name}</p>
                </div>
            </div>
            <div className="text-right">
                <p className="font-bold">{amount.toFixed(4)}</p>
                {}
                {}
            </div>
        </div>
    );
}
