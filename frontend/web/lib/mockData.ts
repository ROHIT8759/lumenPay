// Mock data for development and testing

export const MOCK_USER_HOLDINGS = [
  {
    id: '1',
    asset_id: 'real-estate-1',
    asset_name: 'Downtown Office Complex',
    asset_type: 'real_estate',
    quantity: 10,
    purchase_price: 50000,
    current_value: 52500,
    purchase_date: '2024-01-15T00:00:00Z',
    user_id: 'demo-user'
  },
  {
    id: '2',
    asset_id: 'real-estate-2',
    asset_name: 'Residential Apartments',
    asset_type: 'real_estate',
    quantity: 25,
    purchase_price: 100000,
    current_value: 105000,
    purchase_date: '2024-02-20T00:00:00Z',
    user_id: 'demo-user'
  }
];

export const MOCK_KYC_STATUS = {
  status: 'pending',
  verification_level: 'basic',
  verified_at: null,
  expires_at: null,
  documents_submitted: ['passport', 'address_proof'],
  last_updated: new Date().toISOString()
};

export const MOCK_LOANS = [
  {
    id: '1',
    user_id: 'demo-user',
    amount: 10000,
    currency: 'USD',
    interest_rate: 5.5,
    duration_days: 365,
    collateral_type: 'XLM',
    collateral_amount: 15000,
    status: 'active',
    created_at: '2024-01-01T00:00:00Z',
    due_date: '2025-01-01T00:00:00Z',
    repaid_amount: 2000,
    remaining_amount: 8550
  },
  {
    id: '2',
    user_id: 'demo-user',
    amount: 5000,
    currency: 'USD',
    interest_rate: 4.5,
    duration_days: 180,
    collateral_type: 'USDC',
    collateral_amount: 7000,
    status: 'active',
    created_at: '2024-03-15T00:00:00Z',
    due_date: '2024-09-15T00:00:00Z',
    repaid_amount: 1000,
    remaining_amount: 4112.5
  }
];
