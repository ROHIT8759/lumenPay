'use client';



import React from 'react';
import { WalletProvider, useWallet } from './WalletProvider';
import { CreateWallet } from './CreateWallet';
import { ImportWallet } from './ImportWallet';
import { UnlockWallet } from './UnlockWallet';
import { WalletDashboard } from './WalletDashboard';
import { Loader2 } from 'lucide-react';

export function LumenVaultWallet() {
    return (
        <WalletProvider>
            <WalletContainer />
        </WalletProvider>
    );
}

function WalletContainer() {
    const { isInitialized, hasWallet, isUnlocked } = useWallet();
    const [view, setView] = React.useState<'onboarding' | 'create' | 'import'>('onboarding');

    
    if (!isInitialized) {
        return (
            <div className="flex items-center justify-center h-[500px] w-full bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    
    if (hasWallet && isUnlocked) {
        return (
            <div className="w-full h-full min-h-[500px] bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-xl">
                <WalletDashboard />
            </div>
        );
    }

    
    if (hasWallet && !isUnlocked) {
        return (
            <div className="w-full h-full min-h-[500px] bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-xl">
                <UnlockWallet />
            </div>
        );
    }

    
    if (view === 'create') {
        return (
            <div className="w-full h-full min-h-[500px] bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-xl">
                <button
                    onClick={() => setView('onboarding')}
                    className="absolute top-4 left-4 p-2 text-gray-500 hover:text-gray-900 z-10"
                >
                    ← Back
                </button>
                <CreateWallet />
            </div>
        );
    }

    if (view === 'import') {
        return (
            <div className="w-full h-full min-h-[500px] bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-xl">
                <button
                    onClick={() => setView('onboarding')}
                    className="absolute top-4 left-4 p-2 text-gray-500 hover:text-gray-900 z-10"
                >
                    ← Back
                </button>
                <ImportWallet />
            </div>
        );
    }

    
    return (
        <div className="w-full h-full min-h-[500px] bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-xl p-8 flex flex-col items-center justify-center text-center space-y-8">

            <div className="space-y-2">
                <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-blue-500/30">
                    <span className="text-3xl font-bold text-white">L</span>
                </div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">LumenVault</h1>
                <p className="text-gray-500 max-w-xs mx-auto">
                    The non-custodial embedded wallet for the Stellar ecosystem.
                </p>
            </div>

            <div className="w-full max-w-xs space-y-3">
                <button
                    onClick={() => setView('create')}
                    className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.02]"
                >
                    Create New Wallet
                </button>
                <button
                    onClick={() => setView('import')}
                    className="w-full py-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-750 transition-all"
                >
                    I have a secret key
                </button>
            </div>

        </div>
    );
}
