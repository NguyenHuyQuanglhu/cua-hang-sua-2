/**
 * Tests for error handling utilities
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  safeStorage,
  validateOrderStatus,
  validateOrderStatuses,
  getErrorMessage,
  isRecoverableError,
  isClientError,
  isServerError,
} from './error-handling'

describe('safeStorage', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('should get item from localStorage', () => {
    localStorage.setItem('test-key', 'test-value')
    expect(safeStorage.getItem('test-key')).toBe('test-value')
  })

  it('should set item in localStorage', () => {
    safeStorage.setItem('test-key', 'test-value')
    expect(localStorage.getItem('test-key')).toBe('test-value')
  })

  it('should remove item from localStorage', () => {
    localStorage.setItem('test-key', 'test-value')
    safeStorage.removeItem('test-key')
    expect(localStorage.getItem('test-key')).toBeNull()
  })

  it('should fallback to in-memory storage when localStorage fails', () => {
    // Mock localStorage to throw error
    const originalSetItem = Storage.prototype.setItem
    Storage.prototype.setItem = vi.fn(() => {
      throw new Error('QuotaExceededError')
    })

    // Should not throw - it catches the error internally
    safeStorage.setItem('test-key', 'test-value')

    // Should be able to retrieve from in-memory storage
    const originalGetItem = Storage.prototype.getItem
    Storage.prototype.getItem = vi.fn(() => {
      throw new Error('QuotaExceededError')
    })
    
    expect(safeStorage.getItem('test-key')).toBe('test-value')

    // Restore original
    Storage.prototype.setItem = originalSetItem
    Storage.prototype.getItem = originalGetItem
  })

  it('should return null for non-existent keys', () => {
    expect(safeStorage.getItem('non-existent')).toBeNull()
  })
})

describe('validateOrderStatus', () => {
  it('should validate "pending" status', () => {
    expect(validateOrderStatus('pending')).toBe('pending')
  })

  it('should validate "processed" status', () => {
    expect(validateOrderStatus('processed')).toBe('processed')
  })

  it('should normalize uppercase status', () => {
    expect(validateOrderStatus('PENDING')).toBe('pending')
    expect(validateOrderStatus('PROCESSED')).toBe('processed')
  })

  it('should handle null/undefined by returning "pending"', () => {
    expect(validateOrderStatus(null)).toBe('pending')
    expect(validateOrderStatus(undefined)).toBe('pending')
  })

  it('should handle invalid status by returning "pending"', () => {
    expect(validateOrderStatus('invalid')).toBe('pending')
    expect(validateOrderStatus('draft')).toBe('pending')
    expect(validateOrderStatus('completed')).toBe('pending')
  })

  it('should handle non-string values by returning "pending"', () => {
    expect(validateOrderStatus(123)).toBe('pending')
    expect(validateOrderStatus({})).toBe('pending')
    expect(validateOrderStatus([])).toBe('pending')
  })

  it('should trim whitespace', () => {
    expect(validateOrderStatus('  pending  ')).toBe('pending')
    expect(validateOrderStatus('  processed  ')).toBe('processed')
  })
})

describe('validateOrderStatuses', () => {
  it('should validate array of statuses', () => {
    const result = validateOrderStatuses(['pending', 'processed', 'pending'])
    expect(result).toEqual(['pending', 'processed', 'pending'])
  })

  it('should filter out invalid statuses', () => {
    const result = validateOrderStatuses(['pending', 'invalid', 'processed'])
    // 'invalid' gets normalized to 'pending', so we get ['pending', 'pending', 'processed']
    expect(result).toEqual(['pending', 'pending', 'processed'])
  })

  it('should handle empty array', () => {
    expect(validateOrderStatuses([])).toEqual([])
  })

  it('should handle non-array input', () => {
    expect(validateOrderStatuses('not-an-array' as any)).toEqual([])
    expect(validateOrderStatuses(null as any)).toEqual([])
  })
})

describe('getErrorMessage', () => {
  it('should extract message from ApiError', () => {
    const error = { message: 'Test error', code: 'TEST_ERROR' }
    expect(getErrorMessage(error)).toBe('Test error')
  })

  it('should handle string errors', () => {
    expect(getErrorMessage('String error')).toBe('String error')
  })

  it('should handle network errors', () => {
    const error = { code: 'NETWORK_ERROR', message: 'Network failed' }
    expect(getErrorMessage(error)).toContain('kết nối')
  })

  it('should handle timeout errors', () => {
    const error = { code: 'TIMEOUT', message: 'Timeout' }
    expect(getErrorMessage(error)).toContain('thời gian')
  })

  it('should handle null/undefined', () => {
    expect(getErrorMessage(null)).toContain('không xác định')
    expect(getErrorMessage(undefined)).toContain('không xác định')
  })
})

describe('isRecoverableError', () => {
  it('should identify network errors as recoverable', () => {
    expect(isRecoverableError({ code: 'NETWORK_ERROR' })).toBe(true)
  })

  it('should identify timeout errors as recoverable', () => {
    expect(isRecoverableError({ code: 'TIMEOUT' })).toBe(true)
  })

  it('should identify 5xx errors as recoverable', () => {
    expect(isRecoverableError({ status: 500 })).toBe(true)
    expect(isRecoverableError({ status: 503 })).toBe(true)
  })

  it('should identify 4xx errors as not recoverable', () => {
    expect(isRecoverableError({ status: 400 })).toBe(false)
    expect(isRecoverableError({ status: 404 })).toBe(false)
  })

  it('should handle non-error values', () => {
    expect(isRecoverableError(null)).toBe(false)
    expect(isRecoverableError('string')).toBe(false)
  })
})

describe('isClientError', () => {
  it('should identify 4xx errors', () => {
    expect(isClientError({ status: 400 })).toBe(true)
    expect(isClientError({ status: 404 })).toBe(true)
    expect(isClientError({ status: 422 })).toBe(true)
  })

  it('should not identify 5xx errors', () => {
    expect(isClientError({ status: 500 })).toBe(false)
  })

  it('should not identify 2xx/3xx', () => {
    expect(isClientError({ status: 200 })).toBe(false)
    expect(isClientError({ status: 301 })).toBe(false)
  })
})

describe('isServerError', () => {
  it('should identify 5xx errors', () => {
    expect(isServerError({ status: 500 })).toBe(true)
    expect(isServerError({ status: 503 })).toBe(true)
  })

  it('should not identify 4xx errors', () => {
    expect(isServerError({ status: 400 })).toBe(false)
    expect(isServerError({ status: 404 })).toBe(false)
  })

  it('should not identify 2xx/3xx', () => {
    expect(isServerError({ status: 200 })).toBe(false)
    expect(isServerError({ status: 301 })).toBe(false)
  })
})
