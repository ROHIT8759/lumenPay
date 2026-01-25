import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    {
      error: 'Custodial signing removed',
      message: 'Transactions must be signed client-side via LumenVault. The server must only accept signed XDR.',
    },
    { status: 410 }
  );
}
