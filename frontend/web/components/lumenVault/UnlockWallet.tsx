'use client';



import React, { useState } from 'react';
import { useWallet } from './WalletProvider';
import { Loader2, Lock, ArrowRight, Fingerprint } from 'lucide-react';

export function UnlockWallet() {
    const { unlockWithPassphrase, unlockWithBiometrics, biometricsEnabled, biometricsAvailable } = useWallet();
    const [passphrase, setPassphrase] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleUnlock = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!passphrase) return;

        setIsLoading(true);
        setError(null);

        
        setTimeout(async () => {
            const result = await unlockWithPassphrase(passphrase);
            if (!result.success) {
                setError(result.error || 'Incorrect password');
            }
            setIsLoading(false);
        }, 100);
    };

    const handleBiometricUnlock = async () => {
        setIsLoading(true);
        setError(null);
        const result = await unlockWithBiometrics();
        if (!result.success) {
            setError(result.error || 'Biometric auth failed');
        }
        setIsLoading(false);
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center space-y-6">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center animate-pulse">
                <Lock className="w-8 h-8 text-gray-500" />
            </div>

            <div className="space-y-2">
                <h2 className="text-2xl font-bold">Welcome Back</h2>
                <p className="text-gray-500">Enter password to unlock LumenVault</p>
            </div>

            <form onSubmit={handleUnlock} className="w-full max-w-xs space-y-4">
                <input
                    type="password"
                    value={passphrase}
                    onChange={(e) => setPassphrase(e.target.value)}
                    placeholder="Password"
                    className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-center text-lg shadow-sm"
                    autoFocus
                />

                {error && (
                    <div className="text-red-500 text-sm animate-shake">
                        {error}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={isLoading || !passphrase}
                    className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 flex items-center justify-center gap-2 group"
                >
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                        <>
                            Unlock <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </>
                    )}
                </button>
            </form>

            {biometricsAvailable && biometricsEnabled && (
                <button
                    onClick={handleBiometricUnlock}
                    className="mt-4 flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
                >
                    <Fingerprint className="w-5 h-5" /> Use Biometrics
                </button>
            )}

            <p className="text-xs text-gray-400 mt-8">
                Your keys are encrypted on this device.
                <br />
                We cannot recover them if you lose your password.
            </p>
        </div>
    );
}
