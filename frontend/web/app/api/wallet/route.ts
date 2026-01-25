import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    {
      error: 'Custodial wallet endpoints removed',
      message: 'Wallets are created client-side via LumenVault. No server-side wallet creation or key handling is allowed.',
    },
    { status: 410 }
  );
}
