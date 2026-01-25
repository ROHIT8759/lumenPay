'use client';
import { useState, useEffect } from 'react';
import { useLumenVault } from '@/hooks/useLumenVault';
import {
    generateSyncQRPayload,
    parseSyncQRPayload,
    getWalletFromSyncQR,
    generateTransferPin,
    validatePin
} from '@/lib/lumenVault/qrSync';
import {
    QrCode,
    Smartphone,
    Monitor,
    ArrowRight,
    Copy,
    Check,
    Shield,
    Loader2,
    AlertCircle,
    RefreshCw
} from 'lucide-react';
type Mode = 'select' | 'export' | 'import';
export default function WalletSyncPage() {
    const [state, actions] = useLumenVault();
    const [mode, setMode] = useState<Mode>('select');
    const [exportPin, setExportPin] = useState('');
    const [exportPassphrase, setExportPassphrase] = useState('');
    const [qrPayload, setQrPayload] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [copied, setCopied] = useState(false);
    const [importData, setImportData] = useState('');
    const [importPin, setImportPin] = useState('');
    const [newPassphrase, setNewPassphrase] = useState('');
    const [isImporting, setIsImporting] = useState(false);
    const [importResult, setImportResult] = useState<{ success: boolean; error?: string } | null>(null);

    const [error, setError] = useState('');
    const handleGenerateQR = async () => {
        setError('');
        setIsGenerating(true);

        try {
            if (!state.publicKey) {
                throw new Error('No wallet to export');
            }

            if (exportPassphrase.length < 6) {
                throw new Error('Enter your wallet passphrase');
            }

            // Get secret key from wallet (requires unlock)
            // For demo, we'll use a generated PIN
            const pin = generateTransferPin();
            setExportPin(pin);

            // In real implementation, we'd get the secret from secureStorage
            // For now, show the flow
            const result = await generateSyncQRPayload(
                'SXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX', // Would get from wallet
                pin,
                'testnet'
            );

            setQrPayload(result.payload);

        } catch (err: any) {
            setError(err.message || 'Failed to generate QR');
        } finally {
            setIsGenerating(false);
        }
    };

    // Import wallet from QR
    const handleImportFromQR = async () => {
        setError('');
        setIsImporting(true);
        setImportResult(null);

        try {
            if (!importData.trim()) {
                throw new Error('Paste the QR data');
            }

            if (!validatePin(importPin)) {
                throw new Error('Enter the 6-digit PIN shown on the other device');
            }

            if (newPassphrase.length < 6) {
                throw new Error('Choose a passphrase (min 6 characters)');
            }

            // Parse and validate QR
            const parseResult = await parseSyncQRPayload(importData, importPin);

            if (!parseResult.success) {
                throw new Error(parseResult.error || 'Invalid QR code');
            }

            // Get full wallet backup
            const backup = await getWalletFromSyncQR(importData, importPin);

            if (!backup) {
                throw new Error('Failed to decrypt wallet');
            }

            // Import into LumenVault
            const importResult = await actions.importWallet(backup.secretKey, newPassphrase);

            if (!importResult) {
                throw new Error('Failed to import wallet');
            }

            setImportResult({ success: true });

            // Auto sign in
            await actions.signIn(newPassphrase);

        } catch (err: any) {
            setError(err.message || 'Import failed');
            setImportResult({ success: false, error: err.message });
        } finally {
            setIsImporting(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Mode selection
    if (mode === 'select') {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
                <div className="max-w-md w-full">
                    <div className="bg-gray-800/50 backdrop-blur-xl rounded-3xl p-8 border border-gray-700/50">
                        <div className="text-center mb-8">
                            <div className="w-20 h-20 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <QrCode className="w-10 h-10 text-purple-400" />
                            </div>
                            <h1 className="text-2xl font-bold text-white mb-2">Sync Wallet</h1>
                            <p className="text-gray-400">Transfer your wallet between devices</p>
                        </div>

                        <div className="space-y-4">
                            {/* Export option */}
                            <button
                                onClick={() => setMode('export')}
                                disabled={!state.publicKey}
                                className="w-full flex items-center gap-4 bg-gray-900/50 hover:bg-gray-900/70 border border-gray-700/50 hover:border-purple-500/50 rounded-xl p-4 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                                    <Monitor className="w-6 h-6 text-white" />
                                </div>
                                <div className="text-left flex-1">
                                    <div className="font-bold text-white">Export to QR</div>
                                    <div className="text-sm text-gray-400">Show QR code for mobile to scan</div>
                                </div>
                                <ArrowRight className="w-5 h-5 text-gray-600 group-hover:text-purple-400 transition-colors" />
                            </button>

                            {/* Import option */}
                            <button
                                onClick={() => setMode('import')}
                                className="w-full flex items-center gap-4 bg-gray-900/50 hover:bg-gray-900/70 border border-gray-700/50 hover:border-gray-600 rounded-xl p-4 transition-all group"
                            >
                                <div className="w-12 h-12 bg-gray-700 rounded-xl flex items-center justify-center">
                                    <Smartphone className="w-6 h-6 text-white" />
                                </div>
                                <div className="text-left flex-1">
                                    <div className="font-bold text-white">Import from QR</div>
                                    <div className="text-sm text-gray-400">Paste QR data from mobile</div>
                                </div>
                                <ArrowRight className="w-5 h-5 text-gray-600 group-hover:text-white transition-colors" />
                            </button>
                        </div>

                        {/* Security note */}
                        <div className="mt-8 p-4 bg-gray-900/30 rounded-xl border border-gray-700/30">
                            <div className="flex items-start gap-3">
                                <Shield className="w-5 h-5 text-green-500 mt-0.5" />
                                <div className="text-sm text-gray-400">
                                    Your wallet is encrypted with a PIN before transfer.
                                    The PIN is shown on screen and never transmitted.
                                </div>
                            </div>
                        </div>

                        {!state.publicKey && (
                            <p className="text-center text-gray-500 text-sm mt-4">
                                Create a wallet first to use sync features
                            </p>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // Export mode
    if (mode === 'export') {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
                <div className="max-w-md w-full">
                    <div className="bg-gray-800/50 backdrop-blur-xl rounded-3xl p-8 border border-gray-700/50">
                        <button
                            onClick={() => { setMode('select'); setQrPayload(''); setExportPin(''); }}
                            className="text-gray-400 hover:text-white mb-6"
                        >
                            ← Back
                        </button>

                        <div className="text-center mb-6">
                            <h1 className="text-2xl font-bold text-white mb-2">Export Wallet</h1>
                            <p className="text-gray-400">Generate QR code for mobile device</p>
                        </div>

                        {!qrPayload ? (
                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm text-gray-400 mb-2 block">Your wallet passphrase</label>
                                    <input
                                        type="password"
                                        value={exportPassphrase}
                                        onChange={(e) => setExportPassphrase(e.target.value)}
                                        placeholder="Enter passphrase to unlock"
                                        className="w-full bg-gray-900/50 border border-gray-700 rounded-xl px-4 py-4 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                                    />
                                </div>

                                {error && (
                                    <div className="flex items-center gap-2 text-red-400 text-sm">
                                        <AlertCircle className="w-4 h-4" />
                                        {error}
                                    </div>
                                )}

                                <button
                                    onClick={handleGenerateQR}
                                    disabled={isGenerating}
                                    className="w-full flex items-center justify-center gap-2 bg-purple-500 hover:from-purple-400 hover:to-pink-400 disabled:opacity-50 text-white font-bold py-4 px-6 rounded-xl transition-all"
                                >
                                    {isGenerating ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <>
                                            Generate QR Code
                                            <QrCode className="w-5 h-5" />
                                        </>
                                    )}
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {/* QR Display (placeholder - would use react-qr-code in production) */}
                                <div className="bg-white rounded-2xl p-6 flex items-center justify-center">
                                    <div className="w-48 h-48 bg-gray-100 rounded-xl flex items-center justify-center">
                                        <QrCode className="w-24 h-24 text-gray-800" />
                                    </div>
                                </div>

                                {/* PIN Display */}
                                <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
                                    <div className="text-center">
                                        <div className="text-sm text-purple-300 mb-2">Transfer PIN (share verbally)</div>
                                        <div className="text-3xl font-mono font-bold text-white tracking-widest">
                                            {exportPin.split('').join(' ')}
                                        </div>
                                    </div>
                                </div>

                                {/* Copy payload button */}
                                <button
                                    onClick={() => copyToClipboard(qrPayload)}
                                    className="w-full flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-white py-3 px-6 rounded-xl transition-all"
                                >
                                    {copied ? (
                                        <>
                                            <Check className="w-5 h-5 text-green-400" />
                                            Copied!
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="w-5 h-5" />
                                            Copy QR Data (for testing)
                                        </>
                                    )}
                                </button>

                                <button
                                    onClick={() => { setQrPayload(''); setExportPin(''); }}
                                    className="w-full flex items-center justify-center gap-2 text-gray-400 hover:text-white py-2"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                    Generate New Code
                                </button>

                                <p className="text-xs text-center text-gray-500">
                                    QR expires in 5 minutes. Never share your PIN online.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // Import mode
    return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
            <div className="max-w-md w-full">
                <div className="bg-gray-800/50 backdrop-blur-xl rounded-3xl p-8 border border-gray-700/50">
                    <button
                        onClick={() => { setMode('select'); setImportResult(null); }}
                        className="text-gray-400 hover:text-white mb-6"
                    >
                        ← Back
                    </button>

                    <div className="text-center mb-6">
                        <h1 className="text-2xl font-bold text-white mb-2">Import Wallet</h1>
                        <p className="text-gray-400">Enter QR data and PIN from other device</p>
                    </div>

                    {importResult?.success ? (
                        <div className="text-center">
                            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Check className="w-10 h-10 text-green-500" />
                            </div>
                            <h2 className="text-xl font-bold text-white mb-2">Import Successful!</h2>
                            <p className="text-gray-400 mb-6">Your wallet has been imported</p>
                            <a
                                href="/dashboard"
                                className="inline-flex items-center gap-2 bg-cyan-500 text-white font-bold py-3 px-6 rounded-xl"
                            >
                                Go to Dashboard
                                <ArrowRight className="w-5 h-5" />
                            </a>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm text-gray-400 mb-2 block">QR Data</label>
                                <textarea
                                    value={importData}
                                    onChange={(e) => setImportData(e.target.value)}
                                    placeholder="Paste QR code data here..."
                                    rows={3}
                                    className="w-full bg-gray-900/50 border border-gray-700 rounded-xl px-4 py-3 text-white font-mono text-sm placeholder-gray-500 focus:outline-none focus:border-cyan-500 resize-none"
                                />
                            </div>

                            <div>
                                <label className="text-sm text-gray-400 mb-2 block">Transfer PIN (from other device)</label>
                                <input
                                    type="text"
                                    value={importPin}
                                    onChange={(e) => setImportPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    placeholder="6-digit PIN"
                                    maxLength={6}
                                    className="w-full bg-gray-900/50 border border-gray-700 rounded-xl px-4 py-4 text-white text-center text-2xl tracking-widest font-mono placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                                />
                            </div>

                            <div>
                                <label className="text-sm text-gray-400 mb-2 block">New passphrase for this device</label>
                                <input
                                    type="password"
                                    value={newPassphrase}
                                    onChange={(e) => setNewPassphrase(e.target.value)}
                                    placeholder="At least 6 characters"
                                    className="w-full bg-gray-900/50 border border-gray-700 rounded-xl px-4 py-4 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                                />
                            </div>

                            {error && (
                                <div className="flex items-center gap-2 text-red-400 text-sm">
                                    <AlertCircle className="w-4 h-4" />
                                    {error}
                                </div>
                            )}

                            <button
                                onClick={handleImportFromQR}
                                disabled={isImporting}
                                className="w-full flex items-center justify-center gap-2 bg-cyan-500 hover:from-cyan-400 hover:to-blue-400 disabled:opacity-50 text-white font-bold py-4 px-6 rounded-xl transition-all"
                            >
                                {isImporting ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        Import Wallet
                                        <ArrowRight className="w-5 h-5" />
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
