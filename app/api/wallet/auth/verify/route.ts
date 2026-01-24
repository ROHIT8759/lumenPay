








import { NextRequest, NextResponse } from 'next/server';
import { Keypair } from '@stellar/stellar-sdk';
import { SignJWT } from 'jose';
import { validateAndConsumeNonce } from '@/lib/nonceStore';
import { supabase } from '@/lib/supabaseClient';

const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || 'lumenpay-jwt-secret-change-in-production'
);

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { publicKey, signature, nonce } = body;

        
        if (!publicKey || !signature || !nonce) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        
        const nonceResult = validateAndConsumeNonce(publicKey, nonce);
        if (!nonceResult.valid) {
            return NextResponse.json(
                { error: nonceResult.error },
                { status: 401 }
            );
        }

        
        try {
            const keypair = Keypair.fromPublicKey(publicKey);
            const messageBuffer = Buffer.from(nonce, 'utf8');
            const signatureBuffer = Buffer.from(signature, 'base64');

            const isValid = keypair.verify(messageBuffer, signatureBuffer);

            if (!isValid) {
                return NextResponse.json(
                    { error: 'Invalid signature' },
                    { status: 401 }
                );
            }
        } catch (error) {
            return NextResponse.json(
                { error: 'Signature verification failed' },
                { status: 401 }
            );
        }

        
        await ensureUserExists(publicKey);

        
        const token = await new SignJWT({
            address: publicKey,
            type: 'wallet',
        })
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setExpirationTime('24h')
            .sign(JWT_SECRET);

        return NextResponse.json({
            token,
            user: {
                address: publicKey,
            },
        });
    } catch (error: any) {
        console.error('Verification error:', error);
        return NextResponse.json(
            { error: 'Verification failed' },
            { status: 500 }
        );
    }
}





async function ensureUserExists(publicKey: string): Promise<void> {
    try {
        
        const { data: existingWallet } = await supabase
            .from('wallets')
            .select('id')
            .eq('public_key', publicKey)
            .single();

        if (existingWallet) {
            return; 
        }

        
        const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
                id: publicKey,
                email: `${publicKey.substring(0, 8)}@lumenpay.wallet`,
                full_name: `Wallet ${publicKey.substring(0, 8)}`,
                kyc_status: 'pending',
            }, { onConflict: 'id' });

        if (profileError) {
            console.warn('Profile upsert warning:', profileError);
        }

        
        const { error: walletError } = await supabase
            .from('wallets')
            .upsert({
                user_id: publicKey,
                public_key: publicKey,
                wallet_type: 'external', 
                network: 'testnet',
            }, { onConflict: 'public_key' });

        if (walletError) {
            console.warn('Wallet upsert warning:', walletError);
        }

    } catch (error) {
        console.error('Error ensuring user exists:', error);
        
    }
}
