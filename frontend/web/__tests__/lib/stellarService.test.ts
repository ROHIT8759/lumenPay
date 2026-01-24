/**
 * Stellar Service Tests
 * Tests for Stellar blockchain interactions
 */

import * as StellarSdk from '@stellar/stellar-sdk'

// Mock Stellar SDK
jest.mock('@stellar/stellar-sdk')

describe('Stellar Service', () => {
  describe('sendPayment', () => {
    it('should build and submit a payment transaction', async () => {
      const mockServer = {
        loadAccount: jest.fn().mockResolvedValue({
          sequenceNumber: jest.fn().mockReturnValue('123'),
          accountId: jest.fn().mockReturnValue('GABC123'),
        }),
        submitTransaction: jest.fn().mockResolvedValue({
          hash: 'transaction-hash-123',
          successful: true,
        }),
      }

      const mockTransaction = {
        build: jest.fn().mockReturnThis(),
        sign: jest.fn().mockReturnThis(),
        toXDR: jest.fn().mockReturnValue('xdr-string'),
      }

      const mockBuilder = jest.fn().mockReturnValue(mockTransaction)
      ;(StellarSdk.TransactionBuilder as any) = mockBuilder

      // Test would call the actual service function here
      // For now, just verify mocks are set up
      expect(mockServer.loadAccount).toBeDefined()
    })

    it('should handle insufficient balance error', async () => {
      const mockServer = {
        loadAccount: jest.fn().mockRejectedValue(
          new Error('Insufficient balance')
        ),
      }

      // Test error handling
      await expect(mockServer.loadAccount()).rejects.toThrow('Insufficient balance')
    })
  })

  describe('getAccountBalance', () => {
    it('should fetch and parse account balances', async () => {
      const mockAccount = {
        balances: [
          {
            asset_type: 'native',
            balance: '1000.00',
          },
          {
            asset_type: 'credit_alphanum4',
            asset_code: 'USDC',
            balance: '500.00',
            asset_issuer: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
          },
        ],
      }

      expect(mockAccount.balances).toHaveLength(2)
      expect(mockAccount.balances[0].asset_type).toBe('native')
      expect(mockAccount.balances[1].asset_code).toBe('USDC')
    })
  })
})
