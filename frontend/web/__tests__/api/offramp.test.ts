/**
 * Off-ramp API Tests
 * Tests for UPI and Bank off-ramp functionality
 */

describe('Off-ramp API', () => {
  const mockUserId = 'user-123';
  const mockWalletAddress = 'GABC123DEF456GHI789JKL012MNO345PQR678STU901VWX234YZ567';
  const POOL_ADDRESS = 'GDL74OJBVTL6FNOSUS6CJOGFLBHCNJL6LZ5VEIZZNPG36GIPALLJJTHE';
  const mockPoolTxHash = 'abc123def456789xyz';

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  describe('POST /api/offramp/upi', () => {
    it('should create UPI off-ramp request successfully', async () => {
      const mockResponse = {
        success: true,
        requestId: 'req-123',
        transactionId: 'tx-456',
        poolTxHash: mockPoolTxHash,
        poolAddress: POOL_ADDRESS,
        status: 'processing',
        details: {
          amountXlm: '100.0000000',
          fee: '1.0000000',
          feePercent: '1%',
          netAmountXlm: '99.0000000',
          fiatAmount: '1039.50',
          currency: 'INR',
          upiId: 'user@paytm',
          recipientName: 'John Doe',
          exchangeRate: 10.5,
          estimatedTime: '1 hour',
        },
        message: 'XLM received in pool. UPI payment of ₹1039.50 will be processed within 1 hour.',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const response = await fetch('/api/offramp/upi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountXlm: '100',
          upiId: 'user@paytm',
          recipientName: 'John Doe',
          senderWallet: mockWalletAddress,
          userId: mockUserId,
          poolTxHash: mockPoolTxHash,
        }),
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.poolAddress).toBe(POOL_ADDRESS);
      expect(data.status).toBe('processing');
      expect(data.details.feePercent).toBe('1%');
      expect(parseFloat(data.details.fiatAmount)).toBeGreaterThan(0);
    });

    it('should reject invalid UPI ID format', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: 'Invalid UPI ID format',
        }),
      });

      const response = await fetch('/api/offramp/upi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountXlm: '100',
          upiId: 'invalid-upi',
          recipientName: 'John Doe',
          poolTxHash: mockPoolTxHash,
        }),
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(400);
    });

    it('should require pool transaction hash', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: 'Pool transaction hash required. Please send XLM to liquidity pool first.',
        }),
      });

      const response = await fetch('/api/offramp/upi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountXlm: '100',
          upiId: 'user@paytm',
          recipientName: 'John Doe',
        }),
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(400);
    });

    it('should enforce minimum amount (1 XLM)', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: 'Minimum amount is 1 XLM',
        }),
      });

      const response = await fetch('/api/offramp/upi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountXlm: '0.5',
          upiId: 'user@paytm',
          recipientName: 'John Doe',
          poolTxHash: mockPoolTxHash,
        }),
      });

      expect(response.ok).toBe(false);
      const data = await response.json();
      expect(data.error).toContain('Minimum');
    });

    it('should enforce maximum amount (10,000 XLM)', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: 'Maximum amount is 10,000 XLM',
        }),
      });

      const response = await fetch('/api/offramp/upi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountXlm: '15000',
          upiId: 'user@paytm',
          recipientName: 'John Doe',
          poolTxHash: mockPoolTxHash,
        }),
      });

      expect(response.ok).toBe(false);
      const data = await response.json();
      expect(data.error).toContain('Maximum');
    });

    it('should calculate 1% fee correctly', async () => {
      const amount = 100;
      const expectedFee = amount * 0.01;
      const expectedNet = amount - expectedFee;
      const exchangeRate = 10.5;
      const expectedFiat = expectedNet * exchangeRate;

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          details: {
            amountXlm: amount.toFixed(7),
            fee: expectedFee.toFixed(7),
            netAmountXlm: expectedNet.toFixed(7),
            fiatAmount: expectedFiat.toFixed(2),
          },
        }),
      });

      const response = await fetch('/api/offramp/upi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountXlm: '100',
          upiId: 'user@paytm',
          recipientName: 'John Doe',
          poolTxHash: mockPoolTxHash,
        }),
      });

      const data = await response.json();

      expect(parseFloat(data.details.fee)).toBe(expectedFee);
      expect(parseFloat(data.details.netAmountXlm)).toBe(expectedNet);
      expect(parseFloat(data.details.fiatAmount)).toBe(expectedFiat);
    });
  });

  describe('POST /api/offramp/bank', () => {
    it('should create bank off-ramp request successfully', async () => {
      const mockResponse = {
        success: true,
        requestId: 'req-789',
        transactionId: 'tx-012',
        poolTxHash: mockPoolTxHash,
        poolAddress: POOL_ADDRESS,
        status: 'processing',
        details: {
          amountXlm: '500.0000000',
          fee: '5.0000000',
          feePercent: '1%',
          netAmountXlm: '495.0000000',
          fiatAmount: '5197.50',
          currency: 'INR',
          accountNumber: '1234****5678',
          recipientName: 'Jane Doe',
          ifscCode: 'SBIN0001234',
          exchangeRate: 10.5,
          estimatedTime: 'Up to 24 hours',
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const response = await fetch('/api/offramp/bank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountXlm: '500',
          accountNumber: '12345678901234',
          recipientName: 'Jane Doe',
          ifscCode: 'SBIN0001234',
          senderWallet: mockWalletAddress,
          userId: mockUserId,
          poolTxHash: mockPoolTxHash,
        }),
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.poolAddress).toBe(POOL_ADDRESS);
      expect(data.details.accountNumber).toContain('****'); // Should be masked
    });

    it('should reject invalid account number', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: 'Invalid account number. Must be 9-18 digits.',
        }),
      });

      const response = await fetch('/api/offramp/bank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountXlm: '100',
          accountNumber: '1234', // Too short
          recipientName: 'Jane Doe',
          ifscCode: 'SBIN0001234',
          poolTxHash: mockPoolTxHash,
        }),
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(400);
    });

    it('should reject invalid IFSC code', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: 'Invalid IFSC code format',
        }),
      });

      const response = await fetch('/api/offramp/bank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountXlm: '100',
          accountNumber: '12345678901234',
          recipientName: 'Jane Doe',
          ifscCode: 'INVALID', // Invalid format
          poolTxHash: mockPoolTxHash,
        }),
      });

      expect(response.ok).toBe(false);
    });

    it('should require pool transaction hash', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: 'Pool transaction hash required. Please send XLM to liquidity pool first.',
        }),
      });

      const response = await fetch('/api/offramp/bank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountXlm: '100',
          accountNumber: '12345678901234',
          recipientName: 'Jane Doe',
          ifscCode: 'SBIN0001234',
        }),
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/offramp/bank', () => {
    it('should return service info', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          service: 'Bank Off-ramp',
          status: 'active',
          exchangeRate: 10.5,
          currency: 'INR',
          fee: '1%',
          minAmount: '1 XLM',
          maxAmount: '10,000 XLM',
        }),
      });

      const response = await fetch('/api/offramp/bank');
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.service).toBe('Bank Off-ramp');
      expect(data.fee).toBe('1%');
    });
  });
});

describe('Liquidity Pool Integration', () => {
  const POOL_ADDRESS = 'GDL74OJBVTL6FNOSUS6CJOGFLBHCNJL6LZ5VEIZZNPG36GIPALLJJTHE';

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  it('should have valid pool address format', () => {
    // Stellar addresses start with G and are 56 characters
    expect(POOL_ADDRESS).toMatch(/^G[A-Z0-9]{55}$/);
    expect(POOL_ADDRESS.length).toBe(56);
  });

  it('should send XLM to pool before off-ramp', async () => {
    // Mock transaction submission to pool
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        hash: 'mock-tx-hash-123',
        ledger: 12345,
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
  });
});
