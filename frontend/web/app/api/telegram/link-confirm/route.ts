import { NextRequest, NextResponse } from 'next/server';
import { Keypair } from '@stellar/stellar-sdk';
import { createClient } from '@supabase/supabase-js';
import { consumeLinkCode } from '@/lib/telegramLinkStore';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { wallet_address, signed_message, link_code } = body;
    if (!wallet_address || !signed_message || !link_code) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }
    const consumed = consumeLinkCode(link_code);
    if (!consumed) {
      return NextResponse.json({ error: 'Invalid or expired code' }, { status: 400 });
    }
    try {
      const keypair = Keypair.fromPublicKey(wallet_address);
      const ok = keypair.verify(Buffer.from(link_code, 'utf8'), Buffer.from(signed_message, 'base64'));
      if (!ok) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    } catch {
      return NextResponse.json({ error: 'Signature verification failed' }, { status: 401 });
    }
    const { error } = await supabase
      .from('telegram_links')
      .upsert({ wallet_address, telegram_chat_id: consumed.chatId, linked_at: new Date().toISOString() }, { onConflict: 'wallet_address' });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Link failed' }, { status: 500 });
  }
}
