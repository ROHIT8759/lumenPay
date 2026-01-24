'use client';

import React, { useState } from 'react';
import { Search, X } from 'lucide-react';
import { isValidStellarAddress, isValidTransactionHash } from '@/lib/horizonService';

interface SearchBarProps {
    onSearch: (query: string, type: 'transaction' | 'account' | 'unknown') => void;
}

export default function ExpoSearchBar({ onSearch }: SearchBarProps) {
    const [query, setQuery] = useState('');
    const [error, setError] = useState('');

    const handleSearch = () => {
        if (!query.trim()) {
            setError('Please enter a search query');
            return;
        }

        setError('');

        
        if (isValidTransactionHash(query.trim())) {
            onSearch(query.trim(), 'transaction');
        } else if (isValidStellarAddress(query.trim())) {
            onSearch(query.trim(), 'account');
        } else {
            
            onSearch(query.trim(), 'unknown');
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    const clearSearch = () => {
        setQuery('');
        setError('');
    };

    return (
        <div className="w-full max-w-2xl">
            <div className="relative">
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Search by transaction hash, wallet address, or Pay ID..."
                    className="w-full px-4 py-3 pl-12 pr-12 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-white/30 transition-colors"
                />
                <Search
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
                    size={20}
                />
                {query && (
                    <button
                        onClick={clearSearch}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                )}
            </div>

            {error && (
                <p className="mt-2 text-sm text-red-400">{error}</p>
            )}

            <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                <span className="px-2 py-1 bg-white/5 rounded">Transaction Hash</span>
                <span className="px-2 py-1 bg-white/5 rounded">Wallet Address</span>
                <span className="px-2 py-1 bg-white/5 rounded">Pay ID</span>
            </div>
        </div>
    );
}
