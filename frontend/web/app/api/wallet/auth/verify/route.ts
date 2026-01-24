








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

        // 4. Issue JWT
        const userId = await ensureUserExists(publicKey);


        const token = await new SignJWT({
            sub: userId,
            address: publicKey,
            type: 'wallet',
        })
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setExpirationTime('24h')
            .sign(JWT_SECRET);

        return NextResponse.json({
            token,
            userId,
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





async function ensureUserExists(publicKey: string): Promise<string> {
    try {
        // 1. Check if wallet already linked to a user
        const { data: existingWallet } = await supabase
            .from('wallets')
            .select('user_id')
            .eq('public_key', publicKey)
            .single();

        if (existingWallet?.user_id) {
            return existingWallet.user_id;
        }

        // 2. No wallet found, create a "shadow" user for this wallet
        // We use a deterministic email for this wallet to find it later if needed
        const walletEmail = `wallet.${publicKey.substring(0, 12)}@lumenpay.internal`;

        // Check if user with this email exists (might happen if wallet was deleted but user remains)
        const { data: existingUser } = await supabase.auth.admin.listUsers();
        const userFound = existingUser.users.find(u => u.email === walletEmail);

        let userId: string;

        if (userFound) {
            userId = userFound.id;
        } else {
            // Create new user
            const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
                email: walletEmail,
                password: crypto.randomUUID(), // Random password, not needed for wallet auth
                email_confirm: true,
                user_metadata: { type: 'wallet_born', publicKey }
            });

            if (createError) throw createError;
            userId = newUser.user.id;
        }

        // 3. Ensure profile and wallet entries exist
        await supabase.from('profiles').upsert({
            id: userId,
            email: walletEmail,
            full_name: `Wallet ${publicKey.substring(0, 8)}`,
            kyc_status: 'pending',
            updated_at: new Date().toISOString()
        }, { onConflict: 'id' });

        await supabase.from('wallets').upsert({
            user_id: userId,
            public_key: publicKey,
            wallet_type: 'non-custodial',
            network: 'testnet',
            updated_at: new Date().toISOString()
        }, { onConflict: 'public_key' });

        return userId;

    } catch (error) {
        console.error('Error ensuring user exists:', error);
        throw new Error('Failed to associate wallet with user account');
    }
}
