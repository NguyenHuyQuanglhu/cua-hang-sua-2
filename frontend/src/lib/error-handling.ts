/**
 * Error Handling Utilities for Frontend
 * 
 * This module provides comprehensive error handling for:
 * - localStorage errors (fallback to in-memory state)
 * - API request failures (toast notifications, retry logic)
 * - Invalid status values from API
 * 
 * Requirements: All requirements from pos-sales-ui-improvements spec
 */

import { OrderStatus } from '@/types/sales'

// ============================================================================
// LocalStorage Error Handling
// ============================================================================

/**
 * In-memory fallback storage when localStorage is unavailable
 */
class InMemoryStorage {
  private storage: Map<string, string> = new Map()

  getItem(key: string): string | null {
    return this.storage.get(key) || null
  }

  setItem(key: string, value: string): void {
    this.storage.set(key, value)
  }

  removeItem(key: string): void {
    this.storage.delete(key)
  }

  clear(): void {
    this.storage.clear()
  }
}

const inMemoryStorage = new InMemoryStorage()

/**
 * Safe localStorage wrapper with automatic fallback to in-memory storage
 * 
 * Handles errors such as:
 * - QuotaExceededError (storage full)
 * - SecurityError (private browsing mode)
 * - Any other localStorage access errors
 */
export const safeStorage = {
  /**
   * Get item from localStorage with fallback
   */
  getItem(key: string): string | null {
    if (typeof window === 'undefined') return null

    try {
      return localStorage.getItem(key)
    } catch (error) {
      console.warn(`localStorage.getItem failed for key "${key}":`, error)
      return inMemoryStorage.getItem(key)
    }
  },

  /**
   * Set item in localStorage with fallback
   */
  setItem(key: string, value: string): void {
    if (typeof window === 'undefined') return

    try {
      localStorage.setItem(key, value)
    } catch (error) {
      console.warn(`localStorage.setItem failed for key "${key}":`, error)
      // Fallback to in-memory storage
      try {
        inMemoryStorage.setItem(key, value)
      } catch (memError) {
        // Even in-memory storage failed, just log it
        console.error('In-memory storage also failed:', memError)
      }
      
      // Show user-friendly warning (only once per session)
      if (typeof sessionStorage !== 'undefined') {
        try {
          if (!sessionStorage.getItem('localStorage_warning_shown')) {
            sessionStorage.setItem('localStorage_warning_shown', 'true')
            console.warn('localStorage is unavailable. Using in-memory storage. Data will be lost on page refresh.')
          }
        } catch {
          // Ignore sessionStorage errors
        }
      }
    }
  },

  /**
   * Remove item from localStorage with fallback
   */
  removeItem(key: string): void {
    if (typeof window === 'undefined') return

    try {
      localStorage.removeItem(key)
    } catch (error) {
      console.warn(`localStorage.removeItem failed for key "${key}":`, error)
      inMemoryStorage.removeItem(key)
    }
  },

  /**
   * Clear all items from localStorage with fallback
   */
  clear(): void {
    if (typeof window === 'undefined') return

    try {
      localStorage.clear()
    } catch (error) {
      console.warn('localStorage.clear failed:', error)
      inMemoryStorage.clear()
    }
  }
}

// ============================================================================
// API Error Handling
// ============================================================================

export interface ApiError {
  message: string
  code?: string
  status?: number
  details?: any
}

export interface RetryOptions {
  maxRetries?: number
  retryDelay?: number
  shouldRetry?: (error: ApiError, attempt: number) => boolean
}

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  retryDelay: 1000,
  shouldRetry: (error: ApiError, attempt: number) => {
    // Retry on network errors or 5xx server errors
    if (!error.status) return true // Network error
    if (error.status >= 500 && error.status < 600) return true // Server error
    return false
  }
}

/**
 * Sleep utility for retry delays
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * Fetch with automatic retry logic
 * 
 * @param url - The URL to fetch
 * @param options - Fetch options
 * @param retryOptions - Retry configuration
 * @returns Promise<Response>
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retryOptions: RetryOptions = {}
): Promise<Response> {
  const config = { ...DEFAULT_RETRY_OPTIONS, ...retryOptions }
  let lastError: ApiError | null = null

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      const response = await fetch(url, options)
      
      // If response is ok, return it
      if (response.ok) {
        return response
      }

      // Create error from response
      const error: ApiError = {
        message: response.statusText || 'Request failed',
        status: response.status
      }

      // Try to parse error details from response body
      try {
        const errorData = await response.json()
        error.message = errorData.message || errorData.error || error.message
        error.code = errorData.code
        error.details = errorData.details
      } catch {
        // Ignore JSON parse errors
      }

      lastError = error

      // Check if we should retry
      if (attempt < config.maxRetries && config.shouldRetry(error, attempt)) {
        console.warn(`Request failed (attempt ${attempt + 1}/${config.maxRetries + 1}):`, error.message)
        await sleep(config.retryDelay * (attempt + 1)) // Exponential backoff
        continue
      }

      // No more retries, throw error
      throw error
    } catch (error) {
      // Network error or other exception
      if (error instanceof TypeError && error.message.includes('fetch')) {
        lastError = {
          message: 'Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.',
          code: 'NETWORK_ERROR'
        }
      } else if (error && typeof error === 'object' && 'message' in error) {
        lastError = error as ApiError
      } else {
        lastError = {
          message: 'Đã xảy ra lỗi không xác định',
          code: 'UNKNOWN_ERROR'
        }
      }

      // Check if we should retry
      if (attempt < config.maxRetries && config.shouldRetry(lastError, attempt)) {
        console.warn(`Request failed (attempt ${attempt + 1}/${config.maxRetries + 1}):`, lastError.message)
        await sleep(config.retryDelay * (attempt + 1))
        continue
      }

      // No more retries, throw error
      throw lastError
    }
  }

  // Should never reach here, but TypeScript needs it
  throw lastError || new Error('Request failed')
}

/**
 * Get user-friendly error message from API error
 */
export function getErrorMessage(error: unknown): string {
  if (!error) return 'Đã xảy ra lỗi không xác định'

  if (typeof error === 'string') return error

  if (error && typeof error === 'object') {
    const apiError = error as ApiError
    
    // Check for specific error codes
    if (apiError.code === 'NETWORK_ERROR') {
      return 'Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.'
    }
    
    if (apiError.code === 'TIMEOUT') {
      return 'Yêu cầu hết thời gian chờ. Vui lòng thử lại.'
    }

    if (apiError.message) return apiError.message
  }

  return 'Đã xảy ra lỗi không xác định'
}

// ============================================================================
// Status Validation
// ============================================================================

const VALID_STATUSES: OrderStatus[] = ['pending', 'processed']

/**
 * Validate and normalize order status from API
 * 
 * Handles invalid status values by:
 * 1. Validating against allowed values
 * 2. Providing fallback to 'pending' for safety
 * 3. Logging warnings for debugging
 * 
 * @param status - Status value from API
 * @returns Validated OrderStatus
 */
export function validateOrderStatus(status: unknown): OrderStatus {
  // Handle null/undefined
  if (status === null || status === undefined) {
    console.warn('Received null/undefined status, defaulting to "pending"')
    return 'pending'
  }

  // Handle non-string values
  if (typeof status !== 'string') {
    console.warn(`Received non-string status: ${typeof status}, defaulting to "pending"`)
    return 'pending'
  }

  // Normalize to lowercase
  const normalizedStatus = status.toLowerCase().trim()

  // Check if valid
  if (VALID_STATUSES.includes(normalizedStatus as OrderStatus)) {
    return normalizedStatus as OrderStatus
  }

  // Invalid status - log warning and return fallback
  console.warn(`Invalid order status received: "${status}", defaulting to "pending"`)
  return 'pending'
}

/**
 * Validate status array from API response
 * Filters out invalid statuses and logs warnings
 */
export function validateOrderStatuses(statuses: unknown[]): OrderStatus[] {
  if (!Array.isArray(statuses)) {
    console.warn('Expected array of statuses, received:', typeof statuses)
    return []
  }

  return statuses
    .map(validateOrderStatus)
    .filter((status, index) => {
      const isValid = VALID_STATUSES.includes(status)
      if (!isValid) {
        console.warn(`Filtered out invalid status at index ${index}:`, statuses[index])
      }
      return isValid
    })
}

// ============================================================================
// Error Boundary Helpers
// ============================================================================

/**
 * Check if error is recoverable (can retry)
 */
export function isRecoverableError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  
  const apiError = error as ApiError
  
  // Network errors are recoverable
  if (apiError.code === 'NETWORK_ERROR') return true
  
  // Timeout errors are recoverable
  if (apiError.code === 'TIMEOUT') return true
  
  // 5xx server errors are recoverable
  if (apiError.status && apiError.status >= 500 && apiError.status < 600) return true
  
  return false
}

/**
 * Check if error is a client error (4xx)
 */
export function isClientError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  
  const apiError = error as ApiError
  return !!(apiError.status && apiError.status >= 400 && apiError.status < 500)
}

/**
 * Check if error is a server error (5xx)
 */
export function isServerError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  
  const apiError = error as ApiError
  return !!(apiError.status && apiError.status >= 500 && apiError.status < 600)
}
