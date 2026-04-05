'use client'

import { useState } from 'react'
import { Tag, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { apiClient } from '@/lib/api-client'
import { formatCurrency } from '@/lib/utils'

interface VoucherInputProps {
  subtotal: number
  customerId?: string
  onVoucherApplied: (voucher: any, discount: number) => void
  onVoucherRemoved: () => void
  appliedVoucher?: any
}

export function VoucherInput({
  subtotal,
  customerId,
  onVoucherApplied,
  onVoucherRemoved,
  appliedVoucher,
}: VoucherInputProps) {
  const [code, setCode] = useState('')
  const [isValidating, setIsValidating] = useState(false)
  const { toast } = useToast()

  type VoucherValidateResponse = {
    valid: boolean
    voucher?: {
      code: string
      name?: string
    }
    discount?: number
    error?: string
  }

  const validateVoucher = async () => {
    if (!code.trim()) {
      toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: 'Vui lòng nhập mã voucher',
      })
      return
    }

    setIsValidating(true)
    try {
      const response = await apiClient.request<VoucherValidateResponse>('/vouchers/validate', {
        method: 'POST',
        body: {
          code: code.trim().toUpperCase(),
          subtotal,
          customerId,
        },
      })

      if (response.valid && response.voucher) {
        onVoucherApplied(response.voucher, Number(response.discount || 0))
        setCode('')
        toast({
          title: 'Thành công',
          description: `Đã áp dụng mã ${response.voucher.code}`,
        })
      } else {
        toast({
          variant: 'destructive',
          title: 'Mã không hợp lệ',
          description: response.error || 'Mã giảm giá không hợp lệ',
        })
      }
    } catch (error) {
      console.error('Validate voucher error:', error)
      toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: 'Không thể xác thực mã giảm giá',
      })
    } finally {
      setIsValidating(false)
    }
  }

  const removeVoucher = () => {
    onVoucherRemoved()
    toast({
      title: 'Đã xóa',
      description: 'Đã xóa mã giảm giá',
    })
  }

  if (appliedVoucher) {
    return (
      <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-center gap-2">
          <Tag className="h-4 w-4 text-green-600" />
          <div>
            <div className="font-semibold text-green-900">
              {appliedVoucher.code}
            </div>
            <div className="text-sm text-green-700">
              {appliedVoucher.name}
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={removeVoucher}
          className="h-8 w-8"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
        <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Nhập mã giảm giá"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === 'Enter' && validateVoucher()}
          className="pl-10"
          disabled={isValidating}
        />
      </div>
      <Button
        onClick={validateVoucher}
        disabled={isValidating || !code.trim()}
      >
        {isValidating ? 'Đang kiểm tra...' : 'Áp dụng'}
      </Button>
    </div>
  )
}
