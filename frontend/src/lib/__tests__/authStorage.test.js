import { describe, it, expect, vi, beforeEach } from 'vitest'
import Cookies from 'js-cookie'
import { authStorage } from '@/lib/authStorage'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('authStorage', () => {
  const mockTokens = { access: 'access-123', refresh: 'refresh-456' }
  const mockUser = { id: 'u1', email: 'test@cbt.com', role: 'student' }

  describe('getTokens / setTokens', () => {
    it('returns null when no cookie exists', () => {
      Cookies.get.mockReturnValue(undefined)
      expect(authStorage.getTokens()).toBeNull()
    })

    it('parses and returns tokens from cookie', () => {
      Cookies.get.mockReturnValue(JSON.stringify(mockTokens))
      expect(authStorage.getTokens()).toEqual(mockTokens)
    })

    it('returns null for malformed JSON', () => {
      Cookies.get.mockReturnValue('not-json')
      expect(authStorage.getTokens()).toBeNull()
    })

    it('sets tokens cookie with JSON string', () => {
      authStorage.setTokens(mockTokens)
      expect(Cookies.set).toHaveBeenCalledWith(
        'cbt_tokens',
        JSON.stringify(mockTokens),
        expect.objectContaining({ expires: 30, path: '/' })
      )
    })
  })

  describe('getUser / setUser', () => {
    it('returns null when no user cookie exists', () => {
      Cookies.get.mockReturnValue(undefined)
      expect(authStorage.getUser()).toBeNull()
    })

    it('parses and returns user from cookie', () => {
      Cookies.get.mockReturnValue(JSON.stringify(mockUser))
      expect(authStorage.getUser()).toEqual(mockUser)
    })

    it('returns null for malformed user JSON', () => {
      Cookies.get.mockReturnValue('{bad')
      expect(authStorage.getUser()).toBeNull()
    })

    it('sets user cookie', () => {
      authStorage.setUser(mockUser)
      expect(Cookies.set).toHaveBeenCalledWith(
        'cbt_user',
        JSON.stringify(mockUser),
        expect.objectContaining({ expires: 30, path: '/' })
      )
    })
  })

  describe('removeTokens / removeUser', () => {
    it('removes tokens cookie', () => {
      authStorage.removeTokens()
      expect(Cookies.remove).toHaveBeenCalledWith('cbt_tokens', { path: '/' })
    })

    it('removes user cookie', () => {
      authStorage.removeUser()
      expect(Cookies.remove).toHaveBeenCalledWith('cbt_user', { path: '/' })
    })
  })

  describe('clear', () => {
    it('removes both tokens and user cookies', () => {
      authStorage.clear()
      expect(Cookies.remove).toHaveBeenCalledTimes(2)
    })
  })
})
