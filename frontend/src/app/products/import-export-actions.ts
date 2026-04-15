'use server'

import { cookies } from 'next/headers'

/**
 * Download product import template
 */
export async function downloadProductTemplate(): Promise<{
  success: boolean
  data?: string
  error?: string
}> {
  try {
    // Get token from cookies instead of apiClient
    const cookieStore = cookies()
    const token = cookieStore.get('auth_token')?.value

    if (!token) {
      return {
        success: false,
        error: 'Chưa đăng nhập',
      }
    }

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/bulk/template`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      throw new Error('Failed to download template')
    }

    const blob = await response.blob()
    const base64 = await blobToBase64(blob)
    
    return { success: true, data: base64 }
  } catch (error) {
    console.error('Error downloading template:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Không thể tải template',
    }
  }
}

/**
 * Import products from Excel file
 */
export async function importProductsFromExcel(base64File: string): Promise<{
  success: boolean
  imported?: number
  failed?: number
  errors?: Array<{ row: number; error: string }>
  error?: string
}> {
  try {
    // Get token and store ID from cookies
    const cookieStore = cookies()
    const token = cookieStore.get('auth_token')?.value
    const storeId = cookieStore.get('store_id')?.value

    if (!token) {
      return {
        success: false,
        error: 'Chưa đăng nhập',
      }
    }

    if (!storeId) {
      return {
        success: false,
        error: 'Chưa chọn cửa hàng',
      }
    }

    // Convert base64 to blob
    const blob = base64ToBlob(base64File, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    
    // Create FormData
    const formData = new FormData()
    formData.append('file', blob, 'products.xlsx')

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/bulk/import`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Store-Id': storeId,
      },
      body: formData,
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Failed to import products')
    }

    return {
      success: result.success,
      imported: result.imported,
      failed: result.failed,
      errors: result.errors,
    }
  } catch (error) {
    console.error('Error importing products:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Không thể import sản phẩm',
    }
  }
}

/**
 * Export products to Excel
 */
export async function exportProductsToExcel(): Promise<{
  success: boolean
  data?: string
  error?: string
}> {
  try {
    // Get token and store ID from cookies
    const cookieStore = cookies()
    const token = cookieStore.get('auth_token')?.value
    const storeId = cookieStore.get('store_id')?.value

    if (!token) {
      return {
        success: false,
        error: 'Chưa đăng nhập',
      }
    }

    if (!storeId) {
      return {
        success: false,
        error: 'Chưa chọn cửa hàng',
      }
    }

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/bulk/export`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Store-Id': storeId,
      },
    })

    if (!response.ok) {
      throw new Error('Failed to export products')
    }

    const blob = await response.blob()
    const base64 = await blobToBase64(blob)
    
    return { success: true, data: base64 }
  } catch (error) {
    console.error('Error exporting products:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Không thể xuất dữ liệu',
    }
  }
}

// Helper functions
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(',')[1]
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteCharacters = atob(base64)
  const byteNumbers = new Array(byteCharacters.length)
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i)
  }
  const byteArray = new Uint8Array(byteNumbers)
  return new Blob([byteArray], { type: mimeType })
}
