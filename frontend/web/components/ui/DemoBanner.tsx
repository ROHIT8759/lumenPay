'use client';

import { AlertCircle, Database } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function DemoBanner() {
    const [isDemoMode, setIsDemoMode] = useState(false);

    useEffect(() => {
        
        fetch('/api/rwa/assets?featured=true')
            .then(res => res.json())
            .then(data => {
                if (data.demo) {
                    setIsDemoMode(true);
                }
            })
            .catch(() => {
                
                setIsDemoMode(true);
            });
    }, []);

    if (!isDemoMode) return null;

    return (
        <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500/10 backdrop-blur-sm border-b border-amber-500/20">
            <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-center gap-3 text-sm">
                <Database className="text-amber-400" size={16} />
                <span className="text-amber-200/90">
                    <span className="font-semibold">Demo Mode:</span> Using mock data.{' '}
                    <a
                        href="https://supabase.com/dashboard"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline hover:text-amber-100 transition-colors"
                    >
                        Configure Supabase
                    </a>
                    {' '}to enable full functionality.
                </span>
                <AlertCircle className="text-amber-400" size={16} />
            </div>
        </div>
    );
}
