/**
 * RWA Investment Page
 * 
 * Page for investing in a specific RWA asset with amount selection and confirmation.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
    Building2,
    DollarSign,
    TrendingUp,
    ArrowLeft,
    ArrowRight,
    Shield,
    AlertTriangle,
    Check,
    Loader2,
    Wallet,
    Info,
} from 'lucide-react';
import { RWAAsset, rwaService } from '@/lib/rwaService';

export default function InvestPage() {
    const params = useParams();
    const router = useRouter();
    const assetId = params.id as string;

    const [asset, setAsset] = useState<RWAAsset | null>(null);
    const [loading, setLoading] = useState(true);
    const [tokenAmount, setTokenAmount] = useState<number>(0);
    const [step, setStep] = useState<'amount' | 'review' | 'processing' | 'success'>('amount');
    const [isEligible, setIsEligible] = useState<boolean | null>(null);
    const [eligibilityReason, setEligibilityReason] = useState<string>('');

    // Mock wallet address - in production, this would come from wallet connection
    const walletAddress = 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN7';

    useEffect(() => {
        if (assetId) {
            loadAsset();
            checkEligibility();
        }
    }, [assetId]);

    const loadAsset = async () => {
        setLoading(true);
        try {
            const data = await rwaService.getAsset(assetId);
            setAsset(data);
            if (data) {
                setTokenAmount(Number(data.minInvestment));
            }
        } catch (error) {
            console.error('Failed to load asset:', error);
        } finally {
            setLoading(false);
        }
    };

    const checkEligibility = async () => {
        try {
            const result = await rwaService.checkEligibility(assetId, walletAddress);
            setIsEligible(result.eligible);
            setEligibilityReason(result.reason || '');
        } catch (error) {
            console.error('Failed to check eligibility:', error);
            setIsEligible(false);
            setEligibilityReason('Unable to verify eligibility');
        }
    };

    if (loading) {
        return (
            <div className="container mx-auto px-4 py-8 max-w-2xl">
                <div className="animate-pulse space-y-6">
                    <div className="h-8 bg-muted rounded w-1/4" />
                    <div className="h-96 bg-muted rounded" />
                </div>
            </div>
        );
    }

    if (!asset) {
        return (
            <div className="container mx-auto px-4 py-8 max-w-2xl">
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-16">
                        <Building2 className="w-16 h-16 text-muted-foreground mb-4" />
                        <h2 className="text-2xl font-bold mb-2">Asset Not Found</h2>
                        <p className="text-muted-foreground mb-6">
                            The asset you're trying to invest in doesn't exist.
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
    const remainingTokens = Number(totalSupply - circulatingSupply);
    const tokenPrice = totalSupply > 0n
        ? Number(BigInt(asset.assetValueUsd) / totalSupply) / 100
        : 0;
    const minTokens = Number(asset.minInvestment);
    const maxTokens = Math.min(remainingTokens, 10000); // Cap at 10k tokens per transaction

    const totalCost = tokenAmount * tokenPrice;

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(value);
    };

    const handleInvest = async () => {
        setStep('processing');

        // Simulate investment process
        await new Promise((resolve) => setTimeout(resolve, 3000));

        // In production, this would call:
        // await rwaService.invest(keypair, { assetId, amount: tokenAmount.toString(), ... });

        setStep('success');
    };

    return (
        <div className="container mx-auto px-4 py-8 max-w-2xl">
            {/* Back Button */}
            <Button
                variant="ghost"
                className="mb-6"
                onClick={() => router.push(`/rwa/asset/${assetId}`)}
            >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Asset
            </Button>

            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <Building2 className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">Invest in {asset.name}</h1>
                        <p className="text-muted-foreground">{asset.symbol}</p>
                    </div>
                </div>
            </div>

            {/* Eligibility Alert */}
            {isEligible === false && (
                <Alert variant="destructive" className="mb-6">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Not Eligible</AlertTitle>
                    <AlertDescription>{eligibilityReason}</AlertDescription>
                </Alert>
            )}

            {/* Step: Amount Selection */}
            {step === 'amount' && (
                <Card>
                    <CardHeader>
                        <CardTitle>Select Investment Amount</CardTitle>
                        <CardDescription>
                            Choose how many tokens you want to purchase
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Token Price Info */}
                        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                            <div>
                                <p className="text-sm text-muted-foreground">Token Price</p>
                                <p className="text-2xl font-bold">{formatCurrency(tokenPrice)}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm text-muted-foreground">Available</p>
                                <p className="text-lg font-medium">
                                    {remainingTokens.toLocaleString()} tokens
                                </p>
                            </div>
                        </div>

                        {/* Token Amount Input */}
                        <div className="space-y-3">
                            <Label htmlFor="tokens">Number of Tokens</Label>
                            <Input
                                id="tokens"
                                type="number"
                                value={tokenAmount}
                                onChange={(e) => setTokenAmount(Math.max(minTokens, Math.min(maxTokens, Number(e.target.value))))}
                                min={minTokens}
                                max={maxTokens}
                                className="text-lg"
                            />
                            <Slider
                                value={[tokenAmount]}
                                onValueChange={([value]) => setTokenAmount(value)}
                                min={minTokens}
                                max={maxTokens}
                                step={1}
                                className="mt-4"
                            />
                            <div className="flex justify-between text-sm text-muted-foreground">
                                <span>Min: {minTokens.toLocaleString()}</span>
                                <span>Max: {maxTokens.toLocaleString()}</span>
                            </div>
                        </div>

                        {/* Cost Breakdown */}
                        <div className="space-y-3 pt-4 border-t">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Tokens</span>
                                <span className="font-medium">{tokenAmount.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Price per token</span>
                                <span className="font-medium">{formatCurrency(tokenPrice)}</span>
                            </div>
                            <div className="flex justify-between text-lg pt-3 border-t">
                                <span className="font-semibold">Total Cost</span>
                                <span className="font-bold text-primary">{formatCurrency(totalCost)}</span>
                            </div>
                        </div>

                        {/* Info */}
                        <Alert>
                            <Info className="h-4 w-4" />
                            <AlertDescription>
                                Your tokens will be transferred to your connected wallet after the transaction is confirmed.
                            </AlertDescription>
                        </Alert>
                    </CardContent>
                    <CardFooter>
                        <Button
                            className="w-full"
                            size="lg"
                            onClick={() => setStep('review')}
                            disabled={!isEligible || tokenAmount < minTokens}
                        >
                            Continue to Review
                            <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    </CardFooter>
                </Card>
            )}

            {/* Step: Review */}
            {step === 'review' && (
                <Card>
                    <CardHeader>
                        <CardTitle>Review Your Investment</CardTitle>
                        <CardDescription>
                            Please review the details before confirming
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Investment Summary */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                                <Building2 className="w-8 h-8 text-primary" />
                                <div>
                                    <p className="font-semibold">{asset.name}</p>
                                    <p className="text-sm text-muted-foreground">{asset.symbol}</p>
                                </div>
                            </div>

                            <div className="space-y-3 p-4 border rounded-lg">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Tokens to Purchase</span>
                                    <span className="font-medium">{tokenAmount.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Price per Token</span>
                                    <span className="font-medium">{formatCurrency(tokenPrice)}</span>
                                </div>
                                <div className="flex justify-between pt-3 border-t text-lg">
                                    <span className="font-semibold">Total Amount</span>
                                    <span className="font-bold text-primary">{formatCurrency(totalCost)}</span>
                                </div>
                            </div>

                            <div className="p-4 border rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                    <Wallet className="w-4 h-4 text-muted-foreground" />
                                    <span className="text-sm text-muted-foreground">Receiving Wallet</span>
                                </div>
                                <code className="text-xs bg-muted px-2 py-1 rounded block truncate">
                                    {walletAddress}
                                </code>
                            </div>
                        </div>

                        {/* Risk Warning */}
                        <Alert>
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Investment Risk</AlertTitle>
                            <AlertDescription>
                                Investing in tokenized real-world assets carries risks. The value of your investment
                                can go down as well as up. Please ensure you understand the risks involved.
                            </AlertDescription>
                        </Alert>
                    </CardContent>
                    <CardFooter className="flex gap-4">
                        <Button
                            variant="outline"
                            className="flex-1"
                            onClick={() => setStep('amount')}
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back
                        </Button>
                        <Button
                            className="flex-1"
                            onClick={handleInvest}
                        >
                            <Shield className="w-4 h-4 mr-2" />
                            Confirm Investment
                        </Button>
                    </CardFooter>
                </Card>
            )}

            {/* Step: Processing */}
            {step === 'processing' && (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-16">
                        <Loader2 className="w-16 h-16 text-primary animate-spin mb-6" />
                        <h2 className="text-2xl font-bold mb-2">Processing Investment</h2>
                        <p className="text-muted-foreground text-center max-w-md">
                            Please wait while we process your investment. This may take a few moments.
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* Step: Success */}
            {step === 'success' && (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-16">
                        <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-6">
                            <Check className="w-8 h-8 text-green-500" />
                        </div>
                        <h2 className="text-2xl font-bold mb-2">Investment Successful!</h2>
                        <p className="text-muted-foreground text-center max-w-md mb-2">
                            Congratulations! You have successfully invested in {asset.name}.
                        </p>
                        <div className="p-4 bg-muted/50 rounded-lg my-6 text-center">
                            <p className="text-sm text-muted-foreground">Tokens Purchased</p>
                            <p className="text-3xl font-bold text-primary">{tokenAmount.toLocaleString()}</p>
                            <p className="text-sm text-muted-foreground">{formatCurrency(totalCost)}</p>
                        </div>
                        <div className="flex gap-4">
                            <Button variant="outline" onClick={() => router.push('/rwa')}>
                                Back to Marketplace
                            </Button>
                            <Button onClick={() => router.push('/rwa?tab=portfolio')}>
                                View Portfolio
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
