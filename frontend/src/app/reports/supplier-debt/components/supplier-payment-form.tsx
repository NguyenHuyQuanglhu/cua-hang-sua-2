
'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useToast } from '@/hooks/use-toast'
import type { SupplierDebtInfo } from '../page'
import { Textarea } from '@/components/ui/textarea'
import { addSupplierPayment } from '@/app/suppliers/actions'
import { formatCurrency } from '@/lib/utils'

const paymentFormSchema = z.object({
  amount: z.coerce.number().min(1, "Số tiền phải lớn hơn 0."),
  paymentDate: z.string().min(1, "Ngày thanh toán là bắt buộc."),
  notes: z.string().optional(),
});

type PaymentFormValues = z.infer<typeof paymentFormSchema>;

interface SupplierPaymentFormProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  supplier?: SupplierDebtInfo;
  onSuccess?: () => void;
}

import React from 'react';

const FormattedNumberInput = React.forwardRef<HTMLInputElement, { value: number; onChange: (value: number) => void;[key: string]: any }>(
  ({ value, onChange, ...props }, ref) => {
    const [displayValue, setDisplayValue] = useState(value?.toLocaleString('en-US') || '');

    useEffect(() => {
      setDisplayValue(value?.toLocaleString('en-US') || '0');
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value.replace(/,/g, '');
      const numberValue = parseInt(rawValue, 10);

      if (!isNaN(numberValue)) {
        setDisplayValue(numberValue.toLocaleString('en-US'));
        onChange(numberValue);
      } else if (rawValue === '') {
        setDisplayValue('');
        onChange(0);
      }
    };

    return <Input type="text" ref={ref} value={displayValue} onChange={handleChange} {...props} />;
  }
);
FormattedNumberInput.displayName = 'FormattedNumberInput';


export function SupplierPaymentForm({ isOpen, onOpenChange, supplier, onSuccess }: SupplierPaymentFormProps) {
  const { toast } = useToast();

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      amount: 0,
      paymentDate: new Date().toISOString().split('T')[0],
      notes: '',
    },
  });

  useEffect(() => {
    if (isOpen && supplier) {
      form.reset({
        amount: supplier.finalDebt > 0 ? supplier.finalDebt : 0,
        paymentDate: new Date().toISOString().split('T')[0],
        notes: `Thanh toán công nợ cho nhà cung cấp ${supplier.supplierName}`,
      });
    }
  }, [isOpen, supplier, form]);

  const onSubmit = async (data: PaymentFormValues) => {
    if (!supplier) return;

    const result = await addSupplierPayment({
      supplierId: supplier.supplierId,
      amount: data.amount,
      paymentDate: new Date(data.paymentDate).toISOString(),
      notes: data.notes,
    });

    if (result.success) {
      toast({
        title: "Thành công!",
        description: "Đã ghi nhận thanh toán thành công.",
      });
      onOpenChange(false);
      onSuccess?.();
    } else {
      toast({
        variant: "destructive",
        title: "Ôi! Đã có lỗi xảy ra.",
        description: result.error,
      });
    }
  };

  if (!supplier) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Thanh toán cho Nhà cung cấp</DialogTitle>
          <DialogDescription>
            Tạo một khoản thanh toán cho nhà cung cấp{' '}
            <span className="font-semibold">{supplier.supplierName}</span>.
            Nợ hiện tại: <span className="font-semibold text-destructive">{formatCurrency(supplier.finalDebt)}</span>
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Số tiền thanh toán</FormLabel>
                  <FormControl>
                    <FormattedNumberInput {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="paymentDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ngày thanh toán</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
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
                    <Textarea placeholder="Thêm ghi chú cho khoản thanh toán (tùy chọn)..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Hủy</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Đang lưu...' : 'Lưu thanh toán'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
