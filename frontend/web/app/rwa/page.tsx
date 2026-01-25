/**
 * RWA (Real World Assets) Page
 * 
 * Main page for the RWA marketplace where users can browse and invest
 * in tokenized real-world assets.
 */

'use client';

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RWAMarketplace, RWAPortfolio } from '@/components/rwa';
import { Building2, Wallet, TrendingUp } from 'lucide-react';

export default function RWAPage() {
    // In production, this would come from the auth context/wallet connection
    const [walletAddress, setWalletAddress] = useState<string | undefined>(undefined);

    const handleInvest = (assetId: string) => {
        // Navigate to investment page with asset ID
        window.location.href = `/rwa/invest/${assetId}`;
    };

    const handleClaimDistribution = async (distributionId: string) => {
        // Handle dividend claim
        console.log('Claiming distribution:', distributionId);
        // In production, this would call the rwaService with the user's keypair
    };

    const handleTransfer = (assetId: string) => {
        // Navigate to transfer page
        window.location.href = `/rwa/transfer/${assetId}`;
    };

    return (
        <div className="container mx-auto px-4 py-8 max-w-7xl">
            <Tabs defaultValue="marketplace" className="w-full">
                <TabsList className="grid w-full max-w-md grid-cols-2 mb-8">
                    <TabsTrigger value="marketplace" className="flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        Marketplace
                    </TabsTrigger>
                    <TabsTrigger value="portfolio" className="flex items-center gap-2">
                        <Wallet className="w-4 h-4" />
                        My Portfolio
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="marketplace">
                    <RWAMarketplace
                        walletAddress={walletAddress}
                        onInvest={handleInvest}
                    />
                </TabsContent>

                <TabsContent value="portfolio">
                    {walletAddress ? (
                        <RWAPortfolio
                            walletAddress={walletAddress}
                            onClaimDistribution={handleClaimDistribution}
                            onTransfer={handleTransfer}
                        />
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <Wallet className="w-16 h-16 text-muted-foreground mb-6" />
                            <h2 className="text-2xl font-bold mb-2">Connect Your Wallet</h2>
                            <p className="text-muted-foreground max-w-md mb-6">
                                Connect your Stellar wallet to view your RWA portfolio, track investments,
                                and claim dividends.
                            </p>
                            <div className="flex gap-4">
                                <button
                                    className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
                                    onClick={() => {
                                        // Demo: Set a mock wallet address
                                        setWalletAddress('GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN7');
                                    }}
                                >
                                    Connect Wallet
                                </button>
                            </div>
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
