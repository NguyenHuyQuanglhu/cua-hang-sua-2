'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/hooks/use-toast'
import { apiClient } from '@/lib/api-client'

interface CreateVoucherDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function CreateVoucherDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateVoucherDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    discountType: 'percentage',
    discountValue: 0,
    maxDiscountAmount: 0,
    minPurchaseAmount: 0,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0],
    usageLimit: 100,
    usagePerCustomer: 1,
    autoGenerate: false,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await apiClient.request<{ code: string }>('/vouchers', {
        method: 'POST',
        body: JSON.stringify({
          ...formData,
          status: 'active',
          maxDiscountAmount: formData.maxDiscountAmount || null,
          minPurchaseAmount: formData.minPurchaseAmount || null,
        }),
      })

      toast({
        title: 'Thành công',
        description: `Đã tạo voucher ${response.code}`,
      })

      onSuccess()
      onOpenChange(false)
      
      // Reset form
      setFormData({
        code: '',
        name: '',
        description: '',
        discountType: 'percentage',
        discountValue: 0,
        maxDiscountAmount: 0,
        minPurchaseAmount: 0,
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
        usageLimit: 100,
        usagePerCustomer: 1,
        autoGenerate: false,
      })
    } catch (error) {
      console.error('Create voucher error:', error)
      toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: 'Không thể tạo voucher',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tạo mã giảm giá</DialogTitle>
          <DialogDescription>
            Tạo voucher mới cho khách hàng
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="autoGenerate"
              checked={formData.autoGenerate}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, autoGenerate: checked as boolean })
              }
            />
            <Label htmlFor="autoGenerate">Tự động tạo mã</Label>
          </div>

          {!formData.autoGenerate && (
            <div className="space-y-2">
              <Label htmlFor="code">Mã voucher *</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) =>
                  setFormData({ ...formData, code: e.target.value.toUpperCase() })
                }
                placeholder="VD: SALE50K"
                required={!formData.autoGenerate}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Tên voucher *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Mô tả</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Loại giảm giá</Label>
            <Select
              value={formData.discountType}
              onValueChange={(value) =>
                setFormData({ ...formData, discountType: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percentage">Giảm theo %</SelectItem>
                <SelectItem value="fixed">Giảm số tiền cố định</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="discountValue">
              {formData.discountType === 'percentage' ? 'Giảm giá (%)' : 'Giảm giá (VNĐ)'}
            </Label>
            <Input
              id="discountValue"
              type="number"
              value={formData.discountValue}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  discountValue: parseFloat(e.target.value),
                })
              }
              required
            />
          </div>

          {formData.discountType === 'percentage' && (
            <div className="space-y-2">
              <Label htmlFor="maxDiscount">Giảm tối đa (VNĐ)</Label>
              <Input
                id="maxDiscount"
                type="number"
                value={formData.maxDiscountAmount}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    maxDiscountAmount: parseFloat(e.target.value),
                  })
                }
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="minPurchase">Đơn hàng tối thiểu (VNĐ)</Label>
            <Input
              id="minPurchase"
              type="number"
              value={formData.minPurchaseAmount}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  minPurchaseAmount: parseFloat(e.target.value),
                })
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Ngày bắt đầu</Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) =>
                  setFormData({ ...formData, startDate: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">Ngày kết thúc</Label>
              <Input
                id="endDate"
                type="date"
                value={formData.endDate}
                onChange={(e) =>
                  setFormData({ ...formData, endDate: e.target.value })
                }
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="usageLimit">Tổng lượt sử dụng</Label>
              <Input
                id="usageLimit"
                type="number"
                value={formData.usageLimit}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    usageLimit: parseInt(e.target.value),
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="usagePerCustomer">Lượt/khách hàng</Label>
              <Input
                id="usagePerCustomer"
                type="number"
                value={formData.usagePerCustomer}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    usagePerCustomer: parseInt(e.target.value),
                  })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Đang tạo...' : 'Tạo voucher'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
