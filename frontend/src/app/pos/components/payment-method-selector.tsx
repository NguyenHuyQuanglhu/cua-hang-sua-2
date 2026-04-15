'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { QrCode, Banknote, CreditCard, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';

export type PaymentMethod = 'cash' | 'qr' | 'card' | 'transfer';

interface PaymentMethodSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelectMethod: (method: PaymentMethod) => void;
  amount: number;
}

export function PaymentMethodSelector({
  open,
  onClose,
  onSelectMethod,
  amount,
}: PaymentMethodSelectorProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);

  const paymentMethods = [
    {
      id: 'cash' as PaymentMethod,
      name: 'Tiền mặt',
      icon: Banknote,
      description: 'Thanh toán bằng tiền mặt',
      color: 'bg-green-500 hover:bg-green-600',
    },
    {
      id: 'qr' as PaymentMethod,
      name: 'QR Code',
      icon: QrCode,
      description: 'Quét mã QR để thanh toán',
      color: 'bg-blue-500 hover:bg-blue-600',
    },
    {
      id: 'card' as PaymentMethod,
      name: 'Thẻ',
      icon: CreditCard,
      description: 'Thanh toán bằng thẻ',
      color: 'bg-purple-500 hover:bg-purple-600',
    },
    {
      id: 'transfer' as PaymentMethod,
      name: 'Chuyển khoản',
      icon: Wallet,
      description: 'Chuyển khoản ngân hàng',
      color: 'bg-orange-500 hover:bg-orange-600',
    },
  ];

  const handleSelect = (method: PaymentMethod) => {
    setSelectedMethod(method);
    onSelectMethod(method);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Chọn phương thức thanh toán</DialogTitle>
          <DialogDescription>
            Số tiền cần thanh toán: <span className="font-bold text-lg text-primary">{amount.toLocaleString('vi-VN')} đ</span>
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-4">
          {paymentMethods.map((method) => {
            const Icon = method.icon;
            return (
              <button
                key={method.id}
                onClick={() => handleSelect(method.id)}
                className={cn(
                  'flex flex-col items-center justify-center p-6 rounded-lg border-2 transition-all',
                  'hover:border-primary hover:shadow-lg',
                  selectedMethod === method.id ? 'border-primary bg-primary/5' : 'border-border'
                )}
              >
                <div className={cn('p-4 rounded-full text-white mb-3', method.color)}>
                  <Icon className="h-8 w-8" />
                </div>
                <h3 className="font-semibold text-lg mb-1">{method.name}</h3>
                <p className="text-sm text-muted-foreground text-center">{method.description}</p>
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
