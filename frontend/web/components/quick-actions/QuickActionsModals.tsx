'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Scan, Send, Banknote, TrendingUp, X, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';
import jsQR from 'jsqr';
import { signTransaction } from '@stellar/freighter-api';
import { API } from '@/lib/config';
import { walletService } from '@/lib/walletService';

const API_URL = API.BASE_URL;





async function callQuickActionAPI(actionType: string, payload: any) {
    const userId = localStorage.getItem('userId');
    const token = localStorage.getItem('authToken');
    
    if (!userId || !token) throw new Error('Not authenticated');

    const response = await fetch('/api/quick-actions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-user-id': userId,
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            action_type: actionType,
            ...payload,
        }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'API error');
    }

    return response.json();
}





function QRScannerModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const scanIntervalRef = useRef<number | null>(null);
    const [error, setError] = useState<string>('');
    const [scannedData, setScannedData] = useState<string>('');
    const [amount, setAmount] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState<'scan' | 'amount' | 'success'>('scan');
    const [cameraActive, setCameraActive] = useState(false);
    const [scanMode, setScanMode] = useState<'camera' | 'upload'>('camera');

    
    const startCamera = async () => {
        try {
            setError('');
            setCameraActive(false);

            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: 640, height: 480 },
            });

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
                setCameraActive(true);

                
                scanIntervalRef.current = window.setInterval(() => {
                    scanVideoFrame();
                }, 200); 
            }
        } catch (err: any) {
            console.error('Camera error:', err);
            setError('Cannot access camera. Please check permissions or upload QR image.');
            setScanMode('upload');
        }
    };

    
    const scanVideoFrame = () => {
        const canvas = canvasRef.current;
        const video = videoRef.current;

        if (!canvas || !video || video.readyState !== video.HAVE_ENOUGH_DATA) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        try {
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: 'dontInvert',
            });

            if (code && code.data) {
                handleQRCodeFound(code.data);
            }
        } catch (err) {
            console.error('QR scan error:', err);
        }
    };

    
    const handleQRCodeFound = (data: string) => {
        stopCamera();
        setScannedData(data);
        setStep('amount');
        setError('');
    };

    
    const stopCamera = () => {
        if (scanIntervalRef.current) {
            clearInterval(scanIntervalRef.current);
            scanIntervalRef.current = null;
        }

        if (videoRef.current?.srcObject) {
            const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
            tracks.forEach((track) => track.stop());
            videoRef.current.srcObject = null;
        }
        setCameraActive(false);
    };

    
    const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setError('');
        setLoading(true);

        try {
            const imageData = await loadImageAsImageData(file);
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: 'attemptBoth',
            });

            if (code && code.data) {
                handleQRCodeFound(code.data);
            } else {
                setError('No QR code found in the image. Please try another image.');
            }
        } catch (err: any) {
            setError('Failed to process image: ' + err.message);
        } finally {
            setLoading(false);
            
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    
    const loadImageAsImageData = (file: File): Promise<ImageData> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const url = URL.createObjectURL(file);

            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                if (!ctx) {
                    reject(new Error('Failed to get canvas context'));
                    return;
                }

                
                const maxSize = 1024;
                let width = img.width;
                let height = img.height;

                if (width > maxSize || height > maxSize) {
                    if (width > height) {
                        height = (height / width) * maxSize;
                        width = maxSize;
                    } else {
                        width = (width / height) * maxSize;
                        height = maxSize;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);

                URL.revokeObjectURL(url);
                resolve(ctx.getImageData(0, 0, width, height));
            };

            img.onerror = () => {
                URL.revokeObjectURL(url);
                reject(new Error('Failed to load image'));
            };

            img.src = url;
        });
    };

    
    const handleConfirmPayment = async () => {
        if (!scannedData || !amount || parseFloat(amount) <= 0) {
            setError('Please enter a valid amount');
            return;
        }

        setLoading(true);
        setError('');

        try {
            
            const paymentResult = await callQuickActionAPI('scan_qr', {
                scannedData,
                amountXLM: amount,
            });

            setStep('success');

            
            setTimeout(() => {
                resetModal();
                onClose();
            }, 2000);
        } catch (err: any) {
            setError(err.message || 'Payment failed');
        } finally {
            setLoading(false);
        }
    };

    
    const resetModal = () => {
        stopCamera();
        setStep('scan');
        setScannedData('');
        setAmount('');
        setError('');
        setScanMode('camera');
    };

    
    useEffect(() => {
        if (isOpen && step === 'scan' && scanMode === 'camera') {
            startCamera();
        }

        return () => {
            stopCamera();
        };
    }, [isOpen, step, scanMode]);

    
    useEffect(() => {
        if (!isOpen) {
            resetModal();
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <GlassCard className="max-w-md w-full">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold">Scan & Pay</h2>
                    <button
                        onClick={() => { resetModal(); onClose(); }}
                        disabled={loading}
                        className="text-gray-400 hover:text-white disabled:opacity-50"
                    >
                        <X size={20} />
                    </button>
                </div>

                {step === 'scan' && (
                    <div className="space-y-4">
                        {}
                        <div className="flex gap-2 bg-white/5 rounded-lg p-1">
                            <button
                                onClick={() => setScanMode('camera')}
                                className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${scanMode === 'camera'
                                    ? 'bg-blue-600 text-white'
                                    : 'text-gray-400 hover:text-white'
                                    }`}
                            >
                                📷 Camera
                            </button>
                            <button
                                onClick={() => { stopCamera(); setScanMode('upload'); }}
                                className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${scanMode === 'upload'
                                    ? 'bg-blue-600 text-white'
                                    : 'text-gray-400 hover:text-white'
                                    }`}
                            >
                                🖼️ Upload
                            </button>
                        </div>

                        {scanMode === 'camera' ? (
                            <>
                                <div className="relative bg-black rounded-lg overflow-hidden aspect-square">
                                    <video
                                        ref={videoRef}
                                        className="w-full h-full object-cover"
                                        playsInline
                                        muted
                                    />
                                    {}
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                        <div className="w-48 h-48 border-2 border-blue-400 rounded-lg opacity-50">
                                            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-blue-400 -translate-x-0.5 -translate-y-0.5" />
                                            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-blue-400 translate-x-0.5 -translate-y-0.5" />
                                            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-blue-400 -translate-x-0.5 translate-y-0.5" />
                                            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-blue-400 translate-x-0.5 translate-y-0.5" />
                                        </div>
                                    </div>
                                    {!cameraActive && !error && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                                            <Loader size={32} className="animate-spin text-blue-400" />
                                        </div>
                                    )}
                                </div>
                                <canvas ref={canvasRef} className="hidden" />
                                <p className="text-center text-sm text-gray-400">
                                    Position QR code within the frame
                                </p>
                            </>
                        ) : (
                            <div className="space-y-4">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    className="hidden"
                                    id="qr-image-upload"
                                />
                                <label
                                    htmlFor="qr-image-upload"
                                    className={`flex flex-col items-center justify-center border-2 border-dashed border-white/20 rounded-lg p-8 cursor-pointer hover:border-blue-400 transition-colors ${loading ? 'opacity-50 pointer-events-none' : ''}`}
                                >
                                    {loading ? (
                                        <Loader size={48} className="animate-spin text-blue-400 mb-4" />
                                    ) : (
                                        <Scan size={48} className="text-gray-500 mb-4" />
                                    )}
                                    <p className="text-gray-300 font-medium mb-1">
                                        {loading ? 'Processing...' : 'Click to upload QR image'}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        PNG, JPG up to 10MB
                                    </p>
                                </label>
                            </div>
                        )}

                        {error && (
                            <div className="bg-red-500/20 border border-red-500 rounded-lg p-3 flex gap-2 text-sm">
                                <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
                                <span>{error}</span>
                            </div>
                        )}
                    </div>
                )}

                {step === 'amount' && (
                    <div className="space-y-4">
                        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <CheckCircle size={16} className="text-green-400" />
                                <p className="text-sm text-green-400 font-medium">QR Code Detected</p>
                            </div>
                            <p className="font-mono text-xs break-all text-gray-400">
                                {scannedData.length > 60 ? scannedData.slice(0, 60) + '...' : scannedData}
                            </p>
                        </div>

                        <div>
                            <label className="text-sm text-gray-400 mb-2 block">Amount (XLM)</label>
                            <input
                                type="number"
                                placeholder="0.00"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                min="0.0000001"
                                step="any"
                                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white text-lg placeholder-gray-500 focus:outline-none focus:border-blue-400"
                                disabled={loading}
                                autoFocus
                            />
                        </div>

                        {error && (
                            <div className="bg-red-500/20 border border-red-500 rounded-lg p-3 flex gap-2 text-sm">
                                <AlertCircle size={16} className="text-red-400 flex-shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        <div className="flex gap-2">
                            <button
                                onClick={() => {
                                    setStep('scan');
                                    setScannedData('');
                                    setAmount('');
                                    setError('');
                                }}
                                className="flex-1 py-3 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                                disabled={loading}
                            >
                                Back
                            </button>
                            <button
                                onClick={handleConfirmPayment}
                                className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                disabled={loading || !amount}
                            >
                                {loading && <Loader size={16} className="animate-spin" />}
                                Pay {amount ? `${amount} XLM` : ''}
                            </button>
                        </div>
                    </div>
                )}

                {step === 'success' && (
                    <div className="text-center py-8">
                        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle size={32} className="text-green-400" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">Payment Sent!</h3>
                        <p className="text-gray-400 text-sm">
                            {amount} XLM transferred successfully
                        </p>
                    </div>
                )}
            </GlassCard>
        </div>
    );
}





function PayIdModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const [recipient, setRecipient] = useState('');
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [resolved, setResolved] = useState<any>(null);
    const [step, setStep] = useState<'resolve' | 'amount' | 'signing' | 'success'>('resolve');

    const handleResolve = async () => {
        if (!recipient) {
            setError('Please enter Pay ID or address');
            return;
        }

        setLoading(true);
        try {
            const result = await callQuickActionAPI('pay_id', {
                action: 'resolve',
                recipient,
            });
            setResolved(result.recipient);
            setError('');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSend = async () => {
        if (!amount) {
            setError('Please enter amount');
            return;
        }

        setLoading(true);
        setStep('signing');
        try {
            // Get the user's public key from localStorage
            const walletType = localStorage.getItem('walletType');
            const token = localStorage.getItem('authToken');
            
            // Determine sender address based on wallet type
            let senderAddress: string | null = null;
            
            if (walletType === 'freighter') {
                // For Freighter, we need to get the address
                const { getAddress } = await import('@stellar/freighter-api');
                const addressResult = await getAddress();
                if (addressResult.error) throw new Error(addressResult.error);
                senderAddress = addressResult.address;
            } else {
                throw new Error('Please connect a wallet first');
            }

            if (!senderAddress) {
                throw new Error('No wallet connected');
            }

            // 1. Build unsigned transaction using local wallet service
            const buildResult = await walletService.buildPaymentTransaction({
                sourcePublicKey: senderAddress,
                destinationPublicKey: resolved.address,
                amount: amount,
                asset: 'native', // XLM
            });

            if (buildResult.error) {
                throw new Error(buildResult.error);
            }

            // 2. Sign with Freighter
            const signResult = await signTransaction(buildResult.transaction.xdr, {
                networkPassphrase: buildResult.transaction.networkPassphrase,
            });

            if (signResult.error) {
                throw new Error(signResult.error);
            }

            // 3. Submit signed transaction
            const submitResult = await walletService.submitSignedTransaction(
                signResult.signedTxXdr,
                token
            );

            if (!submitResult.success) {
                throw new Error(submitResult.error || 'Transaction submission failed');
            }

            setStep('success');
            setTimeout(() => {
                onClose();
                setStep('resolve');
                setRecipient('');
                setAmount('');
                setResolved(null);
            }, 2000);

        } catch (err: any) {
            setError(err.message);
            setStep('amount');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <GlassCard className="max-w-md w-full">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold">Send via Pay ID</h2>
                    <button onClick={onClose} disabled={loading} className="text-gray-400 hover:text-white disabled:opacity-50">
                        <X size={20} />
                    </button>
                </div>

                <div className="space-y-4">
                    {!resolved ? (
                        <>
                            <div>
                                <label className="text-sm text-gray-400 mb-2 block">Pay ID or Wallet Address</label>
                                <input
                                    type="text"
                                    placeholder="user@steller or G..."
                                    value={recipient}
                                    onChange={(e) => setRecipient(e.target.value)}
                                    className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-green-400"
                                    disabled={loading}
                                />
                            </div>

                            {error && (
                                <div className="bg-red-500/20 border border-red-500 rounded-lg p-3 flex gap-2 text-sm">
                                    <AlertCircle size={16} className="text-red-400 flex-shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}

                            <div className="flex gap-2">
                                <button
                                    onClick={onClose}
                                    className="flex-1 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors"
                                    disabled={loading}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleResolve}
                                    className="flex-1 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                    disabled={loading}
                                >
                                    {loading && <Loader size={16} className="animate-spin" />}
                                    Next
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                                <p className="text-sm text-gray-400 mb-2">Sending to</p>
                                <p className="font-mono text-sm break-all text-green-400">
                                    {resolved.type === 'pay_id' ? resolved.payId : resolved.address}
                                </p>
                            </div>

                            <div>
                                <label className="text-sm text-gray-400 mb-2 block">Amount (XLM)</label>
                                <input
                                    type="number"
                                    placeholder="0.00"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-green-400"
                                    disabled={loading}
                                />
                            </div>

                            {error && (
                                <div className="bg-red-500/20 border border-red-500 rounded-lg p-3 flex gap-2 text-sm">
                                    <AlertCircle size={16} className="text-red-400 flex-shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}

                            <div className="flex gap-2">
                                <button
                                    onClick={() => {
                                        setResolved(null);
                                        setAmount('');
                                        setError('');
                                    }}
                                    className="flex-1 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors"
                                    disabled={loading}
                                >
                                    Back
                                </button>
                                <button
                                    onClick={handleSend}
                                    className="flex-1 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                    disabled={loading}
                                >
                                    {loading && <Loader size={16} className="animate-spin" />}
                                    Send
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </GlassCard>
        </div>
    );
}





function BankPayoutModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const [recipientName, setRecipientName] = useState('');
    const [bankIdentifier, setBankIdentifier] = useState('');
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [payoutId, setPayoutId] = useState<string | null>(null);
    const [status, setStatus] = useState<string>('');

    const handleInitiate = async () => {
        if (!recipientName || !bankIdentifier || !amount) {
            setError('Please fill all fields');
            return;
        }

        setLoading(true);
        try {
            const result = await callQuickActionAPI('bank_payout', {
                action: 'initiate',
                recipientName,
                bankIdentifier,
                amountUSCToops: Math.floor(parseFloat(amount) * 10000000),
            });

            setPayoutId(result.payoutId);
            setStatus(result.status);
            setError('');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleConfirm = async () => {
        if (!payoutId) return;

        setLoading(true);
        try {
            await callQuickActionAPI('bank_payout', {
                action: 'confirm',
                payoutId,
            });

            alert('Payout processing! You will receive it within 1-3 business days.');
            onClose();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <GlassCard className="max-w-md w-full">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold">Withdraw to Bank</h2>
                    <button onClick={onClose} disabled={loading} className="text-gray-400 hover:text-white disabled:opacity-50">
                        <X size={20} />
                    </button>
                </div>

                <div className="space-y-4">
                    {!payoutId ? (
                        <>
                            <div>
                                <label className="text-sm text-gray-400 mb-2 block">Recipient Name</label>
                                <input
                                    type="text"
                                    placeholder="John Doe"
                                    value={recipientName}
                                    onChange={(e) => setRecipientName(e.target.value)}
                                    className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-purple-400"
                                    disabled={loading}
                                />
                            </div>

                            <div>
                                <label className="text-sm text-gray-400 mb-2 block">Bank ID (UPI/Account)</label>
                                <input
                                    type="text"
                                    placeholder="john@upi or 1234567890"
                                    value={bankIdentifier}
                                    onChange={(e) => setBankIdentifier(e.target.value)}
                                    className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-purple-400"
                                    disabled={loading}
                                />
                            </div>

                            <div>
                                <label className="text-sm text-gray-400 mb-2 block">Amount (USDC)</label>
                                <input
                                    type="number"
                                    placeholder="100.00"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-purple-400"
                                    disabled={loading}
                                />
                            </div>

                            {error && (
                                <div className="bg-red-500/20 border border-red-500 rounded-lg p-3 flex gap-2 text-sm">
                                    <AlertCircle size={16} className="text-red-400 flex-shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}

                            <div className="flex gap-2">
                                <button
                                    onClick={onClose}
                                    className="flex-1 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors"
                                    disabled={loading}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleInitiate}
                                    className="flex-1 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                    disabled={loading}
                                >
                                    {loading && <Loader size={16} className="animate-spin" />}
                                    Next
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="bg-green-500/20 border border-green-500 rounded-lg p-4 flex gap-3">
                                <CheckCircle size={20} className="text-green-400 flex-shrink-0" />
                                <div>
                                    <p className="font-bold text-sm">Payout Initiated</p>
                                    <p className="text-xs text-gray-300 mt-1">
                                        To: {recipientName} | Amount: {amount} USDC
                                    </p>
                                </div>
                            </div>

                            <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                                <p className="text-xs text-gray-400">
                                    ⏱️ Processing... You will receive this amount within 1-3 business days through your bank.
                                </p>
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={onClose}
                                    className="flex-1 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors"
                                    disabled={loading}
                                >
                                    Close
                                </button>
                                <button
                                    onClick={handleConfirm}
                                    className="flex-1 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                    disabled={loading}
                                >
                                    {loading && <Loader size={16} className="animate-spin" />}
                                    Confirm
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </GlassCard>
        </div>
    );
}





function CryptoTradingModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    
    const defaultAssets = [
        { id: '1', symbol: 'BTC', name: 'Bitcoin', price_usd: '97500.00', percent_change_24h: '2.45' },
        { id: '2', symbol: 'ETH', name: 'Ethereum', price_usd: '3650.50', percent_change_24h: '1.82' },
        { id: '3', symbol: 'SOL', name: 'Solana', price_usd: '210.45', percent_change_24h: '5.23' },
        { id: '4', symbol: 'XRP', name: 'Ripple', price_usd: '2.35', percent_change_24h: '-1.15' },
        { id: '5', symbol: 'ADA', name: 'Cardano', price_usd: '0.95', percent_change_24h: '3.67' },
        { id: '6', symbol: 'DOGE', name: 'Dogecoin', price_usd: '0.38', percent_change_24h: '8.42' },
        { id: '7', symbol: 'XLM', name: 'Stellar', price_usd: '0.425', percent_change_24h: '4.15' },
        { id: '8', symbol: 'LINK', name: 'Chainlink', price_usd: '24.80', percent_change_24h: '2.91' },
        { id: '9', symbol: 'AVAX', name: 'Avalanche', price_usd: '42.15', percent_change_24h: '-0.58' },
        { id: '10', symbol: 'DOT', name: 'Polkadot', price_usd: '7.85', percent_change_24h: '1.23' },
        { id: '11', symbol: 'MATIC', name: 'Polygon', price_usd: '0.52', percent_change_24h: '-2.34' },
        { id: '12', symbol: 'UNI', name: 'Uniswap', price_usd: '14.20', percent_change_24h: '0.95' },
    ];

    const [assets, setAssets] = useState<any[]>(defaultAssets);
    const [selectedAsset, setSelectedAsset] = useState<any>(null);
    const [quantity, setQuantity] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');
    const [success, setSuccess] = useState(false);
    const [chartPeriod, setChartPeriod] = useState<'1D' | '1M' | '1Y' | '5Y'>('1M');
    const [showChart, setShowChart] = useState(false);
    const [hoverIndex, setHoverIndex] = useState<number | null>(null);
    const chartRef = useRef<SVGSVGElement>(null);

    
    const generateChartData = (asset: any, period: string) => {
        const currentPrice = parseFloat(asset.price_usd);
        const points: number[] = [];
        let numPoints = 0;
        let volatility = 0;
        let trend = 0;

        switch (period) {
            case '1D':
                numPoints = 24; 
                volatility = 0.02;
                trend = parseFloat(asset.percent_change_24h) / 100 / 24;
                break;
            case '1M':
                numPoints = 30; 
                volatility = 0.05;
                trend = 0.001;
                break;
            case '1Y':
                numPoints = 52; 
                volatility = 0.1;
                trend = 0.005;
                break;
            case '5Y':
                numPoints = 60; 
                volatility = 0.15;
                trend = 0.008;
                break;
        }

        
        let price = currentPrice;
        for (let i = numPoints; i >= 0; i--) {
            points.unshift(price);
            const change = (Math.random() - 0.5) * 2 * volatility - trend;
            price = price / (1 + change);
        }

        return points;
    };

    
    const getChartPath = (data: number[]) => {
        if (data.length < 2) return '';

        const min = Math.min(...data);
        const max = Math.max(...data);
        const range = max - min || 1;

        const width = 100;
        const height = 100;
        const padding = 5;

        const points = data.map((value, index) => {
            const x = padding + (index / (data.length - 1)) * (width - 2 * padding);
            const y = padding + (1 - (value - min) / range) * (height - 2 * padding);
            return `${x},${y}`;
        });

        return `M ${points.join(' L ')}`;
    };

    
    const getChartColor = (data: number[]) => {
        if (data.length < 2) return '#60a5fa';
        return data[data.length - 1] >= data[0] ? '#4ade80' : '#f87171';
    };

    
    const getPercentChange = (data: number[]) => {
        if (data.length < 2) return 0;
        const first = data[0];
        const last = data[data.length - 1];
        return ((last - first) / first) * 100;
    };

    
    const handleChartInteraction = (e: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>) => {
        if (!chartRef.current || chartData.length < 2) return;

        const svg = chartRef.current;
        const rect = svg.getBoundingClientRect();

        let clientX: number;
        if ('touches' in e) {
            clientX = e.touches[0].clientX;
        } else {
            clientX = e.clientX;
        }

        const x = clientX - rect.left;
        const percentage = x / rect.width;
        const index = Math.min(Math.max(Math.round(percentage * (chartData.length - 1)), 0), chartData.length - 1);

        setHoverIndex(index);
    };

    
    const getPointCoordinates = (data: number[], index: number) => {
        if (data.length < 2 || index < 0 || index >= data.length) return { x: 0, y: 0 };

        const min = Math.min(...data);
        const max = Math.max(...data);
        const range = max - min || 1;

        const padding = 5;
        const width = 100;
        const height = 100;

        const x = padding + (index / (data.length - 1)) * (width - 2 * padding);
        const y = padding + (1 - (data[index] - min) / range) * (height - 2 * padding);

        return { x, y };
    };

    
    const getTimeLabel = (index: number, period: string, totalPoints: number) => {
        const ago = totalPoints - 1 - index;
        switch (period) {
            case '1D':
                if (ago === 0) return 'Now';
                return `${ago}h ago`;
            case '1M':
                if (ago === 0) return 'Today';
                if (ago === 1) return 'Yesterday';
                return `${ago}d ago`;
            case '1Y':
                if (ago === 0) return 'This week';
                return `${ago}w ago`;
            case '5Y':
                if (ago === 0) return 'This month';
                return `${ago}mo ago`;
            default:
                return '';
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchAssets();
            setSuccess(false);
            setError('');
            setSelectedAsset(null);
            setQuantity('');
            setShowChart(false);
        }
    }, [isOpen]);

    const fetchAssets = async () => {
        try {
            const userId = localStorage.getItem('userId');
            if (!userId) return;

            const response = await fetch('/api/quick-actions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': userId,
                },
                body: JSON.stringify({
                    action_type: 'trade',
                    action: 'fetch_assets',
                }),
            });

            const data = await response.json();
            if (data.assets && data.assets.length > 0) {
                setAssets(data.assets);
            }
            
        } catch (err) {
            console.error('Failed to fetch assets, using defaults:', err);
            
        }
    };

    const handleTrade = async () => {
        if (!selectedAsset || !quantity || parseFloat(quantity) <= 0) {
            setError('Please select asset and enter valid quantity');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const userId = localStorage.getItem('userId');
            if (!userId) {
                throw new Error('Not authenticated');
            }

            const result = await callQuickActionAPI('trade', {
                action: tradeType,
                assetId: selectedAsset.id,
                quantity: parseFloat(quantity),
                type: tradeType,
            });

            setSuccess(true);
            setTimeout(() => {
                setSelectedAsset(null);
                setQuantity('');
                setSuccess(false);
                setShowChart(false);
            }, 2000);
        } catch (err: any) {
            setError(err.message || 'Trade failed');
        } finally {
            setLoading(false);
        }
    };

    const totalValue = selectedAsset && quantity
        ? (parseFloat(quantity) * parseFloat(selectedAsset.price_usd)).toFixed(2)
        : '0.00';

    
    const chartData = selectedAsset ? generateChartData(selectedAsset, chartPeriod) : [];
    const chartColor = getChartColor(chartData);
    const chartPath = getChartPath(chartData);
    const periodChange = getPercentChange(chartData);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <GlassCard className="max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col">
                <div className="flex justify-between items-center mb-4 flex-shrink-0">
                    <h2 className="text-xl font-bold">Trade Crypto</h2>
                    <button onClick={onClose} disabled={loading} className="text-gray-400 hover:text-white disabled:opacity-50">
                        <X size={20} />
                    </button>
                </div>

                {success ? (
                    <div className="text-center py-12">
                        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle size={32} className="text-green-400" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">
                            {tradeType === 'buy' ? 'Purchase' : 'Sale'} Complete!
                        </h3>
                        <p className="text-gray-400 text-sm">
                            {tradeType === 'buy' ? 'Bought' : 'Sold'} {quantity} {selectedAsset?.symbol}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4 flex-1 overflow-y-auto">
                        {}
                        <div className="flex gap-2 bg-white/5 rounded-lg p-1">
                            {(['buy', 'sell'] as const).map((type) => (
                                <button
                                    key={type}
                                    onClick={() => setTradeType(type)}
                                    className={`flex-1 py-2 rounded-md font-medium transition-colors ${tradeType === type
                                        ? type === 'buy'
                                            ? 'bg-green-600 text-white'
                                            : 'bg-red-600 text-white'
                                        : 'text-gray-400 hover:text-white'
                                        }`}
                                    disabled={loading}
                                >
                                    {type.toUpperCase()}
                                </button>
                            ))}
                        </div>

                        {}
                        <div>
                            <label className="text-sm text-gray-400 mb-2 block">Select Asset</label>
                            <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                                {assets.map((asset) => (
                                    <button
                                        key={asset.id}
                                        onClick={() => setSelectedAsset(asset)}
                                        className={`w-full p-3 rounded-lg border transition-all text-left ${selectedAsset?.id === asset.id
                                            ? 'bg-orange-500/20 border-orange-500 scale-[1.02]'
                                            : 'bg-white/5 border-white/10 hover:border-orange-400'
                                            }`}
                                        disabled={loading}
                                    >
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <p className="font-bold text-sm">{asset.symbol}</p>
                                                <p className="text-xs text-gray-400">{asset.name}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-sm font-mono">
                                                    ${parseFloat(asset.price_usd).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </p>
                                                <p className={`text-xs font-medium ${parseFloat(asset.percent_change_24h) >= 0
                                                    ? 'text-green-400'
                                                    : 'text-red-400'
                                                    }`}>
                                                    {parseFloat(asset.percent_change_24h) >= 0 ? '+' : ''}
                                                    {parseFloat(asset.percent_change_24h).toFixed(2)}%
                                                </p>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {}
                        {selectedAsset && (
                            <div className="bg-white/5 rounded-lg p-4 space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-400">Selected</span>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-orange-400">{selectedAsset.symbol}</span>
                                        <button
                                            onClick={() => setShowChart(!showChart)}
                                            className="text-xs px-2 py-1 bg-white/10 hover:bg-white/20 rounded text-gray-300 transition-colors"
                                        >
                                            {showChart ? 'Hide' : 'Show'} Chart
                                        </button>
                                    </div>
                                </div>

                                {}
                                {showChart && (
                                    <div className="space-y-2">
                                        {}
                                        <div className="flex gap-1 bg-black/30 rounded-lg p-1">
                                            {(['1D', '1M', '1Y', '5Y'] as const).map((period) => (
                                                <button
                                                    key={period}
                                                    onClick={() => setChartPeriod(period)}
                                                    className={`flex-1 py-1.5 text-xs font-medium rounded transition-colors ${chartPeriod === period
                                                        ? 'bg-orange-500 text-white'
                                                        : 'text-gray-400 hover:text-white'
                                                        }`}
                                                >
                                                    {period}
                                                </button>
                                            ))}
                                        </div>

                                        {}
                                        <div className="bg-black/30 rounded-lg p-3">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-xs text-gray-500">
                                                    {chartPeriod === '1D' && 'Last 24 Hours'}
                                                    {chartPeriod === '1M' && 'Last 30 Days'}
                                                    {chartPeriod === '1Y' && 'Last 12 Months'}
                                                    {chartPeriod === '5Y' && 'Last 5 Years'}
                                                </span>
                                                <span className={`text-xs font-medium ${periodChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                    {periodChange >= 0 ? '+' : ''}{periodChange.toFixed(2)}%
                                                </span>
                                            </div>
                                            <svg
                                                ref={chartRef}
                                                viewBox="0 0 100 100"
                                                className="w-full h-24 cursor-crosshair"
                                                preserveAspectRatio="none"
                                                onMouseMove={handleChartInteraction}
                                                onTouchMove={handleChartInteraction}
                                                onMouseLeave={() => setHoverIndex(null)}
                                                onTouchEnd={() => setHoverIndex(null)}
                                            >
                                                {}
                                                <line x1="5" y1="25" x2="95" y2="25" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
                                                <line x1="5" y1="50" x2="95" y2="50" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
                                                <line x1="5" y1="75" x2="95" y2="75" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />

                                                {}
                                                <defs>
                                                    <linearGradient id={`chartGradient-${selectedAsset.id}`} x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="0%" stopColor={chartColor} stopOpacity="0.3" />
                                                        <stop offset="100%" stopColor={chartColor} stopOpacity="0" />
                                                    </linearGradient>
                                                </defs>

                                                {}
                                                {chartPath && (
                                                    <path
                                                        d={`${chartPath} L 95,95 L 5,95 Z`}
                                                        fill={`url(#chartGradient-${selectedAsset.id})`}
                                                    />
                                                )}

                                                {}
                                                <path
                                                    d={chartPath}
                                                    fill="none"
                                                    stroke={chartColor}
                                                    strokeWidth="1.5"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                />

                                                {}
                                                {hoverIndex !== null && (() => {
                                                    const point = getPointCoordinates(chartData, hoverIndex);
                                                    return (
                                                        <>
                                                            {}
                                                            <line
                                                                x1={point.x}
                                                                y1="5"
                                                                x2={point.x}
                                                                y2="95"
                                                                stroke="rgba(255,255,255,0.5)"
                                                                strokeWidth="0.5"
                                                                strokeDasharray="2,2"
                                                            />
                                                            {}
                                                            <line
                                                                x1="5"
                                                                y1={point.y}
                                                                x2="95"
                                                                y2={point.y}
                                                                stroke="rgba(255,255,255,0.3)"
                                                                strokeWidth="0.3"
                                                                strokeDasharray="1,2"
                                                            />
                                                            {}
                                                            <circle
                                                                cx={point.x}
                                                                cy={point.y}
                                                                r="2.5"
                                                                fill={chartColor}
                                                                stroke="white"
                                                                strokeWidth="0.8"
                                                            />
                                                        </>
                                                    );
                                                })()}
                                            </svg>

                                            {}
                                            {hoverIndex !== null && (
                                                <div className="flex justify-between items-center bg-white/10 rounded px-2 py-1 mt-2">
                                                    <span className="text-xs text-gray-400">
                                                        {getTimeLabel(hoverIndex, chartPeriod, chartData.length)}
                                                    </span>
                                                    <span className="text-sm font-mono font-bold text-white">
                                                        ${chartData[hoverIndex].toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </span>
                                                </div>
                                            )}
                                            <div className="flex justify-between text-[10px] text-gray-500 mt-1">
                                                <span>
                                                    {chartPeriod === '1D' && '24h ago'}
                                                    {chartPeriod === '1M' && '30d ago'}
                                                    {chartPeriod === '1Y' && '1yr ago'}
                                                    {chartPeriod === '5Y' && '5yr ago'}
                                                </span>
                                                <span>Now</span>
                                            </div>
                                        </div>

                                        {}
                                        <div className="flex justify-between text-xs">
                                            <div>
                                                <span className="text-gray-500">Low: </span>
                                                <span className="text-white font-mono">
                                                    ${Math.min(...chartData).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-gray-500">High: </span>
                                                <span className="text-white font-mono">
                                                    ${Math.max(...chartData).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label className="text-sm text-gray-400 mb-1 block">Quantity</label>
                                    <input
                                        type="number"
                                        placeholder="0.00"
                                        value={quantity}
                                        onChange={(e) => setQuantity(e.target.value)}
                                        min="0"
                                        step="any"
                                        className="w-full bg-black/30 border border-white/20 rounded-lg px-4 py-3 text-white text-lg placeholder-gray-500 focus:outline-none focus:border-orange-400"
                                        disabled={loading}
                                        autoFocus
                                    />
                                </div>

                                {quantity && parseFloat(quantity) > 0 && (
                                    <div className="flex justify-between items-center pt-2 border-t border-white/10">
                                        <span className="text-sm text-gray-400">Total Value</span>
                                        <span className="font-bold text-lg text-white">${totalValue}</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {error && (
                            <div className="bg-red-500/20 border border-red-500 rounded-lg p-3 flex gap-2 text-sm">
                                <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
                                <span>{error}</span>
                            </div>
                        )}

                        {}
                        <div className="flex gap-2 pt-2">
                            <button
                                onClick={onClose}
                                className="flex-1 py-3 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors"
                                disabled={loading}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleTrade}
                                className={`flex-1 py-3 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${tradeType === 'buy'
                                    ? 'bg-green-600 hover:bg-green-500'
                                    : 'bg-red-600 hover:bg-red-500'
                                    }`}
                                disabled={loading || !selectedAsset || !quantity || parseFloat(quantity) <= 0}
                            >
                                {loading && <Loader size={16} className="animate-spin" />}
                                {tradeType === 'buy' ? 'Buy' : 'Sell'} {selectedAsset?.symbol || ''}
                            </button>
                        </div>
                    </div>
                )}
            </GlassCard>
        </div>
    );
}





interface ActionBtnProps {
    icon: React.ReactNode;
    label: string;
    color: string;
    onClick: () => void;
}

function ActionBtn({ icon, label, color, onClick }: ActionBtnProps) {
    const iconWithColor = React.cloneElement(icon as React.ReactElement, {
        size: 24,
        className: color,
    });

    return (
        <button
            onClick={onClick}
            className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-white/5 transition-colors group"
        >
            <div className="w-12 h-12 rounded-full glass flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                {iconWithColor}
            </div>
            <span className="text-xs font-medium text-gray-300">{label}</span>
        </button>
    );
}





export {
    QRScannerModal,
    PayIdModal,
    BankPayoutModal,
    CryptoTradingModal,
    ActionBtn,
};
