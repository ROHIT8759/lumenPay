import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { publicKey } = body;

    if (!publicKey || typeof publicKey !== 'string' || !publicKey.startsWith('G') || publicKey.length !== 56) {
      return NextResponse.json({ error: 'Invalid public key' }, { status: 400 });
    }

    const nonce = cryptoRandomHex(32);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    const { error } = await supabase
      .from('auth_nonces')
      .upsert({ public_key: publicKey, nonce, expires_at: expiresAt }, { onConflict: 'public_key' });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ nonce, expiresAt: new Date(expiresAt).getTime() });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to generate challenge' }, { status: 500 });
  }
}

function cryptoRandomHex(bytes: number): string {
  const buf = Buffer.alloc(bytes);
  for (let i = 0; i < bytes; i++) {
    buf[i] = Math.floor(Math.random() * 256);
  }
  return buf.toString('hex');
}
