'use client'

import { useEffect, useState } from 'react'
import * as React from 'react'
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'
import type { CustomerDebtInfo } from '../page'
import { Textarea } from '@/components/ui/textarea'
import { createPayment } from '@/app/payments/actions'
import { formatCurrency } from '@/lib/utils'

const paymentFormSchema = z.object({
  amount: z.coerce.number().min(1, "Số tiền phải lớn hơn 0."),
  paymentDate: z.string().min(1, "Ngày thanh toán là bắt buộc."),
  notes: z.string().optional(),
});

type PaymentFormValues = z.infer<typeof paymentFormSchema>;

interface PaymentFormProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  customer?: CustomerDebtInfo;
}

const FormattedNumberInput = React.forwardRef<HTMLInputElement, { value: number; onChange: (value: number) => void; [key: string]: any }>(
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

    return <Input ref={ref} type="text" value={displayValue} onChange={handleChange} {...props} />;
  }
);

FormattedNumberInput.displayName = 'FormattedNumberInput';


export function PaymentForm({ isOpen, onOpenChange, customer }: PaymentFormProps) {
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      amount: 0,
      paymentDate: new Date().toISOString().split('T')[0],
      notes: '',
    },
  });

  useEffect(() => {
    if (isOpen && customer) {
      form.reset({
        amount: customer.finalDebt > 0 ? customer.finalDebt : 0,
        paymentDate: new Date().toISOString().split('T')[0],
        notes: `Thanh toán công nợ cho khách hàng ${customer.customerName}`,
      });
    }
  }, [isOpen, customer, form]);

  const onSubmit = async (data: PaymentFormValues) => {
    if(!customer) return;
    
    const result = await createPayment({
      customerId: customer.customerId,
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
      router.refresh();
    } else {
      toast({
        variant: "destructive",
        title: "Ôi! Đã có lỗi xảy ra.",
        description: result.error,
      });
    }
  };

  if(!customer) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ghi nhận thanh toán</DialogTitle>
          <DialogDescription>
            Tạo một khoản thanh toán công nợ cho khách hàng{' '}
            <span className="font-semibold">{customer.customerName}</span>. 
            Nợ hiện tại: <span className="font-semibold text-destructive">{formatCurrency(customer.finalDebt)}</span>
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
