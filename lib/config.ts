







export const NETWORK = {
  
  CURRENT: (process.env.STELLAR_NETWORK || 'testnet') as 'testnet' | 'public',

  
  HORIZON_TESTNET: 'https://horizon-testnet.stellar.org',
  HORIZON_PUBLIC: 'https://horizon.stellar.org',

  
  PASSPHRASE_TESTNET: 'Test SDF Network ; September 2015',
  PASSPHRASE_PUBLIC: 'Public Global Stellar Network ; September 2015',

  
  FRIENDBOT_URL: 'https://friendbot.stellar.org',
};


export const ASSETS = {
  
  NATIVE: { code: 'XLM', issuer: null },

  
  USDC_TESTNET: {
    code: 'USDC',
    issuer: process.env.STELLAR_USDC_ISSUER || 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
  },

  
  USDC_MAINNET: {
    code: 'USDC',
    issuer: 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
  },
};


export const API = {
  
  BASE_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',

  
  AUTH: {
    NONCE: '/api/wallet/auth/nonce',
    VERIFY: '/api/wallet/auth/verify',
    SESSION: '/api/wallet/auth/session',
  },

  
  TX: {
    BUILD: '/api/wallet/tx/build',
    SUBMIT: '/api/wallet/tx/submit',
  },

  
  KYC: {
    DIDIT_START: '/api/kyc/didit',
    DIDIT_STATUS: '/api/kyc/didit',
  },
};


export const FEATURES = {
  
  STOCKS_ENABLED: process.env.ENABLE_STOCK_TRADING !== 'false',

  
  LOANS_ENABLED: process.env.ENABLE_LOANS !== 'false',

  
  KYC_DEMO_MODE: process.env.KYC_DEMO_MODE === 'true',
};


export const BRAND = {
  
  NAME: 'LumenPay',

  
  WALLET_NAME: 'LumenVault',

  
  TAGLINE: 'Your Keys, Your Coins',

  
  COLORS: {
    PRIMARY: '#0A0A0F',
    ACCENT: '#00E5FF',
    SUCCESS: '#22C55E',
    ERROR: '#EF4444',
  },
};


export const KYC = {
  
  DIDIT: {
    APP_ID: process.env.DIDIT_APP_ID || '',
    API_URL: process.env.DIDIT_API_URL || 'https://apx.didit.me/v1',
  },

  
  LEVELS: {
    0: { name: 'Unverified', features: ['payments'] },
    1: { name: 'Biometric Verified', features: ['payments', 'stocks'] },
    2: { name: 'Extended Verified', features: ['payments', 'stocks', 'loans'] },
  },
};


export const LIMITS = {
  
  PER_TX: {
    0: 100,
    1: 10000,
    2: 100000,
  },

  
  DAILY: {
    0: 1000,
    1: 50000,
    2: 500000,
  },
};


export function getHorizonUrl(): string {
  return NETWORK.CURRENT === 'testnet'
    ? NETWORK.HORIZON_TESTNET
    : NETWORK.HORIZON_PUBLIC;
}

export function getNetworkPassphrase(): string {
  return NETWORK.CURRENT === 'testnet'
    ? NETWORK.PASSPHRASE_TESTNET
    : NETWORK.PASSPHRASE_PUBLIC;
}

export function getUSDCAsset() {
  return NETWORK.CURRENT === 'testnet'
    ? ASSETS.USDC_TESTNET
    : ASSETS.USDC_MAINNET;
}


export const config = {
  appName: BRAND.NAME,
  stellar: {
    network: NETWORK.CURRENT,
    horizonUrl: getHorizonUrl(),
    usdcIssuer: getUSDCAsset().issuer,
  },
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  },
};
