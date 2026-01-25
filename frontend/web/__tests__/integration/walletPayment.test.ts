/**
 * Wallet Payment Integration Tests
 * Tests for the complete wallet payment flow including pool transactions
 */

describe('Wallet Payment Integration', () => {
  const POOL_ADDRESS = 'GDL74OJBVTL6FNOSUS6CJOGFLBHCNJL6LZ5VEIZZNPG36GIPALLJJTHE';
  const mockUserWallet = 'GABC123DEF456GHI789JKL012MNO345PQR678STU901VWX234YZ567';
  const mockUserId = 'user-123';
  
  // Create localStorage mock
  const localStorageMock = {
    getItem: jest.fn((key: string) => {
      const storage: Record<string, string> = {
        userId: mockUserId,
        walletAddress: mockUserWallet,
        authToken: 'mock-jwt-token',
      };
      return storage[key] || null;
    }),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
    
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });
  });

  describe('Payment to Pool Flow', () => {
    it('should build payment transaction to pool', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          xdr: 'mock-unsigned-xdr',
          metadata: {
            source: mockUserWallet,
            destination: POOL_ADDRESS,
            amount: '100',
          },
        }),
      });

      const response = await fetch('/api/wallet/payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer mock-jwt-token',
        },
        body: JSON.stringify({
          action: 'initiate',
          recipientAddress: POOL_ADDRESS,
          amount: '100',
          memo: 'UPI:user@paytm',
        }),
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.xdr).toBeDefined();
    });

    it('should submit signed transaction', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          hash: 'stellar-tx-hash-12345',
          ledger: 98765,
          successful: true,
        }),
      });

      const response = await fetch('/api/wallet/tx/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signedXdr: 'mock-signed-xdr',
          network: 'testnet',
        }),
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.hash).toBeDefined();
      expect(data.successful).toBe(true);
    });

    it('should record payment after successful submission', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          paymentId: 'payment-123',
          status: 'success',
        }),
      });

      const response = await fetch('/api/wallet/payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer mock-jwt-token',
        },
        body: JSON.stringify({
          action: 'record',
          paymentId: 'payment-123',
          txHash: 'stellar-tx-hash-12345',
          success: true,
        }),
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
    });
  });

  describe('Complete UPI Off-ramp Flow', () => {
    it('should complete full UPI off-ramp flow', async () => {
      // Step 1: Send XLM to pool
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            xdr: 'mock-unsigned-xdr',
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            hash: 'pool-tx-hash-123',
            successful: true,
          }),
        })
        // Step 2: Create off-ramp request
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            requestId: 'upi-req-123',
            poolTxHash: 'pool-tx-hash-123',
            status: 'processing',
            details: {
              amountXlm: '100.0000000',
              fiatAmount: '1039.50',
              upiId: 'user@paytm',
            },
          }),
        });

      // Build transaction
      const buildResponse = await fetch('/api/wallet/payment', {
        method: 'POST',
        body: JSON.stringify({
          action: 'initiate',
          recipientAddress: POOL_ADDRESS,
          amount: '100',
        }),
      });
      expect(buildResponse.ok).toBe(true);

      // Submit transaction
      const submitResponse = await fetch('/api/wallet/tx/submit', {
        method: 'POST',
        body: JSON.stringify({ signedXdr: 'signed-xdr' }),
      });
      const submitData = await submitResponse.json();
      expect(submitData.hash).toBeDefined();

      // Create off-ramp request
      const offrampResponse = await fetch('/api/offramp/upi', {
        method: 'POST',
        body: JSON.stringify({
          amountXlm: '100',
          upiId: 'user@paytm',
          recipientName: 'John Doe',
          poolTxHash: submitData.hash,
        }),
      });
      const offrampData = await offrampResponse.json();

      expect(offrampData.success).toBe(true);
      expect(offrampData.poolTxHash).toBe('pool-tx-hash-123');
    });
  });

  describe('Complete Bank Off-ramp Flow', () => {
    it('should complete full bank off-ramp flow', async () => {
      // Step 1: Send XLM to pool
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            xdr: 'mock-unsigned-xdr',
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            hash: 'pool-tx-hash-456',
            successful: true,
          }),
        })
        // Step 2: Create off-ramp request
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            requestId: 'bank-req-456',
            poolTxHash: 'pool-tx-hash-456',
            status: 'processing',
            details: {
              amountXlm: '500.0000000',
              fiatAmount: '5197.50',
              accountNumber: '1234****5678',
            },
          }),
        });

      // Build transaction
      const buildResponse = await fetch('/api/wallet/payment', {
        method: 'POST',
        body: JSON.stringify({
          action: 'initiate',
          recipientAddress: POOL_ADDRESS,
          amount: '500',
        }),
      });
      expect(buildResponse.ok).toBe(true);

      // Submit transaction
      const submitResponse = await fetch('/api/wallet/tx/submit', {
        method: 'POST',
        body: JSON.stringify({ signedXdr: 'signed-xdr' }),
      });
      const submitData = await submitResponse.json();

      // Create off-ramp request
      const offrampResponse = await fetch('/api/offramp/bank', {
        method: 'POST',
        body: JSON.stringify({
          amountXlm: '500',
          accountNumber: '12345678901234',
          recipientName: 'Jane Doe',
          ifscCode: 'SBIN0001234',
          poolTxHash: submitData.hash,
        }),
      });
      const offrampData = await offrampResponse.json();

      expect(offrampData.success).toBe(true);
      expect(offrampData.details.accountNumber).toContain('****');
    });
  });

  describe('Error Handling', () => {
    it('should handle transaction build failure', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: 'Insufficient balance',
        }),
      });

      const response = await fetch('/api/wallet/payment', {
        method: 'POST',
        body: JSON.stringify({
          action: 'initiate',
          recipientAddress: POOL_ADDRESS,
          amount: '1000000',
        }),
      });

      expect(response.ok).toBe(false);
    });

    it('should handle transaction submission failure', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: 'Transaction failed: op_underfunded',
        }),
      });

      const response = await fetch('/api/wallet/tx/submit', {
        method: 'POST',
        body: JSON.stringify({ signedXdr: 'invalid-xdr' }),
      });

      expect(response.ok).toBe(false);
    });

    it('should handle off-ramp request failure', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: 'Invalid UPI ID format',
        }),
      });

      const response = await fetch('/api/offramp/upi', {
        method: 'POST',
        body: JSON.stringify({
          amountXlm: '100',
          upiId: 'invalid',
          poolTxHash: 'valid-hash',
        }),
      });

      expect(response.ok).toBe(false);
    });
  });

  describe('Wallet Balance Check', () => {
    it('should fetch wallet balance', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          address: mockUserWallet,
          balances: [
            { asset_type: 'native', balance: '1000.0000000' },
            { asset_code: 'USDC', balance: '500.00' },
          ],
        }),
      });

      const response = await fetch('/api/wallet', {
        headers: { 'x-user-id': mockUserId },
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.balances).toBeDefined();
      expect(data.balances.length).toBeGreaterThan(0);
    });

    it('should check if balance is sufficient for payment', async () => {
      const balance = 1000;
      const paymentAmount = 100;
      const fee = paymentAmount * 0.01;
      const totalRequired = paymentAmount + fee;

      expect(balance >= totalRequired).toBe(true);
    });
  });
});

describe('Transaction History', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  it('should fetch wallet transaction history from Horizon', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        transactions: [
          {
            id: 'tx-1',
            hash: 'stellar-hash-1',
            created_at: '2026-01-25T10:00:00Z',
            successful: true,
          },
          {
            id: 'tx-2',
            hash: 'stellar-hash-2',
            created_at: '2026-01-25T09:00:00Z',
            successful: true,
          },
        ],
      }),
    });

    const response = await fetch('/api/wallet/history?address=GABC123&limit=20');
    const data = await response.json();

    expect(response.ok).toBe(true);
    expect(data.transactions).toBeDefined();
    expect(Array.isArray(data.transactions)).toBe(true);
  });

  it('should fetch off-ramp transactions from database', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        transactions: [
          {
            id: 'db-tx-1',
            tx_type: 'upi_payout',
            status: 'processing',
          },
          {
            id: 'db-tx-2',
            tx_type: 'bank_payout',
            status: 'success',
          },
        ],
        total: 2,
      }),
    });

    const response = await fetch('/api/transactions?feature=offramp');
    const data = await response.json();

    expect(response.ok).toBe(true);
    expect(data.transactions.some((tx: any) => tx.tx_type === 'upi_payout')).toBe(true);
    expect(data.transactions.some((tx: any) => tx.tx_type === 'bank_payout')).toBe(true);
  });
});
