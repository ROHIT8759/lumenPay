'use client';



import React, { useState } from 'react';
import { useWallet } from './WalletProvider';
import { transactionBuilder, signingEngine, networkProvider } from '@/lib/lumenVault';
import { ArrowLeft, Loader2, Send } from 'lucide-react';
import { ApprovalModal } from './ApprovalModal';

interface SendPaymentProps {
    onBack: () => void;
}

export function SendPayment({ onBack }: SendPaymentProps) {
    const { publicKey, balances, network } = useWallet();
    const [recipient, setRecipient] = useState('');
    const [amount, setAmount] = useState('');
    const [asset, setAsset] = useState('XLM'); 
    const [memo, setMemo] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState<'idle' | 'building' | 'confirming' | 'signing' | 'sending' | 'success' | 'error'>('idle');
    const [errorDetails, setErrorDetails] = useState('');
    const [txHash, setTxHash] = useState('');

    
    const [pendingTx, setPendingTx] = useState<{ xdr: string, metadata: any } | null>(null);

    const handleBuildTx = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!publicKey) return;

        setStatus('building');
        setIsLoading(true);
        setErrorDetails('');

        try {
            
            const buildResult = await transactionBuilder.buildPaymentTransaction({
                sourcePublicKey: publicKey,
                destinationPublicKey: recipient,
                amount: amount,
                assetCode: asset === 'XLM' ? undefined : asset,
                assetIssuer: asset === 'USDC' ? 'GBUQWP3BOUZX34LOCALCOMMERCIAL' : undefined, 
                memo: memo || undefined,
            });

            if (buildResult.error || !buildResult.xdr) {
                throw new Error(buildResult.error || 'Failed to build transaction');
            }

            setPendingTx(buildResult);
            setStatus('confirming');

        } catch (e: any) {
            console.error(e);
            setStatus('error');
            setErrorDetails(e.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleConfirmSend = async () => {
        if (!pendingTx) return;

        setStatus('signing');
        setIsLoading(true); 

        try {
            
            
            

            const signedResult = await signingEngine.signTransactionWithSession(pendingTx.xdr, network);

            if (signedResult.error) {
                
                throw new Error(signedResult.error);
            }

            
            setStatus('sending');
            const submitResult = await networkProvider.submitTransaction(signedResult.signedTransaction.signedXDR);

            if (submitResult.error) {
                throw new Error(submitResult.error);
            }

            setTxHash(submitResult.hash);
            setStatus('success');

            
            setTimeout(() => {
                onBack();
            }, 3000);

        } catch (e: any) {
            console.error(e);
            setStatus('error');
            setErrorDetails(e.message);
        } finally {
            setIsLoading(false);
        }
    };

    if (status === 'success') {
        return (
            <div className="p-8 text-center flex flex-col items-center justify-center h-full">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                    <Send className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-green-700">Sent Successfully!</h2>
                <p className="text-gray-500 mt-2">Transaction ID:</p>
                <p className="font-mono text-xs bg-gray-100 p-2 rounded mt-1 truncate max-w-xs">{txHash}</p>
            </div>
        );
    }

    return (
        <>
            <div className={`p-6 h-full flex flex-col ${status === 'confirming' ? 'blur-sm' : ''}`}>
                <div className="flex items-center gap-2 mb-6">
                    <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full">
                        <ArrowLeft size={20} />
                    </button>
                    <h2 className="text-xl font-bold">Send Payment</h2>
                </div>

                <form onSubmit={handleBuildTx} className="space-y-6 flex-1">
                    {}
                    <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-2xl flex flex-col items-center justify-center">
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0.00"
                            className="bg-transparent text-4xl font-bold text-center outline-none w-full"
                            autoFocus
                        />
                        <div className="flex items-center gap-2 mt-2 bg-white dark:bg-gray-700 rounded-full px-3 py-1 shadow-sm">
                            <select
                                value={asset}
                                onChange={(e) => setAsset(e.target.value)}
                                className="bg-transparent text-sm font-medium outline-none"
                            >
                                <option value="XLM">XLM</option>
                                <option value="USDC">USDC</option>
                            </select>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">Available: {asset === 'XLM' ? balances.native : balances.usdc}</p>
                    </div>

                    {}
                    <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase text-gray-500">To</label>
                        <input
                            type="text"
                            value={recipient}
                            onChange={(e) => setRecipient(e.target.value)}
                            placeholder="Stellar address (G...)"
                            className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                        />
                    </div>

                    {}
                    <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase text-gray-500">Memo (Optional)</label>
                        <input
                            type="text"
                            value={memo}
                            onChange={(e) => setMemo(e.target.value)}
                            placeholder="Reference"
                            className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {status === 'error' && (
                        <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm break-words">
                            Error: {errorDetails}
                        </div>
                    )}

                    <div className="flex-1"></div>

                    <button
                        type="submit"
                        disabled={isLoading || !recipient || !amount}
                        className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {isLoading && status === 'building' ? (
                            <>
                                <Loader2 className="animate-spin" /> Preparing...
                            </>
                        ) : (
                            'Review Payment'
                        )}
                    </button>
                </form>
            </div>

            {}
            {status === 'confirming' && pendingTx && (
                <ApprovalModal
                    isOpen={true}
                    type="payment"
                    details={{
                        amount: amount,
                        asset: asset,
                        recipient: recipient,
                        fee: pendingTx.metadata.fee || '0.0000100',
                        network: network
                    }}
                    onApprove={handleConfirmSend}
                    onReject={() => {
                        setStatus('idle');
                        setPendingTx(null);
                    }}
                    isProcessing={isLoading && status === 'signing'}
                />
            )}
        </>
    );
}
