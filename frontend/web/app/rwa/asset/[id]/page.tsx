/**
 * RWA Asset Detail Page
 * 
 * Displays detailed information about a specific tokenized real-world asset.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Building2,
    DollarSign,
    Users,
    TrendingUp,
    Shield,
    Clock,
    MapPin,
    FileText,
    ArrowLeft,
    ExternalLink,
    Copy,
    Check,
} from 'lucide-react';
import { RWAAsset, rwaService } from '@/lib/rwaService';
import { formatDistanceToNow, format } from 'date-fns';

export default function AssetDetailPage() {
    const params = useParams();
    const router = useRouter();
    const assetId = params.id as string;

    const [asset, setAsset] = useState<RWAAsset | null>(null);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (assetId) {
            loadAsset();
        }
    }, [assetId]);

    const loadAsset = async () => {
        setLoading(true);
        try {
            const data = await rwaService.getAsset(assetId);
            setAsset(data);
        } catch (error) {
            console.error('Failed to load asset:', error);
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const formatCurrency = (value: string) => {
        const num = Number(value) / 100;
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(num);
    };

    if (loading) {
        return (
            <div className="container mx-auto px-4 py-8 max-w-6xl">
                <div className="animate-pulse space-y-6">
                    <div className="h-8 bg-muted rounded w-1/4" />
                    <div className="h-64 bg-muted rounded" />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-32 bg-muted rounded" />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (!asset) {
        return (
            <div className="container mx-auto px-4 py-8 max-w-6xl">
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-16">
                        <Building2 className="w-16 h-16 text-muted-foreground mb-4" />
                        <h2 className="text-2xl font-bold mb-2">Asset Not Found</h2>
                        <p className="text-muted-foreground mb-6">
                            The asset you're looking for doesn't exist or has been removed.
                        </p>
                        <Button onClick={() => router.push('/rwa')}>
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back to Marketplace
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const totalSupply = BigInt(asset.totalSupply);
    const circulatingSupply = BigInt(asset.circulatingSupply);
    const soldPercentage = totalSupply > 0n
        ? Number((circulatingSupply * 100n) / totalSupply)
        : 0;
    const tokenPrice = totalSupply > 0n
        ? Number(BigInt(asset.assetValueUsd) / totalSupply) / 100
        : 0;
    const remainingTokens = totalSupply - circulatingSupply;

    return (
        <div className="container mx-auto px-4 py-8 max-w-6xl">
            {/* Back Button */}
            <Button
                variant="ghost"
                className="mb-6"
                onClick={() => router.push('/rwa')}
            >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Marketplace
            </Button>

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 mb-8">
                <div className="flex items-start gap-4">
                    <div className="p-4 bg-primary/10 rounded-xl">
                        <Building2 className="w-10 h-10 text-primary" />
                    </div>
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <h1 className="text-3xl font-bold">{asset.name}</h1>
                            <Badge variant={asset.isActive ? 'default' : 'secondary'}>
                                {asset.isActive ? 'Active' : 'Closed'}
                            </Badge>
                        </div>
                        <p className="text-lg text-muted-foreground">{asset.symbol}</p>
                        <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline">
                                {asset.assetType.replace(/([A-Z])/g, ' $1').trim()}
                            </Badge>
                            {asset.accreditedOnly && (
                                <Badge variant="outline" className="text-amber-500 border-amber-500">
                                    <Shield className="w-3 h-3 mr-1" />
                                    Accredited Only
                                </Badge>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex gap-3">
                    <Button
                        variant="outline"
                        size="lg"
                        onClick={() => copyToClipboard(asset.assetId)}
                    >
                        {copied ? (
                            <Check className="w-4 h-4 mr-2" />
                        ) : (
                            <Copy className="w-4 h-4 mr-2" />
                        )}
                        {copied ? 'Copied!' : 'Copy ID'}
                    </Button>
                    <Button
                        size="lg"
                        onClick={() => router.push(`/rwa/invest/${asset.assetId}`)}
                        disabled={!asset.isActive || soldPercentage >= 100}
                    >
                        <TrendingUp className="w-4 h-4 mr-2" />
                        Invest Now
                    </Button>
                </div>
            </div>

            {/* Main Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Total Value</p>
                                <p className="text-2xl font-bold text-primary">
                                    {formatCurrency(asset.assetValueUsd)}
                                </p>
                            </div>
                            <DollarSign className="w-8 h-8 text-primary/50" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Token Price</p>
                                <p className="text-2xl font-bold">${tokenPrice.toFixed(2)}</p>
                            </div>
                            <TrendingUp className="w-8 h-8 text-green-500/50" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Tokens Available</p>
                                <p className="text-2xl font-bold">
                                    {Number(remainingTokens).toLocaleString()}
                                </p>
                            </div>
                            <Users className="w-8 h-8 text-blue-500/50" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Min Investment</p>
                                <p className="text-2xl font-bold">
                                    ${(Number(asset.minInvestment) * tokenPrice).toFixed(0)}
                                </p>
                            </div>
                            <Shield className="w-8 h-8 text-purple-500/50" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Progress Bar */}
            <Card className="mb-8">
                <CardContent className="pt-6">
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="font-semibold">Token Sale Progress</h3>
                            <span className="text-2xl font-bold text-primary">
                                {soldPercentage.toFixed(1)}%
                            </span>
                        </div>
                        <Progress value={soldPercentage} className="h-4" />
                        <div className="flex justify-between text-sm text-muted-foreground">
                            <span>{Number(circulatingSupply).toLocaleString()} tokens sold</span>
                            <span>{Number(totalSupply).toLocaleString()} total supply</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Detailed Info Tabs */}
            <Tabs defaultValue="overview" className="w-full">
                <TabsList className="mb-6">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="details">Asset Details</TabsTrigger>
                    <TabsTrigger value="documents">Documents</TabsTrigger>
                </TabsList>

                <TabsContent value="overview">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Asset Information</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex justify-between py-2 border-b">
                                    <span className="text-muted-foreground">Asset Type</span>
                                    <span className="font-medium">
                                        {asset.assetType.replace(/([A-Z])/g, ' $1').trim()}
                                    </span>
                                </div>
                                <div className="flex justify-between py-2 border-b">
                                    <span className="text-muted-foreground">Created</span>
                                    <span className="font-medium">
                                        {format(asset.createdAt, 'PPP')}
                                    </span>
                                </div>
                                <div className="flex justify-between py-2 border-b">
                                    <span className="text-muted-foreground">Last Valuation</span>
                                    <span className="font-medium">
                                        {formatDistanceToNow(asset.lastValuation, { addSuffix: true })}
                                    </span>
                                </div>
                                <div className="flex justify-between py-2 border-b">
                                    <span className="text-muted-foreground">Transferable</span>
                                    <span className="font-medium">
                                        {asset.isTransferable ? 'Yes' : 'No'}
                                    </span>
                                </div>
                                <div className="flex justify-between py-2">
                                    <span className="text-muted-foreground">Investor Type</span>
                                    <span className="font-medium">
                                        {asset.accreditedOnly ? 'Accredited Only' : 'All Investors'}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Key Parties</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="py-2 border-b">
                                    <p className="text-sm text-muted-foreground mb-1">Issuer</p>
                                    <div className="flex items-center gap-2">
                                        <code className="text-xs bg-muted px-2 py-1 rounded flex-1 truncate">
                                            {asset.issuer}
                                        </code>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => copyToClipboard(asset.issuer)}
                                        >
                                            <Copy className="w-3 h-3" />
                                        </Button>
                                    </div>
                                </div>
                                <div className="py-2">
                                    <p className="text-sm text-muted-foreground mb-1">Custodian</p>
                                    <div className="flex items-center gap-2">
                                        <code className="text-xs bg-muted px-2 py-1 rounded flex-1 truncate">
                                            {asset.custodian}
                                        </code>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => copyToClipboard(asset.custodian)}
                                        >
                                            <Copy className="w-3 h-3" />
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="details">
                    <Card>
                        <CardHeader>
                            <CardTitle>Token Economics</CardTitle>
                            <CardDescription>
                                Detailed breakdown of the asset tokenization
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <div className="p-4 bg-muted/50 rounded-lg">
                                    <p className="text-sm text-muted-foreground">Total Supply</p>
                                    <p className="text-xl font-bold">
                                        {Number(asset.totalSupply).toLocaleString()} tokens
                                    </p>
                                </div>
                                <div className="p-4 bg-muted/50 rounded-lg">
                                    <p className="text-sm text-muted-foreground">Circulating Supply</p>
                                    <p className="text-xl font-bold">
                                        {Number(asset.circulatingSupply).toLocaleString()} tokens
                                    </p>
                                </div>
                                <div className="p-4 bg-muted/50 rounded-lg">
                                    <p className="text-sm text-muted-foreground">Token Price</p>
                                    <p className="text-xl font-bold">${tokenPrice.toFixed(4)}</p>
                                </div>
                                <div className="p-4 bg-muted/50 rounded-lg">
                                    <p className="text-sm text-muted-foreground">Market Cap</p>
                                    <p className="text-xl font-bold">
                                        {formatCurrency(String(Number(asset.circulatingSupply) * tokenPrice * 100))}
                                    </p>
                                </div>
                                <div className="p-4 bg-muted/50 rounded-lg">
                                    <p className="text-sm text-muted-foreground">Minimum Investment</p>
                                    <p className="text-xl font-bold">
                                        {Number(asset.minInvestment).toLocaleString()} tokens
                                    </p>
                                </div>
                                <div className="p-4 bg-muted/50 rounded-lg">
                                    <p className="text-sm text-muted-foreground">Fully Diluted Value</p>
                                    <p className="text-xl font-bold">
                                        {formatCurrency(asset.assetValueUsd)}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="documents">
                    <Card>
                        <CardHeader>
                            <CardTitle>Legal Documents</CardTitle>
                            <CardDescription>
                                Review all legal documentation for this asset
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <FileText className="w-12 h-12 text-muted-foreground mb-4" />
                                <h3 className="text-lg font-semibold mb-2">Documents Coming Soon</h3>
                                <p className="text-muted-foreground max-w-md">
                                    Legal documents, prospectuses, and other materials will be available here
                                    once uploaded by the asset issuer.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
