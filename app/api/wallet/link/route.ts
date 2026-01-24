

import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { createClient } from '@supabase/supabase-js';

const JWT_SECRET = new TextEncoder().encode(
    process.env.WALLET_JWT_SECRET || 'lumenvault-dev-secret-key-change-in-prod'
);

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
    try {
        const authHeader = request.headers.get('authorization');

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json(
                { error: 'Authorization required' },
                { status: 401 }
            );
        }

        const token = authHeader.substring(7);
        let walletAddress: string;

        try {
            const { payload } = await jwtVerify(token, JWT_SECRET);
            walletAddress = payload.address as string;
        } catch {
            return NextResponse.json(
                { error: 'Invalid or expired token' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { userId } = body;

        if (!userId) {
            return NextResponse.json(
                { error: 'Missing required field: userId' },
                { status: 400 }
            );
        }

        const { data: existing } = await supabase
            .from('wallets')
            .select('id, public_key')
            .eq('user_id', userId)
            .single();

        if (existing) {
            const { error } = await supabase
                .from('wallets')
                .update({
                    public_key: walletAddress,
                    wallet_type: 'non_custodial',
                    is_external: true,
                    encrypted_secret: null,
                    encryption_iv: null,
                    updated_at: new Date().toISOString(),
                })
                .eq('user_id', userId);

            if (error) throw error;
        } else {
            const { error } = await supabase.from('wallets').insert({
                user_id: userId,
                public_key: walletAddress,
                wallet_type: 'non_custodial',
                is_external: true,
                encrypted_secret: null,
                encryption_iv: null,
            });

            if (error) throw error;
        }

        await supabase
            .from('profiles')
            .update({
                wallet_address: walletAddress,
            })
            .eq('user_id', userId);

        return NextResponse.json({
            success: true,
            walletAddress,
            message: 'Wallet linked successfully',
        });
    } catch (error: any) {
        console.error('Link wallet error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to link wallet' },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest) {
    try {
        const authHeader = request.headers.get('authorization');

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json(
                { error: 'Authorization required' },
                { status: 401 }
            );
        }

        const token = authHeader.substring(7);
        let walletAddress: string;

        try {
            const { payload } = await jwtVerify(token, JWT_SECRET);
            walletAddress = payload.address as string;
        } catch {
            return NextResponse.json(
                { error: 'Invalid or expired token' },
                { status: 401 }
            );
        }

        const { data: wallet } = await supabase
            .from('wallets')
            .select('user_id, wallet_type, created_at')
            .eq('public_key', walletAddress)
            .single();

        if (!wallet) {
            return NextResponse.json({
                linked: false,
                walletAddress,
            });
        }

        return NextResponse.json({
            linked: true,
            walletAddress,
            userId: wallet.user_id,
            walletType: wallet.wallet_type,
            linkedAt: wallet.created_at,
        });
    } catch (error: any) {
        console.error('Get link status error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to get link status' },
            { status: 500 }
        );
    }
}
