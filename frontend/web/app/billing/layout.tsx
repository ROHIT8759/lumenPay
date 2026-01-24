'use client';

import React from 'react';
import StarfieldBackground from '@/components/ui/StarfieldBackground';
import Navbar from '@/components/layout/Navbar';
import MobileTopBar from '@/components/layout/MobileTopBar';

export default function BillingLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <>
            <StarfieldBackground />
            <MobileTopBar />
            <main className="min-h-screen pt-16 md:pt-20 pb-20 md:pb-10 px-4 sm:px-6 lg:px-8 max-w-md sm:max-w-2xl lg:max-w-4xl xl:max-w-6xl mx-auto">
                {children}
            </main>
            <Navbar />
        </>
    );
}
