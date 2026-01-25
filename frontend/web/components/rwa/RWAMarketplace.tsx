/**
 * RWA Marketplace Component
 * 
 * Main marketplace for browsing and investing in tokenized real-world assets.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Building2,
    Search,
    Filter,
    TrendingUp,
    DollarSign,
    Users,
    Briefcase,
    RefreshCw,
} from 'lucide-react';
import { RWAAssetCard } from './RWAAssetCard';
import { RWAAsset, AssetType, rwaService } from '@/lib/rwaService';

interface RWAMarketplaceProps {
    walletAddress?: string;
    onInvest?: (assetId: string) => void;
}

const assetTypes: AssetType[] = [
    'RealEstate',
    'Commodity',
    'Security',
    'Bond',
    'Art',
    'Collectible',
    'Invoice',
    'Equipment',
    'IntellectualProperty',
    'Other',
];

export function RWAMarketplace({ walletAddress, onInvest }: RWAMarketplaceProps) {
    const [assets, setAssets] = useState<RWAAsset[]>([]);
    const [filteredAssets, setFilteredAssets] = useState<RWAAsset[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedType, setSelectedType] = useState<AssetType | 'all'>('all');
    const [sortBy, setSortBy] = useState<'value' | 'newest' | 'popular'>('newest');
    const [tvl, setTvl] = useState('0');

    useEffect(() => {
        loadAssets();
        loadTVL();
    }, []);

    useEffect(() => {
        filterAndSortAssets();
    }, [assets, searchQuery, selectedType, sortBy]);

    const loadAssets = async () => {
        setLoading(true);
        try {
            const allAssets = await rwaService.getAllAssets();
            setAssets(allAssets);
        } catch (error) {
            console.error('Failed to load assets:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadTVL = async () => {
        try {
            const totalValue = await rwaService.getTotalValueLocked();
            setTvl(totalValue);
        } catch (error) {
            console.error('Failed to load TVL:', error);
        }
    };

    const filterAndSortAssets = () => {
        let filtered = [...assets];

        // Apply search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(
                (asset) =>
                    asset.name.toLowerCase().includes(query) ||
                    asset.symbol.toLowerCase().includes(query)
            );
        }

        // Apply type filter
        if (selectedType !== 'all') {
            filtered = filtered.filter((asset) => asset.assetType === selectedType);
        }

        // Apply sorting
        switch (sortBy) {
            case 'value':
                filtered.sort((a, b) => Number(BigInt(b.assetValueUsd) - BigInt(a.assetValueUsd)));
                break;
            case 'newest':
                filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                break;
            case 'popular':
                filtered.sort((a, b) => Number(BigInt(b.circulatingSupply) - BigInt(a.circulatingSupply)));
                break;
        }

        setFilteredAssets(filtered);
    };

    const handleInvest = (assetId: string) => {
        if (onInvest) {
            onInvest(assetId);
        } else {
            // Default behavior - navigate to investment page
            window.location.href = `/rwa/invest/${assetId}`;
        }
    };

    const handleViewDetails = (assetId: string) => {
        window.location.href = `/rwa/asset/${assetId}`;
    };

    const formatCurrency = (value: string) => {
        const num = Number(value) / 100; // Convert cents to USD
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(num);
    };

    // Stats cards data
    const stats = [
        {
            title: 'Total Value Locked',
            value: formatCurrency(tvl),
            icon: DollarSign,
            color: 'text-green-500',
            bgColor: 'bg-green-500/10',
        },
        {
            title: 'Active Assets',
            value: assets.filter((a) => a.isActive).length.toString(),
            icon: Building2,
            color: 'text-blue-500',
            bgColor: 'bg-blue-500/10',
        },
        {
            title: 'Asset Types',
            value: new Set(assets.map((a) => a.assetType)).size.toString(),
            icon: Briefcase,
            color: 'text-purple-500',
            bgColor: 'bg-purple-500/10',
        },
        {
            title: 'Total Tokens',
            value: assets
                .reduce((sum, a) => sum + Number(a.totalSupply), 0)
                .toLocaleString(),
            icon: TrendingUp,
            color: 'text-orange-500',
            bgColor: 'bg-orange-500/10',
        },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">RWA Marketplace</h1>
                    <p className="text-muted-foreground">
                        Invest in tokenized real-world assets on Stellar
                    </p>
                </div>
                <Button onClick={loadAssets} variant="outline" disabled={loading}>
                    <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat, index) => (
                    <Card key={index}>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                                    <p className="text-2xl font-bold">{stat.value}</p>
                                </div>
                                <div className={`p-3 rounded-full ${stat.bgColor}`}>
                                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row gap-4">
                        {/* Search */}
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Search assets by name or symbol..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>

                        {/* Type Filter */}
                        <Select
                            value={selectedType}
                            onValueChange={(value) => setSelectedType(value as AssetType | 'all')}
                        >
                            <SelectTrigger className="w-full md:w-[200px]">
                                <Filter className="w-4 h-4 mr-2" />
                                <SelectValue placeholder="Asset Type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Types</SelectItem>
                                {assetTypes.map((type) => (
                                    <SelectItem key={type} value={type}>
                                        {type.replace(/([A-Z])/g, ' $1').trim()}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Sort */}
                        <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                            <SelectTrigger className="w-full md:w-[180px]">
                                <SelectValue placeholder="Sort By" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="newest">Newest First</SelectItem>
                                <SelectItem value="value">Highest Value</SelectItem>
                                <SelectItem value="popular">Most Popular</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Active Filters */}
                    {(searchQuery || selectedType !== 'all') && (
                        <div className="flex items-center gap-2 mt-4">
                            <span className="text-sm text-muted-foreground">Active filters:</span>
                            {searchQuery && (
                                <Badge
                                    variant="secondary"
                                    className="cursor-pointer"
                                    onClick={() => setSearchQuery('')}
                                >
                                    Search: {searchQuery} ×
                                </Badge>
                            )}
                            {selectedType !== 'all' && (
                                <Badge
                                    variant="secondary"
                                    className="cursor-pointer"
                                    onClick={() => setSelectedType('all')}
                                >
                                    Type: {selectedType.replace(/([A-Z])/g, ' $1').trim()} ×
                                </Badge>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Asset Grid */}
            <Tabs defaultValue="grid" className="w-full">
                <div className="flex items-center justify-between mb-4">
                    <p className="text-sm text-muted-foreground">
                        Showing {filteredAssets.length} of {assets.length} assets
                    </p>
                    <TabsList>
                        <TabsTrigger value="grid">Grid</TabsTrigger>
                        <TabsTrigger value="list">List</TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="grid">
                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[1, 2, 3, 4, 5, 6].map((i) => (
                                <Card key={i} className="animate-pulse">
                                    <CardHeader>
                                        <div className="h-6 bg-muted rounded w-3/4" />
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="h-12 bg-muted rounded" />
                                        <div className="h-4 bg-muted rounded w-1/2" />
                                        <div className="h-4 bg-muted rounded w-3/4" />
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : filteredAssets.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredAssets.map((asset) => (
                                <RWAAssetCard
                                    key={asset.assetId}
                                    asset={asset}
                                    onInvest={handleInvest}
                                    onViewDetails={handleViewDetails}
                                />
                            ))}
                        </div>
                    ) : (
                        <Card>
                            <CardContent className="flex flex-col items-center justify-center py-12">
                                <Building2 className="w-12 h-12 text-muted-foreground mb-4" />
                                <h3 className="text-lg font-semibold mb-2">No Assets Found</h3>
                                <p className="text-muted-foreground text-center max-w-md">
                                    {searchQuery || selectedType !== 'all'
                                        ? 'Try adjusting your filters to see more assets.'
                                        : 'No tokenized assets are available at the moment. Check back later!'}
                                </p>
                                {(searchQuery || selectedType !== 'all') && (
                                    <Button
                                        variant="outline"
                                        className="mt-4"
                                        onClick={() => {
                                            setSearchQuery('');
                                            setSelectedType('all');
                                        }}
                                    >
                                        Clear Filters
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                <TabsContent value="list">
                    {loading ? (
                        <div className="space-y-4">
                            {[1, 2, 3, 4].map((i) => (
                                <Card key={i} className="animate-pulse">
                                    <CardContent className="p-4">
                                        <div className="h-16 bg-muted rounded" />
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : filteredAssets.length > 0 ? (
                        <div className="space-y-4">
                            {filteredAssets.map((asset) => (
                                <Card key={asset.assetId} className="hover:shadow-md transition-shadow">
                                    <CardContent className="p-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="p-2 bg-primary/10 rounded-lg">
                                                    <Building2 className="w-6 h-6 text-primary" />
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold">{asset.name}</h3>
                                                    <p className="text-sm text-muted-foreground">
                                                        {asset.symbol} • {asset.assetType}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-6">
                                                <div className="text-right">
                                                    <p className="text-sm text-muted-foreground">Value</p>
                                                    <p className="font-semibold">
                                                        {formatCurrency(asset.assetValueUsd)}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm text-muted-foreground">Sold</p>
                                                    <p className="font-semibold">
                                                        {BigInt(asset.totalSupply) > 0n
                                                            ? `${((Number(asset.circulatingSupply) / Number(asset.totalSupply)) * 100).toFixed(1)}%`
                                                            : '0%'}
                                                    </p>
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleViewDetails(asset.assetId)}
                                                    >
                                                        Details
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleInvest(asset.assetId)}
                                                        disabled={!asset.isActive}
                                                    >
                                                        Invest
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <Card>
                            <CardContent className="flex flex-col items-center justify-center py-12">
                                <Building2 className="w-12 h-12 text-muted-foreground mb-4" />
                                <h3 className="text-lg font-semibold mb-2">No Assets Found</h3>
                                <p className="text-muted-foreground">
                                    Try adjusting your filters to see more assets.
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}

export default RWAMarketplace;
