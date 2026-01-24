import { NextRequest, NextResponse } from 'next/server';
import { Keypair } from '@stellar/stellar-sdk';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { wallet_address, signed_message } = body;
    if (!wallet_address || !signed_message) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }
    try {
      const keypair = Keypair.fromPublicKey(wallet_address);
      const ok = keypair.verify(Buffer.from('UNLINK', 'utf8'), Buffer.from(signed_message, 'base64'));
      if (!ok) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    } catch {
      return NextResponse.json({ error: 'Signature verification failed' }, { status: 401 });
    }
    const { error } = await supabase
      .from('telegram_links')
      .delete()
      .eq('wallet_address', wallet_address);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Unlink failed' }, { status: 500 });
  }
}
