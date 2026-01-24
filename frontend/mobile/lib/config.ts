// @ts-ignore
import { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, HORIZON_URL, STELLAR_USDC_ISSUER } from '@env';

export const config = {
  appName: 'LumenPay',
  stellar: {
    network: 'testnet',
    horizonUrl: HORIZON_URL || 'https://horizon-testnet.stellar.org',
    usdcIssuer: STELLAR_USDC_ISSUER || 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
  },
  supabase: {
    url: NEXT_PUBLIC_SUPABASE_URL || 'https://jsismwafswmoqwfbfswv.supabase.co',
    anonKey: NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_qW9LY5louEVU1WbFRO94Nw_PKAtEbsz',
  },
};
