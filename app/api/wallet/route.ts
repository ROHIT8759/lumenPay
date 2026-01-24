import { NextResponse } from 'next/server';
import { walletService } from '../../../backend/services/walletService';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const publicKey = searchParams.get('publicKey');
  if (!publicKey) {
    return NextResponse.json({ error: 'publicKey required' }, { status: 400 });
  }

  try {
    const account = await walletService.getAccountDetails(publicKey);
    return NextResponse.json({ success: true, account });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
