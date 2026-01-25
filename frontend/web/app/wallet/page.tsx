






'use client';

import { useState } from 'react';
import { useLumenVault } from '@/hooks/useLumenVault';
import { Wallet, Key, Shield, Loader2, Eye, EyeOff, ArrowRight, CheckCircle, AlertCircle } from 'lucide-react';

type Mode = 'select' | 'create' | 'import' | 'unlock';

export default function WalletConnectPage() {
    const [state, actions] = useLumenVault();
    const [mode, setMode] = useState<Mode>('select');
    const [passphrase, setPassphrase] = useState('');
    const [confirmPassphrase, setConfirmPassphrase] = useState('');
    const [secretKey, setSecretKey] = useState('');
    const [showPassphrase, setShowPassphrase] = useState(false);
    const [localError, setLocalError] = useState('');

    
    const handleCreate = async () => {
        setLocalError('');

        if (passphrase.length < 6) {
            setLocalError('Passphrase must be at least 6 characters');
            return;
        }

        if (passphrase !== confirmPassphrase) {
            setLocalError('Passphrases do not match');
            return;
        }

        const result = await actions.createWallet(passphrase);
        if (result) {
            
            await actions.signIn(passphrase);
        }
    };

    
    const handleImport = async () => {
        setLocalError('');

        if (!secretKey.startsWith('S') || secretKey.length !== 56) {
            setLocalError('Invalid secret key format');
            return;
        }

        if (passphrase.length < 6) {
            setLocalError('Passphrase must be at least 6 characters');
            return;
        }

        const result = await actions.importWallet(secretKey, passphrase);
        if (result) {
            await actions.signIn(passphrase);
        }
    };

    
    const handleUnlock = async () => {
        setLocalError('');
        const success = await actions.signIn(passphrase);
        if (!success) {
            setLocalError('Incorrect passphrase');
        }
    };

    
    if (state.isAuthenticated && state.publicKey) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
                <div className="max-w-md w-full">
                    <div className="bg-gray-800/50 backdrop-blur-xl rounded-3xl p-8 border border-gray-700/50">
                        {}
                        <div className="text-center mb-8">
                            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle className="w-10 h-10 text-green-500" />
                            </div>
                            <h1 className="text-2xl font-bold text-white mb-2">Connected!</h1>
                            <p className="text-gray-400">Your LumenVault is ready</p>
                        </div>

                        {}
                        <div className="bg-gray-900/50 rounded-xl p-4 mb-6">
                            <div className="text-xs text-gray-500 mb-1">Public Key</div>
                            <div className="font-mono text-sm text-white break-all">
                                {state.publicKey}
                            </div>
                        </div>

                        {}
                        <div className="space-y-3">
                            <a
                                href="/dashboard"
                                className="w-full flex items-center justify-center gap-2 bg-cyan-500 hover:from-cyan-400 hover:to-blue-400 text-white font-bold py-4 px-6 rounded-xl transition-all"
                            >
                                Go to Dashboard
                                <ArrowRight className="w-5 h-5" />
                            </a>

                            <button
                                onClick={actions.signOut}
                                className="w-full text-gray-400 hover:text-white py-3 transition-colors"
                            >
                                Sign Out
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    
    if (state.publicKey && state.isLocked && !state.isAuthenticated) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
                <div className="max-w-md w-full">
                    <div className="bg-gray-800/50 backdrop-blur-xl rounded-3xl p-8 border border-gray-700/50">
                        {}
                        <div className="text-center mb-8">
                            <div className="w-20 h-20 bg-cyan-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Shield className="w-10 h-10 text-cyan-500" />
                            </div>
                            <h1 className="text-2xl font-bold text-white mb-2">Unlock Wallet</h1>
                            <p className="text-gray-400">Enter your passphrase to continue</p>
                        </div>

                        {}
                        <div className="bg-gray-900/50 rounded-xl p-3 mb-6">
                            <div className="text-xs text-gray-500 mb-1">Wallet</div>
                            <div className="font-mono text-xs text-gray-400 truncate">
                                {state.publicKey}
                            </div>
                        </div>

                        {}
                        <div className="space-y-4">
                            <div>
                                <div className="relative">
                                    <input
                                        type={showPassphrase ? 'text' : 'password'}
                                        value={passphrase}
                                        onChange={(e) => setPassphrase(e.target.value)}
                                        placeholder="Enter passphrase"
                                        className="w-full bg-gray-900/50 border border-gray-700 rounded-xl px-4 py-4 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                                        onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassphrase(!showPassphrase)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                                    >
                                        {showPassphrase ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>

                            {(localError || state.error) && (
                                <div className="flex items-center gap-2 text-red-400 text-sm">
                                    <AlertCircle className="w-4 h-4" />
                                    {localError || state.error}
                                </div>
                            )}

                            <button
                                onClick={handleUnlock}
                                disabled={state.isAuthenticating}
                                className="w-full flex items-center justify-center gap-2 bg-cyan-500 hover:from-cyan-400 hover:to-blue-400 disabled:opacity-50 text-white font-bold py-4 px-6 rounded-xl transition-all"
                            >
                                {state.isAuthenticating ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        Unlock
                                        <ArrowRight className="w-5 h-5" />
                                    </>
                                )}
                            </button>
                        </div>

                        <div className="text-center mt-6">
                            <button
                                onClick={() => actions.deleteWallet()}
                                className="text-red-400 hover:text-red-300 text-sm"
                            >
                                Use different wallet
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    
    if (mode === 'select') {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
                <div className="max-w-md w-full">
                    <div className="bg-gray-800/50 backdrop-blur-xl rounded-3xl p-8 border border-gray-700/50">
                        {}
                        <div className="text-center mb-8">
                            <div className="w-20 h-20 bg-cyan-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Wallet className="w-10 h-10 text-cyan-500" />
                            </div>
                            <h1 className="text-2xl font-bold text-white mb-2">LumenVault</h1>
                            <p className="text-gray-400">Your keys, your coins</p>
                        </div>

                        {}
                        <div className="space-y-4">
                            <button
                                onClick={() => setMode('create')}
                                className="w-full flex items-center gap-4 bg-gray-900/50 hover:bg-gray-900/70 border border-gray-700/50 hover:border-cyan-500/50 rounded-xl p-4 transition-all group"
                            >
                                <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-xl flex items-center justify-center">
                                    <Wallet className="w-6 h-6 text-white" />
                                </div>
                                <div className="text-left flex-1">
                                    <div className="font-bold text-white">Create New Wallet</div>
                                    <div className="text-sm text-gray-400">Generate a new Stellar keypair</div>
                                </div>
                                <ArrowRight className="w-5 h-5 text-gray-600 group-hover:text-cyan-500 transition-colors" />
                            </button>

                            <button
                                onClick={() => setMode('import')}
                                className="w-full flex items-center gap-4 bg-gray-900/50 hover:bg-gray-900/70 border border-gray-700/50 hover:border-gray-600 rounded-xl p-4 transition-all group"
                            >
                                <div className="w-12 h-12 bg-gray-700 rounded-xl flex items-center justify-center">
                                    <Key className="w-6 h-6 text-white" />
                                </div>
                                <div className="text-left flex-1">
                                    <div className="font-bold text-white">Import Existing</div>
                                    <div className="text-sm text-gray-400">Use your secret key</div>
                                </div>
                                <ArrowRight className="w-5 h-5 text-gray-600 group-hover:text-white transition-colors" />
                            </button>
                        </div>

                        {}
                        <div className="mt-8 p-4 bg-gray-900/30 rounded-xl border border-gray-700/30">
                            <div className="flex items-start gap-3">
                                <Shield className="w-5 h-5 text-green-500 mt-0.5" />
                                <div className="text-sm text-gray-400">
                                    Your private key is encrypted and stored only on this device.
                                    We never have access to your funds.
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    
    if (mode === 'create') {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
                <div className="max-w-md w-full">
                    <div className="bg-gray-800/50 backdrop-blur-xl rounded-3xl p-8 border border-gray-700/50">
                        <button
                            onClick={() => { setMode('select'); setLocalError(''); }}
                            className="text-gray-400 hover:text-white mb-6"
                        >
                            ← Back
                        </button>

                        <div className="text-center mb-8">
                            <h1 className="text-2xl font-bold text-white mb-2">Create Wallet</h1>
                            <p className="text-gray-400">Choose a passphrase to encrypt your wallet</p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-sm text-gray-400 mb-2 block">Passphrase</label>
                                <div className="relative">
                                    <input
                                        type={showPassphrase ? 'text' : 'password'}
                                        value={passphrase}
                                        onChange={(e) => setPassphrase(e.target.value)}
                                        placeholder="At least 6 characters"
                                        className="w-full bg-gray-900/50 border border-gray-700 rounded-xl px-4 py-4 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassphrase(!showPassphrase)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                                    >
                                        {showPassphrase ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="text-sm text-gray-400 mb-2 block">Confirm Passphrase</label>
                                <input
                                    type={showPassphrase ? 'text' : 'password'}
                                    value={confirmPassphrase}
                                    onChange={(e) => setConfirmPassphrase(e.target.value)}
                                    placeholder="Repeat passphrase"
                                    className="w-full bg-gray-900/50 border border-gray-700 rounded-xl px-4 py-4 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                                />
                            </div>

                            {(localError || state.error) && (
                                <div className="flex items-center gap-2 text-red-400 text-sm">
                                    <AlertCircle className="w-4 h-4" />
                                    {localError || state.error}
                                </div>
                            )}

                            <button
                                onClick={handleCreate}
                                disabled={state.isCreating}
                                className="w-full flex items-center justify-center gap-2 bg-cyan-500 hover:from-cyan-400 hover:to-blue-400 disabled:opacity-50 text-white font-bold py-4 px-6 rounded-xl transition-all"
                            >
                                {state.isCreating ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        Create Wallet
                                        <ArrowRight className="w-5 h-5" />
                                    </>
                                )}
                            </button>
                        </div>

                        <div className="mt-6 p-4 bg-yellow-500/10 rounded-xl border border-yellow-500/20">
                            <div className="text-sm text-yellow-500">
                                ⚠️ Remember your passphrase! If you forget it, you will need to import your wallet using your secret key.
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    
    return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
            <div className="max-w-md w-full">
                <div className="bg-gray-800/50 backdrop-blur-xl rounded-3xl p-8 border border-gray-700/50">
                    <button
                        onClick={() => { setMode('select'); setLocalError(''); }}
                        className="text-gray-400 hover:text-white mb-6"
                    >
                        ← Back
                    </button>

                    <div className="text-center mb-8">
                        <h1 className="text-2xl font-bold text-white mb-2">Import Wallet</h1>
                        <p className="text-gray-400">Enter your secret key (starts with S)</p>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="text-sm text-gray-400 mb-2 block">Secret Key</label>
                            <input
                                type="password"
                                value={secretKey}
                                onChange={(e) => setSecretKey(e.target.value.toUpperCase())}
                                placeholder="S..."
                                className="w-full bg-gray-900/50 border border-gray-700 rounded-xl px-4 py-4 text-white font-mono placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                            />
                        </div>

                        <div>
                            <label className="text-sm text-gray-400 mb-2 block">New Passphrase</label>
                            <div className="relative">
                                <input
                                    type={showPassphrase ? 'text' : 'password'}
                                    value={passphrase}
                                    onChange={(e) => setPassphrase(e.target.value)}
                                    placeholder="At least 6 characters"
                                    className="w-full bg-gray-900/50 border border-gray-700 rounded-xl px-4 py-4 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassphrase(!showPassphrase)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                                >
                                    {showPassphrase ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        {(localError || state.error) && (
                            <div className="flex items-center gap-2 text-red-400 text-sm">
                                <AlertCircle className="w-4 h-4" />
                                {localError || state.error}
                            </div>
                        )}

                        <button
                            onClick={handleImport}
                            disabled={state.isCreating}
                            className="w-full flex items-center justify-center gap-2 bg-cyan-500 hover:from-cyan-400 hover:to-blue-400 disabled:opacity-50 text-white font-bold py-4 px-6 rounded-xl transition-all"
                        >
                            {state.isCreating ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    Import Wallet
                                    <ArrowRight className="w-5 h-5" />
                                </>
                            )}
                        </button>
                    </div>

                    <div className="mt-6 p-4 bg-red-500/10 rounded-xl border border-red-500/20">
                        <div className="text-sm text-red-400">
                            🔒 Never share your secret key. We do not store or transmit it.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
