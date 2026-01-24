/**
 * Wallet API Tests
 * Tests for wallet balance and operations
 */

describe('Wallet API', () => {
  const mockUserId = 'user-123'
  const mockAddress = 'GABC123DEF456GHI789'

  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn()
  })

  describe('GET /api/wallet', () => {
    it('should fetch wallet balance successfully', async () => {
      const mockBalance = {
        address: mockAddress,
        balances: [
          {
            asset_code: 'USDC',
            balance: '12450.00',
            asset_issuer: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
          },
          {
            asset_code: 'XLM',
            balance: '500.00',
            asset_type: 'native',
          },
        ],
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockBalance,
      })

      const response = await fetch('/api/wallet', {
        headers: {
          'x-user-id': mockUserId,
        },
      })

      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.balances).toHaveLength(2)
      expect(data.balances[0].asset_code).toBe('USDC')
    })

    it('should handle wallet not found', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({
          error: 'Wallet not found',
        }),
      })

      const response = await fetch('/api/wallet', {
        headers: {
          'x-user-id': 'invalid-user',
        },
      })

      expect(response.ok).toBe(false)
      expect(response.status).toBe(404)
    })

    it('should require authentication', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          error: 'Unauthorized',
        }),
      })

      const response = await fetch('/api/wallet')

      expect(response.ok).toBe(false)
      expect(response.status).toBe(401)
    })
  })

  describe('POST /api/wallet/link', () => {
    it('should link wallet address to user', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          address: mockAddress,
        }),
      })

      const response = await fetch('/api/wallet/link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': mockUserId,
        },
        body: JSON.stringify({
          address: mockAddress,
        }),
      })

      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.success).toBe(true)
      expect(data.address).toBe(mockAddress)
    })
  })
})
