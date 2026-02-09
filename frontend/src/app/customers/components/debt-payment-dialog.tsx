'use client'

import React, { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
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
  FormDescription,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'
import type { Customer } from '@/lib/types'
import { Textarea } from '@/components/ui/textarea'
import { addPayment } from '@/app/payments/actions'
import { formatCurrency } from '@/lib/utils'
import { Separator } from '@/components/ui/separator'

const paymentFormSchema = z.object({
  amount: z.coerce.number().min(1, "Số tiền phải lớn hơn 0."),
  paymentDate: z.string().min(1, "Ngày thanh toán là bắt buộc."),
  notes: z.string().optional(),
  sendNotification: z.boolean().default(true),
});

type PaymentFormValues = z.infer<typeof paymentFormSchema>;

interface DebtPaymentDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  customer: Customer;
  debtInfo: {
      paid: number;
      debt: number;
  }
}

const FormattedNumberInput = ({ value, onChange, ...props }: { value: number; onChange: (value: number) => void; [key: string]: any }) => {
  const [displayValue, setDisplayValue] = React.useState(value?.toLocaleString('en-US') || '');

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

  return <Input type="text" value={displayValue} onChange={handleChange} {...props} />;
};


export function DebtPaymentDialog({ isOpen, onOpenChange, customer, debtInfo }: DebtPaymentDialogProps) {
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
    if (isOpen) {
      const hasContact = !!(customer.email || customer.phone);
      form.reset({
        amount: debtInfo.debt > 0 ? debtInfo.debt : 0,
        paymentDate: new Date().toISOString().split('T')[0],
        notes: `Thanh toán công nợ cho khách hàng ${customer.name}`,
        sendNotification: hasContact, // Auto-enable if customer has contact info
      });
    }
  }, [isOpen, customer, debtInfo, form]);

  const onSubmit = async (data: PaymentFormValues) => {
    const result = await addPayment({
      customerId: customer.id,
      amount: data.amount,
      paymentDate: new Date(data.paymentDate).toISOString(),
      notes: data.notes,
    });

    if (result.success) {
      // Send notification if enabled and customer has contact info
      if (data.sendNotification && (customer.email || customer.phone)) {
        try {
          const remainingDebt = debtInfo.debt - data.amount;
          const notificationMessage = remainingDebt > 0
            ? `Cảm ơn bạn đã thanh toán ${formatCurrency(data.amount)}. Số nợ còn lại: ${formatCurrency(remainingDebt)}.`
            : `Cảm ơn bạn đã thanh toán ${formatCurrency(data.amount)}. Bạn đã thanh toán hết công nợ!`;

          await fetch('/api/debt-reminder/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              customerId: customer.id,
              message: notificationMessage,
            }),
          });
        } catch (error) {
          console.error('Failed to send notification:', error);
          // Don't fail the payment if notification fails
        }
      }

      toast({
        title: "Thành công!",
        description: data.sendNotification 
          ? "Đã ghi nhận thanh toán và gửi thông báo cho khách hàng."
          : "Đã ghi nhận thanh toán thành công.",
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

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Thanh toán công nợ</DialogTitle>
          <DialogDescription>
            Ghi nhận thanh toán cho khách hàng{' '}
            <span className="font-semibold">{customer.name}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 text-sm">
            <div className="flex justify-between">
                <span className="text-muted-foreground">Đã trả trước đó:</span>
                <span>{formatCurrency(debtInfo.paid)}</span>
            </div>
            <div className="flex justify-between font-bold">
                <span className="text-muted-foreground">Nợ hiện tại:</span>
                <span className="text-destructive">{formatCurrency(debtInfo.debt)}</span>
            </div>
        </div>
        <Separator />

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
                    <Textarea placeholder="Thêm ghi chú cho khoản thanh toán..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="sendNotification"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={!customer.email && !customer.phone}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      Gửi thông báo cho khách hàng
                    </FormLabel>
                    <FormDescription>
                      {customer.email && customer.phone && (
                        <>Gửi qua email ({customer.email}) hoặc SMS ({customer.phone})</>
                      )}
                      {customer.email && !customer.phone && (
                        <>Gửi qua email: {customer.email}</>
                      )}
                      {!customer.email && customer.phone && (
                        <>Gửi qua SMS: {customer.phone}</>
                      )}
                      {!customer.email && !customer.phone && (
                        <span className="text-destructive">Khách hàng không có email hoặc số điện thoại</span>
                      )}
                    </FormDescription>
                  </div>
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
