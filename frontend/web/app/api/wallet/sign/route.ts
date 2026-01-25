/**
 * Transaction signing endpoint for custodial wallets
 * Signs transactions using encrypted private keys
 */

import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { signTransactionWithCustodialWallet } from '@/lib/custodialWalletSigner';
import { Networks } from '@stellar/stellar-sdk';

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate user
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const secret = new TextEncoder().encode(
      process.env.JWT_SECRET || 'lumenpay-jwt-secret-change-in-production'
    );

    let userId: string;
    try {
      const { payload } = await jwtVerify(token, secret);
      userId = payload.sub || payload.address as string;
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // 2. Get transaction XDR from request
    const body = await req.json();
    const { transactionXdr, networkPassphrase } = body;

    if (!transactionXdr || typeof transactionXdr !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid transactionXdr' },
        { status: 400 }
      );
    }

    // 3. Use testnet by default
    const network = networkPassphrase || Networks.TESTNET;

    // 4. Sign transaction with custodial wallet
    const result = await signTransactionWithCustodialWallet(
      userId,
      transactionXdr,
      network
    );

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    // 5. Return signed XDR
    return NextResponse.json({
      signedXdr: result.signedXdr,
      publicKey: result.publicKey,
    });
  } catch (error: any) {
    console.error('Transaction signing error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to sign transaction' },
      { status: 500 }
    );
  }
}
