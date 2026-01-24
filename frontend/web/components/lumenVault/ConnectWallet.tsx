'use client';



import React, { useState } from 'react';
import { useWallet } from './WalletProvider';
import { Loader2, Wallet } from 'lucide-react';

export function ConnectWallet() {
    const {
        isInitialized,
        hasWallet,
        isUnlocked,
        signInWithWallet,
        isAuthenticating
    } = useWallet();

    const [showPassPrompt, setShowPassPrompt] = useState(false);
    const [passphrase, setPassphrase] = useState('');
    const [error, setError] = useState<string | null>(null);

    if (!isInitialized) return null;

    const handleConnect = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!passphrase) return;

        setError(null);
        const result = await signInWithWallet(passphrase);

        if (result.success) {
            setShowPassPrompt(false);
            setPassphrase('');
        } else {
            setError(result.error || 'Authentication failed');
        }
    };

    if (hasWallet && isUnlocked) {
        return (
            <button className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-full font-medium text-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                Wallet Connected
            </button>
        );
    }

    if (showPassPrompt) {
        return (
            <div className="relative">
                <form onSubmit={handleConnect} className="flex items-center gap-2 bg-white dark:bg-gray-800 p-1.5 rounded-full border border-gray-200 dark:border-gray-700 shadow-lg animate-in fade-in zoom-in duration-200">
                    <input
                        type="password"
                        value={passphrase}
                        onChange={(e) => setPassphrase(e.target.value)}
                        placeholder="Wallet Password"
                        className="pl-3 pr-2 py-1.5 bg-transparent outline-none text-sm w-32"
                        autoFocus
                    />
                    <button
                        type="submit"
                        disabled={isAuthenticating}
                        className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-1.5 transition-colors disabled:opacity-50"
                    >
                        {isAuthenticating ? <Loader2 size={16} className="animate-spin" /> : <Wallet size={16} />}
                    </button>
                </form>
                {error && (
                    <div className="absolute top-full mt-2 left-0 w-full text-xs text-red-500 bg-red-50 p-2 rounded text-center">
                        {error}
                    </div>
                )}
            </div>
        );
    }

    return (
        <button
            onClick={() => hasWallet ? setShowPassPrompt(true) : alert('Please create a wallet first!')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-medium text-sm transition-all hover:scale-105 shadow-lg shadow-blue-500/20"
        >
            <Wallet size={16} />
            {hasWallet ? 'Connect Wallet' : 'Create Wallet'}
        </button>
    );
}
