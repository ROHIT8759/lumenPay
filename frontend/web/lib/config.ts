







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

  BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',

  // Auth endpoints
  AUTH: {
    NONCE: '/api/auth/nonce',
    VERIFY: '/api/auth/verify',
    SESSION: '/api/auth/session',
  },

  // Transaction endpoints (on-chain)
  TX: {
    BUILD: '/api/transactions/build-payment',
    SUBMIT: '/api/transactions/submit',
    STATUS: '/api/transactions', // /:hash/status
  },

  // Off-chain ledger endpoints
  LEDGER: {
    BALANCE: '/api/ledger/balance',
    TRANSFER: '/api/ledger/transfer',
    TRANSACTIONS: '/api/ledger/transactions',
  },

  // Ramp endpoints
  RAMP: {
    ON_CREATE: '/api/ramp/on/create',
    ON_STATUS: '/api/ramp/on', // /:id
    OFF_CREATE: '/api/ramp/off/create',
    OFF_STATUS: '/api/ramp/off', // /:id
    HISTORY: '/api/ramp/history',
  },

  // Escrow endpoints
  ESCROW: {
    BUILD_LOCK: '/api/escrow/build-lock',
    BUILD_RELEASE: '/api/escrow/build-release',
    STATUS: '/api/escrow', // /:loanId
  },

  // KYC endpoints
  KYC: {
    DIDIT_START: '/api/kyc/didit',
    DIDIT_STATUS: '/api/kyc/didit',
  },

  // Stocks endpoints
  STOCKS: {
    LIST: '/api/stocks/list',
    QUOTE: '/api/stocks/quote', // /:symbol
    BUY: '/api/stocks/buy',
    SELL: '/api/stocks/sell',
    PORTFOLIO: '/api/stocks/portfolio',
  },

  // Stock Trading Smart Contract endpoints
  TRADING_CONTRACT: {
    ASSETS: '/api/trading/assets',
    HOLDINGS: '/api/trading/holdings',
    ORDERS: '/api/trading/orders',
    BUY: '/api/trading/buy',
    SELL: '/api/trading/sell',
    PORTFOLIO: '/api/trading/portfolio',
  },

  // Telegram endpoints
  TELEGRAM: {
    LINK_REQUEST: '/api/telegram/link/request',
    LINK_VERIFY: '/api/telegram/link/verify',
    UNLINK: '/api/telegram/unlink',
    STATUS: '/api/telegram/status',
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

// Soroban configuration - All deployed contract addresses
export const SOROBAN = {
  // RPC endpoints
  RPC_TESTNET: 'https://soroban-testnet.stellar.org',
  RPC_MAINNET: 'https://soroban.stellar.org',

  // Deployed Contracts (Testnet) - 2026-01-25
  CONTRACTS: {
    // Escrow Contract - Collateral escrow for loans
    ESCROW: process.env.NEXT_PUBLIC_ESCROW_CONTRACT_ID || '',

    // RWA Contract - Real World Asset tokenization
    RWA: process.env.NEXT_PUBLIC_RWA_CONTRACT_ID || '',

    // Credit Contract - Credit scoring
    CREDIT: process.env.NEXT_PUBLIC_CREDIT_CONTRACT_ID || '',

    // KYC Contract - KYC verification on-chain
    KYC: process.env.NEXT_PUBLIC_KYC_CONTRACT_ID || '',

    // Loan Contract - DeFi loan management
    LOAN: process.env.NEXT_PUBLIC_LOAN_CONTRACT_ID || '',

    // Payment Contract - Payment processing
    PAYMENT: process.env.NEXT_PUBLIC_PAYMENT_CONTRACT_ID || '',

    // Fiat Offramp Contract - UPI/Bank off-ramp
    FIAT_OFFRAMP: process.env.NEXT_PUBLIC_FIAT_OFFRAMP_CONTRACT_ID || '',

    // Stock Trading Contract - Stock trading
    STOCK_TRADING: process.env.NEXT_PUBLIC_STOCK_TRADING_CONTRACT_ID || '',
  },

  // Legacy alias for backwards compatibility
  STOCK_TRADING_CONTRACT: process.env.NEXT_PUBLIC_STOCK_TRADING_CONTRACT_ID || '',
};

export function getSorobanRpcUrl(): string {
  return NETWORK.CURRENT === 'testnet'
    ? SOROBAN.RPC_TESTNET
    : SOROBAN.RPC_MAINNET;
}


export const config = {
  appName: BRAND.NAME,
  stellar: {
    network: NETWORK.CURRENT,
    horizonUrl: getHorizonUrl(),
    usdcIssuer: getUSDCAsset().issuer,
  },
  soroban: {
    rpcUrl: getSorobanRpcUrl(),
    stockTradingContract: SOROBAN.STOCK_TRADING_CONTRACT,
  },
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  },
};
