import { NextRequest, NextResponse } from 'next/server';
import { createLinkCode } from '@/lib/telegramLinkStore';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { telegram_chat_id } = body;
    if (!telegram_chat_id) {
      return NextResponse.json({ error: 'telegram_chat_id required' }, { status: 400 });
    }
    const { code, expiresAt } = createLinkCode(telegram_chat_id);
    return NextResponse.json({ link_code: code, expires_at: expiresAt });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create link code' }, { status: 500 });
  }
}
