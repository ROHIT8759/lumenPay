/**
 * RWA Portfolio Component
 * 
 * Displays investor's RWA holdings, portfolio value, and unclaimed dividends.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Wallet,
    TrendingUp,
    TrendingDown,
    DollarSign,
    Gift,
    RefreshCw,
    ExternalLink,
    Clock,
    Building2,
} from 'lucide-react';
import {
    RWAPortfolio as PortfolioType,
    Holding,
    Distribution,
    rwaService
} from '@/lib/rwaService';
import { formatDistanceToNow } from 'date-fns';

interface RWAPortfolioProps {
    walletAddress: string;
    onClaimDistribution?: (distributionId: string) => void;
    onTransfer?: (assetId: string) => void;
}

export function RWAPortfolio({
    walletAddress,
    onClaimDistribution,
    onTransfer
}: RWAPortfolioProps) {
    const [portfolio, setPortfolio] = useState<PortfolioType | null>(null);
    const [distributions, setDistributions] = useState<Distribution[]>([]);
    const [loading, setLoading] = useState(true);
    const [claimingId, setClaimingId] = useState<string | null>(null);

    useEffect(() => {
        if (walletAddress) {
            loadPortfolio();
            loadDistributions();
        }
    }, [walletAddress]);

    const loadPortfolio = async () => {
        setLoading(true);
        try {
            const data = await rwaService.getPortfolio(walletAddress);
            setPortfolio(data);
        } catch (error) {
            console.error('Failed to load portfolio:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadDistributions = async () => {
        try {
            const data = await rwaService.getAvailableDistributions(walletAddress);
            setDistributions(data);
        } catch (error) {
            console.error('Failed to load distributions:', error);
        }
    };

    const handleClaimDistribution = async (distributionId: string) => {
        if (onClaimDistribution) {
            onClaimDistribution(distributionId);
            return;
        }

        setClaimingId(distributionId);
        try {
            // Note: In real implementation, this would use the keypair
            // For now, we just show the UI flow
            console.log('Claiming distribution:', distributionId);
            await loadDistributions();
            await loadPortfolio();
        } catch (error) {
            console.error('Failed to claim distribution:', error);
        } finally {
            setClaimingId(null);
        }
    };

    const formatCurrency = (value: string) => {
        const num = Number(value) / 100; // Convert cents to USD
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(num);
    };

    const calculatePnL = (holding: Holding): { value: number; percentage: number } => {
        const currentValue = Number(holding.currentValue || '0');
        const costBasis = Number(holding.amount) * Number(holding.purchasePrice);
        const pnl = currentValue - costBasis;
        const percentage = costBasis > 0 ? (pnl / costBasis) * 100 : 0;
        return { value: pnl, percentage };
    };

    if (loading) {
        return (
            <div className="space-y-6">
                {/* Loading skeleton */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[1, 2, 3].map((i) => (
                        <Card key={i} className="animate-pulse">
                            <CardContent className="pt-6">
                                <div className="h-12 bg-muted rounded" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
                <Card className="animate-pulse">
                    <CardContent className="pt-6">
                        <div className="h-48 bg-muted rounded" />
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!portfolio) {
        return (
            <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                    <Wallet className="w-12 h-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Portfolio Found</h3>
                    <p className="text-muted-foreground text-center max-w-md">
                        Connect your wallet to view your RWA portfolio.
                    </p>
                </CardContent>
            </Card>
        );
    }

    const totalPnL = portfolio.holdings.reduce((sum, h) => {
        const { value } = calculatePnL(h);
        return sum + value;
    }, 0);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">Your RWA Portfolio</h2>
                    <p className="text-muted-foreground">
                        Track your tokenized real-world asset investments
                    </p>
                </div>
                <Button onClick={loadPortfolio} variant="outline" disabled={loading}>
                    <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            {/* Portfolio Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Total Value</p>
                                <p className="text-2xl font-bold">
                                    {formatCurrency(portfolio.totalValueUsd)}
                                </p>
                            </div>
                            <div className="p-3 rounded-full bg-primary/10">
                                <Wallet className="w-6 h-6 text-primary" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Total P&L</p>
                                <p className={`text-2xl font-bold ${totalPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                    {totalPnL >= 0 ? '+' : ''}{formatCurrency(String(Math.round(totalPnL * 100)))}
                                </p>
                            </div>
                            <div className={`p-3 rounded-full ${totalPnL >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                                {totalPnL >= 0 ? (
                                    <TrendingUp className="w-6 h-6 text-green-500" />
                                ) : (
                                    <TrendingDown className="w-6 h-6 text-red-500" />
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Unclaimed Dividends</p>
                                <p className="text-2xl font-bold text-orange-500">
                                    {formatCurrency(portfolio.unclaimedDividends)}
                                </p>
                            </div>
                            <div className="p-3 rounded-full bg-orange-500/10">
                                <Gift className="w-6 h-6 text-orange-500" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Assets Held</p>
                                <p className="text-2xl font-bold">{portfolio.assetCount}</p>
                            </div>
                            <div className="p-3 rounded-full bg-blue-500/10">
                                <Building2 className="w-6 h-6 text-blue-500" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Holdings Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Your Holdings</CardTitle>
                </CardHeader>
                <CardContent>
                    {portfolio.holdings.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Asset</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                    <TableHead className="text-right">Avg. Price</TableHead>
                                    <TableHead className="text-right">Current Value</TableHead>
                                    <TableHead className="text-right">P&L</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {portfolio.holdings.map((holding) => {
                                    const pnl = calculatePnL(holding);
                                    const isLocked = holding.lockedUntil > new Date();

                                    return (
                                        <TableRow key={`${holding.assetId}-${holding.investor}`}>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <div className="p-2 bg-primary/10 rounded">
                                                        <Building2 className="w-4 h-4 text-primary" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium">Asset #{holding.assetId}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            Acquired {formatDistanceToNow(holding.acquiredAt, { addSuffix: true })}
                                                        </p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right font-medium">
                                                {Number(holding.amount).toLocaleString()}
                                                {isLocked && (
                                                    <Badge variant="outline" className="ml-2 text-xs">
                                                        <Clock className="w-3 h-3 mr-1" />
                                                        Locked
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {formatCurrency(holding.purchasePrice)}
                                            </TableCell>
                                            <TableCell className="text-right font-medium">
                                                {formatCurrency(holding.currentValue || '0')}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className={pnl.value >= 0 ? 'text-green-500' : 'text-red-500'}>
                                                    <p className="font-medium">
                                                        {pnl.value >= 0 ? '+' : ''}{formatCurrency(String(Math.round(pnl.value * 100)))}
                                                    </p>
                                                    <p className="text-xs">
                                                        ({pnl.percentage >= 0 ? '+' : ''}{pnl.percentage.toFixed(2)}%)
                                                    </p>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => window.location.href = `/rwa/asset/${holding.assetId}`}
                                                    >
                                                        <ExternalLink className="w-3 h-3" />
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => onTransfer?.(holding.assetId)}
                                                        disabled={isLocked}
                                                    >
                                                        Transfer
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12">
                            <Wallet className="w-12 h-12 text-muted-foreground mb-4" />
                            <h3 className="text-lg font-semibold mb-2">No Holdings Yet</h3>
                            <p className="text-muted-foreground text-center max-w-md mb-4">
                                You haven't invested in any RWA assets yet. Browse the marketplace to get started!
                            </p>
                            <Button onClick={() => window.location.href = '/rwa'}>
                                Browse Marketplace
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Unclaimed Distributions */}
            {distributions.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Gift className="w-5 h-5 text-orange-500" />
                            Unclaimed Dividends
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Asset</TableHead>
                                    <TableHead className="text-right">Per Token</TableHead>
                                    <TableHead className="text-right">Your Share</TableHead>
                                    <TableHead className="text-right">Snapshot Date</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {distributions.map((dist) => {
                                    const holding = portfolio.holdings.find(h => h.assetId === dist.assetId);
                                    const yourShare = holding
                                        ? Number(holding.amount) * Number(dist.perTokenAmount)
                                        : 0;

                                    return (
                                        <TableRow key={dist.distributionId}>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <div className="p-2 bg-orange-500/10 rounded">
                                                        <DollarSign className="w-4 h-4 text-orange-500" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium">Asset #{dist.assetId}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            Distribution #{dist.distributionId}
                                                        </p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {formatCurrency(dist.perTokenAmount)}
                                            </TableCell>
                                            <TableCell className="text-right font-medium text-orange-500">
                                                {formatCurrency(String(Math.round(yourShare)))}
                                            </TableCell>
                                            <TableCell className="text-right text-muted-foreground">
                                                {formatDistanceToNow(dist.snapshotTime, { addSuffix: true })}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleClaimDistribution(dist.distributionId)}
                                                    disabled={claimingId === dist.distributionId}
                                                >
                                                    {claimingId === dist.distributionId ? (
                                                        <>
                                                            <RefreshCw className="w-3 h-3 mr-2 animate-spin" />
                                                            Claiming...
                                                        </>
                                                    ) : (
                                                        'Claim'
                                                    )}
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

export default RWAPortfolio;
