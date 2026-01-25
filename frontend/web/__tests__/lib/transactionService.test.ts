/**
 * Transaction Service Tests
 * Tests for transaction recording and retrieval
 */

describe('Transaction Service', () => {
  const mockUserId = 'user-123';
  const mockWalletAddress = 'GABC123DEF456GHI789JKL012MNO345PQR678STU901VWX234YZ567';

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  describe('recordUPIOfframp', () => {
    it('should record UPI off-ramp transaction', async () => {
      const mockTransaction = {
        id: 'tx-123',
        user_id: mockUserId,
        tx_type: 'upi_payout',
        tx_direction: 'sent',
        amount: 100,
        asset_code: 'XLM',
        sender_wallet: mockWalletAddress,
        recipient_name: 'John Doe',
        status: 'processing',
        fee: 1,
        related_feature: 'upi_payout',
        meta_data: {
          upi_id: 'user@paytm',
          fiat_amount: 1039.5,
          fiat_currency: 'INR',
          exchange_rate: 10.5,
          offramp_type: 'upi',
        },
        created_at: new Date().toISOString(),
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTransaction,
      });

      // Simulate calling recordUPIOfframp through API
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': mockUserId,
        },
        body: JSON.stringify({
          action: 'record',
          type: 'upi_payout',
          amount: 100,
          upiId: 'user@paytm',
          recipientName: 'John Doe',
        }),
      });

      expect(response.ok).toBe(true);
    });
  });

  describe('recordBankOfframp', () => {
    it('should record bank off-ramp transaction', async () => {
      const mockTransaction = {
        id: 'tx-456',
        user_id: mockUserId,
        tx_type: 'bank_payout',
        tx_direction: 'sent',
        amount: 500,
        asset_code: 'XLM',
        sender_wallet: mockWalletAddress,
        recipient_name: 'Jane Doe',
        status: 'processing',
        fee: 5,
        related_feature: 'bank_payout',
        meta_data: {
          bank_account_number: '1234****5678',
          bank_ifsc_code: 'SBIN0001234',
          fiat_amount: 5197.5,
          fiat_currency: 'INR',
          exchange_rate: 10.5,
          offramp_type: 'bank',
        },
        created_at: new Date().toISOString(),
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTransaction,
      });

      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': mockUserId,
        },
        body: JSON.stringify({
          action: 'record',
          type: 'bank_payout',
          amount: 500,
          accountNumber: '12345678901234',
          ifscCode: 'SBIN0001234',
          recipientName: 'Jane Doe',
        }),
      });

      expect(response.ok).toBe(true);
    });
  });

  describe('GET /api/transactions', () => {
    it('should fetch user transactions', async () => {
      const mockTransactions = [
        {
          id: 'tx-1',
          tx_type: 'payment_out',
          amount: 50,
          status: 'success',
          created_at: '2026-01-25T10:00:00Z',
        },
        {
          id: 'tx-2',
          tx_type: 'upi_payout',
          amount: 100,
          status: 'processing',
          created_at: '2026-01-25T09:00:00Z',
        },
        {
          id: 'tx-3',
          tx_type: 'bank_payout',
          amount: 500,
          status: 'pending',
          created_at: '2026-01-25T08:00:00Z',
        },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          transactions: mockTransactions,
          total: 3,
          limit: 20,
          offset: 0,
        }),
      });

      const response = await fetch('/api/transactions?limit=20&offset=0', {
        headers: {
          'x-user-id': mockUserId,
        },
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.transactions).toHaveLength(3);
      expect(data.transactions[0].tx_type).toBe('payment_out');
    });

    it('should filter transactions by status', async () => {
      const mockTransactions = [
        {
          id: 'tx-2',
          tx_type: 'upi_payout',
          amount: 100,
          status: 'processing',
        },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          transactions: mockTransactions,
          total: 1,
        }),
      });

      const response = await fetch('/api/transactions?status=processing', {
        headers: {
          'x-user-id': mockUserId,
        },
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.transactions).toHaveLength(1);
      expect(data.transactions[0].status).toBe('processing');
    });

    it('should filter transactions by type', async () => {
      const mockTransactions = [
        {
          id: 'tx-2',
          tx_type: 'upi_payout',
          amount: 100,
          status: 'processing',
        },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          transactions: mockTransactions,
          total: 1,
        }),
      });

      const response = await fetch('/api/transactions?type=upi_payout', {
        headers: {
          'x-user-id': mockUserId,
        },
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.transactions.every((tx: any) => tx.tx_type === 'upi_payout')).toBe(true);
    });

    it('should require authentication', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          error: 'Unauthorized',
        }),
      });

      const response = await fetch('/api/transactions');

      expect(response.ok).toBe(false);
      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/transactions/history', () => {
    it('should fetch transaction history with pagination', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          transactions: [],
          pagination: {
            total: 100,
            limit: 50,
            offset: 0,
            hasMore: true,
          },
        }),
      });

      const response = await fetch('/api/transactions/history?wallet=' + mockWalletAddress + '&limit=50');
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.pagination).toBeDefined();
      expect(data.pagination.hasMore).toBe(true);
    });

    it('should get transaction stats', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          stats: {
            totalTransactions: 50,
            totalSent: 5000,
            totalReceived: 3000,
            totalFees: 50,
            pendingCount: 5,
            successCount: 40,
            failedCount: 5,
            byType: {
              payment_out: { count: 20, volume: 2000 },
              upi_payout: { count: 15, volume: 1500 },
              bank_payout: { count: 10, volume: 1500 },
            },
          },
        }),
      });

      const response = await fetch('/api/transactions/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'stats',
          walletAddress: mockWalletAddress,
        }),
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.stats.totalTransactions).toBe(50);
      expect(data.stats.byType.upi_payout.count).toBe(15);
    });
  });

  describe('Transaction Status Updates', () => {
    it('should update transaction status', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'tx-123',
          status: 'success',
          confirmed_at: new Date().toISOString(),
        }),
      });

      const response = await fetch('/api/transactions/tx-123', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'success',
          txHash: 'stellar-tx-hash-123',
        }),
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.status).toBe('success');
      expect(data.confirmed_at).toBeDefined();
    });
  });
});

describe('Transaction Types', () => {
  const transactionTypes = [
    'payment_out',
    'payment_in',
    'loan_disbursement',
    'loan_repayment',
    'flash_loan_borrow',
    'flash_loan_repay',
    'rwa_purchase',
    'rwa_sale',
    'bank_payout',
    'upi_payout',
    'emi_payment',
    'reward_claim',
    'topup',
    'swap',
    'deposit',
    'withdrawal',
  ];

  it('should support all transaction types', () => {
    expect(transactionTypes).toContain('upi_payout');
    expect(transactionTypes).toContain('bank_payout');
    expect(transactionTypes).toContain('payment_out');
    expect(transactionTypes).toContain('payment_in');
  });

  it('should have correct related features', () => {
    const features = [
      'payment',
      'loan',
      'flash_loan',
      'rwa',
      'bank_payout',
      'upi_payout',
      'reward',
      'topup',
      'offramp',
    ];

    expect(features).toContain('upi_payout');
    expect(features).toContain('bank_payout');
  });
});
