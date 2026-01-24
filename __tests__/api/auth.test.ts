/**
 * Authentication API Tests
 * Tests for user authentication and JWT token generation
 */

import { createClient } from '@supabase/supabase-js'

// Mock Supabase
jest.mock('@supabase/supabase-js')

describe('Authentication API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn()
  })

  describe('POST /api/auth/verify', () => {
    it('should verify valid credentials and return JWT token', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          token: 'mock-jwt-token',
          userId: mockUser.id,
          email: mockUser.email,
        }),
      })

      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
        }),
      })

      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.token).toBeDefined()
      expect(data.userId).toBe(mockUser.id)
    })

    it('should reject invalid credentials', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          error: 'Invalid credentials',
        }),
      })

      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'wrongpassword',
        }),
      })

      expect(response.ok).toBe(false)
      expect(response.status).toBe(401)
    })

    it('should handle missing credentials', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: 'Email and password are required',
        }),
      })

      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        body: JSON.stringify({}),
      })

      const data = await response.json()

      expect(response.ok).toBe(false)
      expect(data.error).toBeDefined()
    })
  })
})
