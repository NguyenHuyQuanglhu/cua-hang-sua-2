/**
 * Hook for API requests with automatic retry and error handling
 * 
 * Features:
 * - Automatic retry on network/server errors
 * - Toast notifications for errors
 * - Loading state management
 * - Error recovery
 * 
 * Requirements: All requirements from pos-sales-ui-improvements spec
 */

import { useState, useCallback } from 'react'
import { useToast } from './use-toast'
import {
  fetchWithRetry,
  getErrorMessage,
  isRecoverableError,
  RetryOptions,
  ApiError
} from '@/lib/error-handling'

export interface UseApiWithRetryOptions extends RetryOptions {
  showErrorToast?: boolean
  showSuccessToast?: boolean
  successMessage?: string
}

export interface UseApiWithRetryResult<T> {
  data: T | null
  error: ApiError | null
  isLoading: boolean
  execute: (url: string, options?: RequestInit) => Promise<T | null>
  reset: () => void
}

/**
 * Hook for making API requests with automatic retry and error handling
 * 
 * @example
 * ```tsx
 * const { data, error, isLoading, execute } = useApiWithRetry<Sale>({
 *   maxRetries: 3,
 *   showErrorToast: true
 * })
 * 
 * const handleSubmit = async () => {
 *   const result = await execute('/api/sales', {
 *     method: 'POST',
 *     body: JSON.stringify(saleData)
 *   })
 *   if (result) {
 *     // Success
 *   }
 * }
 * ```
 */
export function useApiWithRetry<T = any>(
  options: UseApiWithRetryOptions = {}
): UseApiWithRetryResult<T> {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<ApiError | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const {
    showErrorToast = true,
    showSuccessToast = false,
    successMessage,
    ...retryOptions
  } = options

  const execute = useCallback(
    async (url: string, fetchOptions: RequestInit = {}): Promise<T | null> => {
      setIsLoading(true)
      setError(null)

      try {
        const response = await fetchWithRetry(url, fetchOptions, retryOptions)
        const result = await response.json()

        setData(result)
        setIsLoading(false)

        if (showSuccessToast && successMessage) {
          toast({
            title: 'Thành công',
            description: successMessage,
          })
        }

        return result
      } catch (err) {
        const apiError = err as ApiError
        setError(apiError)
        setIsLoading(false)

        if (showErrorToast) {
          const errorMessage = getErrorMessage(apiError)
          const isRecoverable = isRecoverableError(apiError)

          toast({
            variant: 'destructive',
            title: isRecoverable ? 'Lỗi kết nối' : 'Lỗi',
            description: isRecoverable
              ? `${errorMessage}. Đã thử lại ${retryOptions.maxRetries || 3} lần. Vui lòng kiểm tra kết nối và thử lại.`
              : errorMessage,
          })
        }

        return null
      }
    },
    [toast, showErrorToast, showSuccessToast, successMessage, retryOptions]
  )

  const reset = useCallback(() => {
    setData(null)
    setError(null)
    setIsLoading(false)
  }, [])

  return {
    data,
    error,
    isLoading,
    execute,
    reset,
  }
}

/**
 * Hook for making API requests with manual retry capability
 * 
 * @example
 * ```tsx
 * const { data, error, isLoading, execute, retry } = useApiWithManualRetry<Sale>()
 * 
 * const handleSubmit = async () => {
 *   await execute('/api/sales', {
 *     method: 'POST',
 *     body: JSON.stringify(saleData)
 *   })
 * }
 * 
 * const handleRetry = () => {
 *   retry()
 * }
 * ```
 */
export function useApiWithManualRetry<T = any>(
  options: UseApiWithRetryOptions = {}
) {
  const [lastRequest, setLastRequest] = useState<{
    url: string
    options?: RequestInit
  } | null>(null)

  const apiResult = useApiWithRetry<T>(options)

  const execute = useCallback(
    async (url: string, fetchOptions?: RequestInit) => {
      setLastRequest({ url, options: fetchOptions })
      return apiResult.execute(url, fetchOptions)
    },
    [apiResult]
  )

  const retry = useCallback(() => {
    if (lastRequest) {
      return apiResult.execute(lastRequest.url, lastRequest.options)
    }
    return Promise.resolve(null)
  }, [lastRequest, apiResult])

  return {
    ...apiResult,
    execute,
    retry,
  }
}
