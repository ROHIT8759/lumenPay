

import { NextRequest, NextResponse } from 'next/server';
import { walletService } from '@/lib/walletService';
import { createClient } from '@/lib/supabaseClient';
import { Keypair } from '@stellar/stellar-sdk';
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.WALLET_ENCRYPTION_KEY || '86064d73488a40e133a88ab0bb93d02aee7d0d9f414769f6b547025a871198e5';

/**
 * Encrypt private key for secure storage
 */
function encryptPrivateKey(privateKey: string): string {
  const algorithm = 'aes-256-cbc';
  const key = Buffer.from(ENCRYPTION_KEY, 'hex');
  const iv = crypto.randomBytes(16);
  
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(privateKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return iv.toString('hex') + ':' + encrypted;
}

/**
 * GET /api/wallet - Fetch or create custodial wallet for user
 */
export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Check if wallet already exists
    const { data: existingWallet, error: fetchError } = await supabase
      .from('wallets')
      .select('public_key, created_at')
      .eq('user_id', userId)
      .single();

    if (existingWallet) {
      // Return existing wallet
      return NextResponse.json({
        publicKey: existingWallet.public_key,
        address: existingWallet.public_key,
        createdAt: existingWallet.created_at,
        isNew: false
      });
    }

    // Create new wallet automatically
    const keypair = Keypair.random();
    const publicKey = keypair.publicKey();
    const privateKey = keypair.secret();
    
    // Encrypt private key
    const encryptedPrivateKey = encryptPrivateKey(privateKey);

    // Store in database
    const { data: newWallet, error: createError } = await supabase
      .from('wallets')
      .insert({
        user_id: userId,
        public_key: publicKey,
        encrypted_private_key: encryptedPrivateKey,
        wallet_type: 'custodial',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (createError) {
      console.error('Wallet creation error:', createError);
      return NextResponse.json({ error: 'Failed to create wallet' }, { status: 500 });
    }

    // Try to fund testnet account
    try {
      await walletService.fundTestnetAccount(publicKey);
    } catch (fundError) {
      console.log('Testnet funding failed (non-critical):', fundError);
    }

    return NextResponse.json({
      publicKey: newWallet.public_key,
      address: newWallet.public_key,
      createdAt: newWallet.created_at,
      isNew: true,
      message: 'Wallet created successfully'
    });

  } catch (error: any) {
    console.error('Wallet API error:', error);
}
