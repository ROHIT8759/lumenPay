/**
 * RWA Asset Card Component
 * 
 * Displays a tokenized real-world asset with key information
 * and investment actions.
 */

'use client';

import React from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
    Building2,
    Coins,
    TrendingUp,
    Clock,
    Shield,
    Users,
    ExternalLink
} from 'lucide-react';
import { RWAAsset, AssetType } from '@/lib/rwaService';
import { formatDistanceToNow } from 'date-fns';

interface RWAAssetCardProps {
    asset: RWAAsset;
    onInvest?: (assetId: string) => void;
    onViewDetails?: (assetId: string) => void;
}

const assetTypeIcons: Record<AssetType, React.ReactNode> = {
    RealEstate: <Building2 className="w-5 h-5" />,
    Commodity: <Coins className="w-5 h-5" />,
    Security: <TrendingUp className="w-5 h-5" />,
    Bond: <Shield className="w-5 h-5" />,
    Art: <span className="text-lg">🎨</span>,
    Collectible: <span className="text-lg">💎</span>,
    Invoice: <span className="text-lg">📄</span>,
    Equipment: <span className="text-lg">⚙️</span>,
    IntellectualProperty: <span className="text-lg">💡</span>,
    Other: <Coins className="w-5 h-5" />,
};

const assetTypeColors: Record<AssetType, string> = {
    RealEstate: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    Commodity: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    Security: 'bg-green-500/10 text-green-500 border-green-500/20',
    Bond: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    Art: 'bg-pink-500/10 text-pink-500 border-pink-500/20',
    Collectible: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
    Invoice: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    Equipment: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
    IntellectualProperty: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
    Other: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
};

export function RWAAssetCard({ asset, onInvest, onViewDetails }: RWAAssetCardProps) {
    const totalSupply = BigInt(asset.totalSupply);
    const circulatingSupply = BigInt(asset.circulatingSupply);
    const soldPercentage = totalSupply > 0n
        ? Number((circulatingSupply * 100n) / totalSupply)
        : 0;

    const tokenPrice = totalSupply > 0n
        ? Number(BigInt(asset.assetValueUsd) / totalSupply) / 100 // Convert cents to USD
        : 0;

    const minInvestmentUsd = Number(asset.minInvestment) * tokenPrice;

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
        }).format(value);
    };

    const formatLargeNumber = (value: string) => {
        const num = Number(value);
        if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
        if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
        if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
        return num.toFixed(2);
    };

    return (
        <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300 border-border/50">
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${assetTypeColors[asset.assetType]}`}>
                            {assetTypeIcons[asset.assetType]}
                        </div>
                        <div>
                            <CardTitle className="text-lg font-semibold">{asset.name}</CardTitle>
                            <p className="text-sm text-muted-foreground">{asset.symbol}</p>
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                        <Badge variant={asset.isActive ? 'default' : 'secondary'}>
                            {asset.isActive ? 'Active' : 'Closed'}
                        </Badge>
                        {asset.accreditedOnly && (
                            <Badge variant="outline" className="text-xs">
                                <Shield className="w-3 h-3 mr-1" />
                                Accredited Only
                            </Badge>
                        )}
                    </div>
                </div>
            </CardHeader>

            <CardContent className="space-y-4">
                {/* Asset Value */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Total Value</p>
                        <p className="text-xl font-bold text-primary">
                            {formatCurrency(Number(asset.assetValueUsd) / 100)}
                        </p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Token Price</p>
                        <p className="text-xl font-bold">
                            {formatCurrency(tokenPrice)}
                        </p>
                    </div>
                </div>

                {/* Supply Progress */}
                <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Tokens Sold</span>
                        <span className="font-medium">{soldPercentage.toFixed(1)}%</span>
                    </div>
                    <Progress value={soldPercentage} className="h-2" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{formatLargeNumber(asset.circulatingSupply)} sold</span>
                        <span>{formatLargeNumber(asset.totalSupply)} total</span>
                    </div>
                </div>

                {/* Asset Details */}
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/50">
                    <div className="flex items-center gap-2 text-sm">
                        <Coins className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Min:</span>
                        <span className="font-medium">
                            {formatCurrency(minInvestmentUsd)}
                        </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Updated:</span>
                        <span className="font-medium">
                            {formatDistanceToNow(asset.lastValuation, { addSuffix: true })}
                        </span>
                    </div>
                </div>

                {/* Asset Type Badge */}
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className={assetTypeColors[asset.assetType]}>
                        {asset.assetType.replace(/([A-Z])/g, ' $1').trim()}
                    </Badge>
                    {!asset.isTransferable && (
                        <Badge variant="destructive" className="text-xs">
                            Non-Transferable
                        </Badge>
                    )}
                </div>
            </CardContent>

            <CardFooter className="pt-4 border-t border-border/50 gap-2">
                <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => onViewDetails?.(asset.assetId)}
                >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Details
                </Button>
                <Button
                    className="flex-1"
                    onClick={() => onInvest?.(asset.assetId)}
                    disabled={!asset.isActive || soldPercentage >= 100}
                >
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Invest
                </Button>
            </CardFooter>
        </Card>
    );
}

export default RWAAssetCard;
