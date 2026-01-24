'use client';

import React, { useState, useEffect } from 'react';
import { Code, Activity, Send, CheckCircle, XCircle, ExternalLink } from 'lucide-react';
import { checkContractStatus, getContractInfo } from '@/lib/contractService';

interface ContractInfo {
    contractId: string;
    adminAddress: string;
    network: string;
}

interface ContractStatusInfo {
    isConfigured: boolean;
    isAccessible: boolean;
    error?: string;
}

export default function ContractInteraction() {
    const [contractInfo, setContractInfo] = useState<ContractInfo | null>(null);
    const [contractStatus, setContractStatus] = useState<ContractStatusInfo | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadContractData();
    }, []);

    const loadContractData = async () => {
        setLoading(true);
        try {
            const [info, status] = await Promise.all([
                getContractInfo(),
                checkContractStatus(),
            ]);
            setContractInfo(info);
            setContractStatus(status);
        } catch (error) {
            console.error('Failed to load contract data:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <div className="animate-pulse space-y-4">
                    <div className="h-6 bg-white/10 rounded w-1/3"></div>
                    <div className="h-4 bg-white/10 rounded w-2/3"></div>
                    <div className="h-4 bg-white/10 rounded w-1/2"></div>
                </div>
            </div>
        );
    }

    if (!contractInfo || !contractStatus) {
        return null;
    }

    return (
        <div className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 border border-purple-500/20 rounded-2xl p-6">
            <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center shrink-0">
                    <Code className="text-purple-400" size={24} />
                </div>
                <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-1">Smart Contract</h3>
                    <p className="text-sm text-gray-400">Soroban contract on Stellar Testnet</p>
                </div>
                <div className="flex items-center gap-2">
                    {contractStatus.isConfigured && contractStatus.isAccessible ? (
                        <>
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                            <span className="text-xs text-green-400 font-medium">Active</span>
                        </>
                    ) : (
                        <>
                            <div className="w-2 h-2 bg-red-500 rounded-full" />
                            <span className="text-xs text-red-400 font-medium">Inactive</span>
                        </>
                    )}
                </div>
            </div>

            <div className="space-y-4">
                <div className="bg-black/20 rounded-xl p-4">
                    <p className="text-xs text-gray-400 mb-2">Contract ID</p>
                    <div className="flex items-center gap-2">
                        <code className="text-sm text-purple-400 font-mono break-all flex-1">
                            {contractInfo.contractId}
                        </code>
                        <button
                            onClick={() => navigator.clipboard.writeText(contractInfo.contractId)}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors shrink-0"
                            title="Copy Contract ID"
                        >
                            <Activity size={16} className="text-gray-400" />
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-black/20 rounded-xl p-4">
                        <p className="text-xs text-gray-400 mb-2">Network</p>
                        <p className="text-sm text-white font-medium">{contractInfo.network.toUpperCase()}</p>
                    </div>
                    <div className="bg-black/20 rounded-xl p-4">
                        <p className="text-xs text-gray-400 mb-2">Status</p>
                        <div className="flex items-center gap-2">
                            {contractStatus.isAccessible ? (
                                <>
                                    <CheckCircle size={16} className="text-green-400" />
                                    <span className="text-sm text-green-400">Accessible</span>
                                </>
                            ) : (
                                <>
                                    <XCircle size={16} className="text-red-400" />
                                    <span className="text-sm text-red-400">Error</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {contractStatus.error && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                        <p className="text-sm text-red-400">{contractStatus.error}</p>
                    </div>
                )}

                <div className="flex flex-wrap gap-3 pt-2">
                    <a
                        href={`https://stellar.expert/explorer/testnet/contract/${contractInfo.contractId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 rounded-lg text-sm text-purple-400 transition-all"
                    >
                        <ExternalLink size={16} />
                        Stellar Expert
                    </a>
                    <a
                        href={`https://lab.stellar.org/r/testnet/contract/${contractInfo.contractId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-lg text-sm text-blue-400 transition-all"
                    >
                        <ExternalLink size={16} />
                        Stellar Lab
                    </a>
                </div>

                <div className="pt-4 border-t border-white/5">
                    <p className="text-xs text-gray-500 mb-2">
                        This smart contract powers secure payments and transaction management on the Stellar network.
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                        <Send size={12} />
                        <span>Soroban smart contract technology</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
