'use client';



import React, { useState } from 'react';
import { useWallet } from './WalletProvider';
import { transactionBuilder, signingEngine, networkProvider } from '@/lib/lumenVault';
import { ArrowLeft, Loader2, Code, Play, CheckCircle, AlertCircle } from 'lucide-react';
import { ApprovalModal } from './ApprovalModal';

import { nativeToScVal } from '@stellar/stellar-sdk';


type ParamType = 'string' | 'number' | 'address' | 'symbol' | 'boolean';

interface ContractParam {
    name: string;
    type: ParamType;
    value: string;
}

interface ContractResult {
    status: 'success' | 'error';
    value?: string;
    error?: string;
    txHash?: string;
}

export function SmartContractInterface({ onBack }: { onBack: () => void }) {
    const { publicKey, network } = useWallet();
    const [contractAddress, setContractAddress] = useState('');
    const [method, setMethod] = useState('');
    const [params, setParams] = useState<ContractParam[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [status, setStatus] = useState<'idle' | 'confirming' | 'submitting' | 'result'>('idle');
    const [result, setResult] = useState<ContractResult | null>(null);


    const [pendingTx, setPendingTx] = useState<{ xdr: string, metadata: any } | null>(null);

    const addParam = () => {
        setParams([...params, { name: `param${params.length + 1}`, type: 'string', value: '' }]);
    };

    const removeParam = (index: number) => {
        const newParams = [...params];
        newParams.splice(index, 1);
        setParams(newParams);
    };

    const updateParam = (index: number, field: keyof ContractParam, val: string) => {
        const newParams = [...params];

        newParams[index][field] = val;
        setParams(newParams);
    };


    const convertParamsToScVal = (params: ContractParam[]) => {
        return params.map(p => {
            let val: any = p.value;
            if (p.type === 'number') val = parseFloat(p.value);
            if (p.type === 'boolean') val = p.value.toLowerCase() === 'true';




            return nativeToScVal(val);
        });
    };

    const handleBuildTx = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!contractAddress || !method || !publicKey) return;

        setIsProcessing(true);
        setResult(null);
        setStatus('idle');

        try {

            const scValArgs = convertParamsToScVal(params);

            const buildResult = await transactionBuilder.buildContractCallTransaction({
                sourcePublicKey: publicKey,
                contractAddress,
                method,
                args: scValArgs,
                memo: 'LumenVault Call'
            });

            if (buildResult.error || !buildResult.xdr) {
                throw new Error(buildResult.error || 'Failed to build contract call');
            }

            setPendingTx(buildResult);
            setStatus('confirming');

        } catch (e: any) {
            setResult({ status: 'error', error: e.message });
            setStatus('result');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleConfirmExecute = async () => {
        if (!pendingTx) return;

        setIsProcessing(true);

        try {

            const signedResult = await signingEngine.signTransactionWithSession(pendingTx.xdr, network);
            if (signedResult.error) throw new Error(signedResult.error);


            setStatus('submitting');
            const submitResult = await networkProvider.submitTransaction(signedResult.signedTransaction.signedXDR);

            if (submitResult.error) throw new Error(submitResult.error);

            setResult({
                status: 'success',
                value: 'Function executed successfully',
                txHash: submitResult.hash
            });
            setStatus('result');

        } catch (e: any) {
            setResult({ status: 'error', error: e.message });
            setStatus('result');
        } finally {
            setIsProcessing(false);
        }
    };

    if (status === 'result' && result) {
        return (
            <div className="p-6 h-full flex flex-col items-center justify-center text-center space-y-6">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center ${result.status === 'success' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                    }`}>
                    {result.status === 'success' ? <CheckCircle size={32} /> : <AlertCircle size={32} />}
                </div>

                <div>
                    <h2 className="text-xl font-bold">
                        {result.status === 'success' ? 'Execution Successful' : 'Execution Failed'}
                    </h2>
                    <p className="text-gray-500 mt-2 text-sm break-words max-w-xs mx-auto">
                        {result.status === 'success' ? result.value : result.error}
                    </p>
                </div>

                {result.txHash && (
                    <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg w-full">
                        <p className="text-xs text-gray-500 mb-1">Transaction Hash</p>
                        <p className="font-mono text-xs truncate">{result.txHash}</p>
                    </div>
                )}

                <button
                    onClick={() => { setStatus('idle'); setContractAddress(''); setMethod(''); }}
                    className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium"
                >
                    New Call
                </button>
                <button
                    onClick={onBack}
                    className="text-gray-500 text-sm hover:text-gray-900"
                >
                    Back to Dashboard
                </button>
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
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Code size={20} className="text-purple-500" /> Smart Contract
                    </h2>
                </div>

                <form onSubmit={handleBuildTx} className="space-y-6 flex-1 overflow-y-auto pb-4">

                    { }
                    <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase text-gray-500">Contract Address</label>
                        <input
                            type="text"
                            value={contractAddress}
                            onChange={(e) => setContractAddress(e.target.value)}
                            placeholder="C..."
                            className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 font-mono text-xs"
                        />
                    </div>

                    { }
                    <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase text-gray-500">Function Name</label>
                        <input
                            type="text"
                            value={method}
                            onChange={(e) => setMethod(e.target.value)}
                            placeholder="e.g. transfer"
                            className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 font-mono text-sm"
                        />
                    </div>

                    { }
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-semibold uppercase text-gray-500">Parameters</label>
                            <button type="button" onClick={addParam} className="text-xs text-blue-600 font-medium hover:underline">
                                + Add Param
                            </button>
                        </div>

                        {params.length === 0 && (
                            <p className="text-xs text-gray-400 italic">No parameters (void)</p>
                        )}

                        {params.map((p, idx) => (
                            <div key={idx} className="flex gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                <select
                                    value={p.type}
                                    onChange={(e) => updateParam(idx, 'type', e.target.value)}
                                    className="bg-transparent text-xs font-mono outline-none border-r border-gray-200 dark:border-gray-700 pr-2"
                                >
                                    <option value="string">String</option>
                                    <option value="number">Number</option>
                                    <option value="address">Address</option>
                                    <option value="symbol">Symbol</option>
                                    <option value="boolean">Boolean</option>
                                </select>
                                {p.type === 'boolean' ? (
                                    <select
                                        value={p.value}
                                        onChange={(e) => updateParam(idx, 'value', e.target.value)}
                                        className="flex-1 bg-transparent text-sm outline-none"
                                    >
                                        <option value="">Select...</option>
                                        <option value="true">True</option>
                                        <option value="false">False</option>
                                    </select>
                                ) : (
                                    <input
                                        type="text"
                                        value={p.value}
                                        onChange={(e) => updateParam(idx, 'value', e.target.value)}
                                        placeholder="Value"
                                        className="flex-1 bg-transparent text-sm outline-none"
                                    />
                                )}
                                <button type="button" onClick={() => removeParam(idx)} className="text-red-500 px-2 hover:bg-red-50 rounded">
                                    &times;
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className="flex-1"></div>

                    <button
                        type="submit"
                        disabled={isProcessing || !contractAddress || !method}
                        className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold shadow-lg shadow-purple-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {isProcessing && status === 'idle' ? (
                            <>
                                <Loader2 className="animate-spin" /> Preparing...
                            </>
                        ) : (
                            <>
                                <Play size={16} fill="currentColor" /> Invoke Contract
                            </>
                        )}
                    </button>
                </form>
            </div>

            {status === 'confirming' && pendingTx && (
                <ApprovalModal
                    isOpen={true}
                    type="contract"
                    details={{
                        contractAddress: contractAddress,
                        method: method,
                        fee: pendingTx.metadata.fee,
                        network: network
                    }}
                    onApprove={handleConfirmExecute}
                    onReject={() => {
                        setStatus('idle');
                        setPendingTx(null);
                    }}
                    isProcessing={isProcessing}
                />
            )}
        </>
    );
}
