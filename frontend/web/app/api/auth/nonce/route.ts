import { NextRequest, NextResponse } from 'next/server';
import { walletAuthService } from '@/lib/walletAuthService';

export async function GET(request: NextRequest) {
    try {
        const walletAddress = request.nextUrl.searchParams.get('wallet');

        if (!walletAddress) {
            return NextResponse.json(
                { error: 'Wallet address is required' },
                { status: 400 }
            );
        }

        const { nonce, expiresAt } = walletAuthService.generateNonce();

        return NextResponse.json({
            success: true,
            nonce,
            expiresAt,
            message: `Sign this nonce with your wallet to authenticate: ${nonce}`,
        });
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || 'Failed to generate nonce' },
            { status: 500 }
        );
    }
}
