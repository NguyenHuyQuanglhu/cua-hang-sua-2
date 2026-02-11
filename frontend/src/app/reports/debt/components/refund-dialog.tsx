'use client'

import { useState } from 'react'
import { DollarSign, Loader2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { apiClient } from '@/lib/api-client'
import { formatCurrency } from '@/lib/utils'
import { FormattedNumberInput } from '@/components/formatted-number-input'

const refundFormSchema = z.object({
  amount: z.number().positive('Số tiền phải lớn hơn 0'),
  paymentMethod: z.enum(['cash', 'bank_transfer', 'momo', 'zalopay'], {
    required_error: 'Vui lòng chọn phương thức hoàn tiền',
  }),
  notes: z.string().optional(),
})

type RefundFormValues = z.infer<typeof refundFormSchema>

interface RefundDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  customer: {
    customerId: string
    customerName: string
    customerPhone?: string
    excessAmount: number // Số tiền khách trả thừa (số dương)
  }
  onSuccess?: () => void
}

export function RefundDialog({
  isOpen,
  onOpenChange,
  customer,
  onSuccess,
}: RefundDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const form = useForm<RefundFormValues>({
    resolver: zodResolver(refundFormSchema),
    defaultValues: {
      amount: customer.excessAmount,
      paymentMethod: 'cash',
      notes: `Hoàn tiền trả thừa cho khách hàng ${customer.customerName}`,
    },
  })

  const onSubmit = async (values: RefundFormValues) => {
    try {
      setIsSubmitting(true)

      // Call refund API
      const response = await apiClient.createRefund({
        customerId: customer.customerId,
        amount: values.amount,
        paymentMethod: values.paymentMethod,
        notes: values.notes,
      })

      toast({
        title: 'Hoàn tiền thành công',
        description: response.message || `Đã hoàn ${formatCurrency(values.amount)} cho khách hàng ${customer.customerName}`,
      })

      form.reset()
      onOpenChange(false)
      onSuccess?.()
    } catch (error: any) {
      console.error('Refund error:', error)
      toast({
        title: 'Lỗi hoàn tiền',
        description: error.message || 'Không thể hoàn tiền. Vui lòng thử lại.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Hoàn tiền cho khách hàng</DialogTitle>
          <DialogDescription>
            Khách hàng <strong>{customer.customerName}</strong> đã trả thừa{' '}
            <strong className="text-primary">{formatCurrency(customer.excessAmount)}</strong>.
            Vui lòng xác nhận hoàn tiền.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Số tiền hoàn</FormLabel>
                  <FormControl>
                    <FormattedNumberInput
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Nhập số tiền hoàn"
                      max={customer.excessAmount}
                    />
                  </FormControl>
                  <FormMessage />
                  <p className="text-xs text-muted-foreground">
                    Tối đa: {formatCurrency(customer.excessAmount)}
                  </p>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="paymentMethod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phương thức hoàn tiền</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn phương thức" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="cash">Tiền mặt</SelectItem>
                      <SelectItem value="bank_transfer">Chuyển khoản</SelectItem>
                      <SelectItem value="momo">MoMo</SelectItem>
                      <SelectItem value="zalopay">ZaloPay</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ghi chú</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Ghi chú về việc hoàn tiền..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <DollarSign className="mr-2 h-4 w-4" />
                Xác nhận hoàn tiền
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
