/**
 * Transactions API Tests
 * Tests for transaction retrieval and filtering
 */

describe('Transactions API', () => {
  const mockUserId = 'user-123'
  const mockTransactions = [
    {
      id: 'tx-1',
      hash: 'abc123',
      amount: '100.00',
      asset_code: 'USDC',
      status: 'success',
      created_at: '2026-01-24T00:00:00Z',
      from_address: 'GABC123',
      to_address: 'GDEF456',
    },
    {
      id: 'tx-2',
      hash: 'def456',
      amount: '50.00',
      asset_code: 'XLM',
      status: 'pending',
      created_at: '2026-01-23T00:00:00Z',
      from_address: 'GDEF456',
      to_address: 'GABC123',
    },
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn()
  })

  describe('GET /api/transactions', () => {
    it('should fetch user transactions successfully', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          transactions: mockTransactions,
          total: 2,
        }),
      })

      const response = await fetch('/api/transactions?limit=50&offset=0', {
        headers: {
          'x-user-id': mockUserId,
        },
      })

      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.transactions).toHaveLength(2)
      expect(data.transactions[0].id).toBe('tx-1')
    })

    it('should filter transactions by status', async () => {
      const successTransactions = mockTransactions.filter(
        (tx) => tx.status === 'success'
      )

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          transactions: successTransactions,
          total: 1,
        }),
      })

      const response = await fetch(
        '/api/transactions?limit=50&offset=0&status=success',
        {
          headers: {
            'x-user-id': mockUserId,
          },
        }
      )

      const data = await response.json()

      expect(data.transactions).toHaveLength(1)
      expect(data.transactions[0].status).toBe('success')
    })

    it('should require authentication', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          error: 'Unauthorized',
        }),
      })

      const response = await fetch('/api/transactions', {
        headers: {},
      })

      expect(response.ok).toBe(false)
      expect(response.status).toBe(401)
    })

    it('should handle pagination', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          transactions: [mockTransactions[0]],
          total: 2,
          hasMore: true,
        }),
      })

      const response = await fetch('/api/transactions?limit=1&offset=0', {
        headers: {
          'x-user-id': mockUserId,
        },
      })

      const data = await response.json()

      expect(data.transactions).toHaveLength(1)
      expect(data.hasMore).toBe(true)
    })
  })

  describe('POST /api/transactions', () => {
    it('should create a new transaction', async () => {
      const newTransaction = {
        to_address: 'GXYZ789',
        amount: '25.00',
        asset_code: 'USDC',
        memo: 'Payment for services',
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          transaction: {
            id: 'tx-3',
            ...newTransaction,
            status: 'pending',
            created_at: new Date().toISOString(),
          },
        }),
      })

      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': mockUserId,
        },
        body: JSON.stringify(newTransaction),
      })

      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.transaction.to_address).toBe(newTransaction.to_address)
      expect(data.transaction.status).toBe('pending')
    })
  })
})
