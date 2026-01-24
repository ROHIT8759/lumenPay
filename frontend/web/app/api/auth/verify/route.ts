import { NextRequest, NextResponse } from 'next/server';
import { Keypair } from '@stellar/stellar-sdk';
import { SignJWT } from 'jose';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'lumenpay-jwt-secret-change-in-production'
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { publicKey, signature, nonce } = body;

    if (!publicKey || !signature || !nonce) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!publicKey.startsWith('G') || publicKey.length !== 56) {
      return NextResponse.json({ error: 'Invalid public key' }, { status: 400 });
    }

    const { data: nonceRow, error: nonceError } = await supabase
      .from('auth_nonces')
      .select('nonce, expires_at')
      .eq('public_key', publicKey)
      .single();

    if (nonceError || !nonceRow) {
      return NextResponse.json({ error: 'Nonce not found' }, { status: 401 });
    }

    if (nonceRow.nonce !== nonce) {
      return NextResponse.json({ error: 'Invalid nonce' }, { status: 401 });
    }

    if (new Date(nonceRow.expires_at).getTime() < Date.now()) {
      await supabase.from('auth_nonces').delete().eq('public_key', publicKey);
      return NextResponse.json({ error: 'Nonce expired' }, { status: 401 });
    }

    try {
      const keypair = Keypair.fromPublicKey(publicKey);
      const isValid = keypair.verify(Buffer.from(nonce, 'utf8'), Buffer.from(signature, 'base64'));
      if (!isValid) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    } catch {
      return NextResponse.json({ error: 'Signature verification failed' }, { status: 401 });
    }

    await supabase.from('auth_nonces').delete().eq('public_key', publicKey);

    const token = await new SignJWT({ address: publicKey, type: 'wallet' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(JWT_SECRET);

    return NextResponse.json({
      token,
      user: { address: publicKey },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Verification failed' }, { status: 500 });
  }
}
