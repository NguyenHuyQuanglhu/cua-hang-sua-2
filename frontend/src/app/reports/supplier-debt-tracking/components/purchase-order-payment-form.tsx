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
import { Textarea } from '@/components/ui/textarea'
import { addSupplierPayment } from '@/app/suppliers/actions'
import { formatCurrency } from '@/lib/utils'

type PurchaseOrderDebt = {
  id: string;
  orderNumber: string;
  supplierId: string;
  supplierName: string;
  importDate: string;
  totalAmount: number;
  paidAmount: number;
  remainingDebt: number;
  paymentStatus: string;
}

const paymentFormSchema = z.object({
  amount: z.coerce.number().min(1, "Số tiền phải lớn hơn 0."),
  paymentDate: z.string().min(1, "Ngày thanh toán là bắt buộc."),
  notes: z.string().optional(),
});

type PaymentFormValues = z.infer<typeof paymentFormSchema>;

interface PurchaseOrderPaymentFormProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  purchaseOrder?: PurchaseOrderDebt;
  onSuccess?: () => void;
}

const FormattedNumberInput = ({ value, onChange, ...props }: { value: number; onChange: (value: number) => void; [key: string]: any }) => {
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

  return <Input type="text" value={displayValue} onChange={handleChange} {...props} />;
};


export function PurchaseOrderPaymentForm({ isOpen, onOpenChange, purchaseOrder, onSuccess }: PurchaseOrderPaymentFormProps) {
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
    if (isOpen && purchaseOrder) {
      form.reset({
        amount: purchaseOrder.remainingDebt > 0 ? purchaseOrder.remainingDebt : 0,
        paymentDate: new Date().toISOString().split('T')[0],
        notes: `Thanh toán đơn ${purchaseOrder.orderNumber} - ${purchaseOrder.supplierName}`,
      });
    }
  }, [isOpen, purchaseOrder, form]);

  const onSubmit = async (data: PaymentFormValues) => {
    if(!purchaseOrder) return;
    
    const paymentData = {
      supplierId: purchaseOrder.supplierId,
      purchaseId: purchaseOrder.id, // Chỉ định purchase order cụ thể
      amount: data.amount,
      paymentDate: new Date(data.paymentDate).toISOString(),
      notes: data.notes,
    };

    console.log('[PurchaseOrderPaymentForm] Sending payment data:', paymentData);
    
    // Thanh toán cho purchase order cụ thể
    const result = await addSupplierPayment(paymentData);

    if (result.success) {
      toast({
        title: "Thành công!",
        description: `Đã thanh toán ${formatCurrency(data.amount)} cho đơn ${purchaseOrder.orderNumber}.`,
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

  if(!purchaseOrder) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Thanh toán Đơn nhập hàng</DialogTitle>
          <DialogDescription>
            Thanh toán cho đơn <span className="font-semibold">{purchaseOrder.orderNumber}</span> từ{' '}
            <span className="font-semibold">{purchaseOrder.supplierName}</span>
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-2 py-4 bg-muted rounded-lg p-4">
          <div className="flex justify-between text-sm">
            <span>Tổng tiền đơn:</span>
            <span className="font-semibold">{formatCurrency(purchaseOrder.totalAmount)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Đã thanh toán:</span>
            <span className="font-semibold text-green-600">{formatCurrency(purchaseOrder.paidAmount)}</span>
          </div>
          <div className="flex justify-between text-sm border-t pt-2">
            <span>Còn nợ:</span>
            <span className="font-semibold text-destructive text-lg">{formatCurrency(purchaseOrder.remainingDebt)}</span>
          </div>
        </div>

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
