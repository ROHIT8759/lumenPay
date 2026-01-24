'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle, XCircle, RefreshCcw, DollarSign, Settings, Terminal } from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';

interface Log {
    id: number;
    time: string;
    type: 'info' | 'success' | 'warning' | 'error';
    message: string;
}

export default function AdminPage() {
    const [logs, setLogs] = useState<Log[]>([
        { id: 1, time: '10:00:23', type: 'info', message: 'Admin console initialized' },
        { id: 2, time: '10:00:24', type: 'info', message: 'Connected to Stellar Testnet' },
    ]);

    const addLog = (message: string, type: Log['type'] = 'info') => {
        const now = new Date();
        const time = `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`;
        setLogs(prev => [{ id: Date.now(), time, type, message }, ...prev]);
    };

    const handleAction = (action: string) => {
        addLog(`Executing action: ${action}...`, 'warning');
        setTimeout(() => {
            if (action === 'Fail Next Payment') {
                addLog(`Action scheduled: Next payment will fail`, 'success');
            } else {
                addLog(`Action completed: ${action}`, 'success');
            }
        }, 800);
    };

    return (
        <div className="container mx-auto px-4 py-8 max-w-6xl">
            <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-red-500/10 rounded-xl border border-red-500/20 text-red-400">
                    <Settings size={24} />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-white">Admin Console</h1>
                    <p className="text-gray-400">Judge Mode Controls & System Overrides</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {}
                <div className="space-y-6">
                    <GlassCard className="p-6">
                        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <AlertTriangle className="text-warning" size={20} />
                            Settlement Controls
                        </h2>
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => handleAction('Force Settle All')}
                                className="p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-left transition-colors group"
                            >
                                <div className="flex justify-between mb-2">
                                    <CheckCircle className="text-success group-hover:scale-110 transition-transform" />
                                </div>
                                <div className="font-bold text-white">Force Settle</div>
                                <div className="text-xs text-gray-500">Clear all pending txs</div>
                            </button>

                            <button
                                onClick={() => handleAction('Fail Next Payment')}
                                className="p-4 bg-white/5 hover:bg-red-500/10 border border-white/10 hover:border-red-500/30 rounded-xl text-left transition-colors group"
                            >
                                <div className="flex justify-between mb-2">
                                    <XCircle className="text-error group-hover:scale-110 transition-transform" />
                                </div>
                                <div className="font-bold text-white group-hover:text-red-400">Fail Payment</div>
                                <div className="text-xs text-gray-500">Trigger failure state</div>
                            </button>
                        </div>
                    </GlassCard>

                    <GlassCard className="p-6">
                        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <DollarSign className="text-accent" size={20} />
                            Market Overrides
                        </h2>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-3 bg-black/40 rounded-lg border border-white/5">
                                <span className="text-gray-400">USDC / INR Rate</span>
                                <div className="flex items-center gap-2">
                                    <span className="font-mono text-accent">₹83.45</span>
                                    <button onClick={() => handleAction('Override FX Rate')} className="text-xs bg-white/10 px-2 py-1 rounded hover:bg-white/20">Edit</button>
                                </div>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-black/40 rounded-lg border border-white/5">
                                <span className="text-gray-400">Gas Price</span>
                                <div className="flex items-center gap-2">
                                    <span className="font-mono text-success">Low (100 stroops)</span>
                                    <button onClick={() => handleAction('Spike Gas Fees')} className="text-xs bg-white/10 px-2 py-1 rounded hover:bg-white/20">Spike</button>
                                </div>
                            </div>
                        </div>
                    </GlassCard>
                </div>

                {}
                <div className="h-full">
                    <GlassCard className="h-full min-h-[500px] flex flex-col bg-black/80 border-white/10">
                        <div className="p-4 border-b border-white/10 flex justify-between items-center">
                            <div className="flex items-center gap-2 text-gray-400">
                                <Terminal size={16} />
                                <span className="font-mono text-sm">System Logs</span>
                            </div>
                            <button onClick={() => setLogs([])} className="text-xs text-gray-500 hover:text-white">Clear</button>
                        </div>
                        <div className="flex-1 p-4 font-mono text-xs overflow-auto space-y-2">
                            {logs.map((log) => (
                                <div key={log.id} className="flex gap-3">
                                    <span className="text-gray-600 select-none">[{log.time}]</span>
                                    <span className={
                                        log.type === 'info' ? 'text-blue-400' :
                                            log.type === 'success' ? 'text-green-400' :
                                                log.type === 'warning' ? 'text-yellow-400' :
                                                    'text-red-400'
                                    }>
                                        {log.message}
                                    </span>
                                </div>
                            ))}
                            {logs.length === 0 && <span className="text-gray-700 italic">No active logs...</span>}
                        </div>
                    </GlassCard>
                </div>
            </div>
        </div>
    );
}
