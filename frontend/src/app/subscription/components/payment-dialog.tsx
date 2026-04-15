'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  Building2,
  Check,
  ArrowRight
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface PaymentDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  planName: string;
  planPrice: number;
  maxStores: number;
  onConfirm: (paymentMethod: string) => Promise<void>;
}

type PaymentMethod = 'bank_transfer' | 'cash';

const paymentMethods = [
  {
    id: 'bank_transfer' as PaymentMethod,
    name: 'Chuyển khoản ngân hàng',
    description: 'Chuyển khoản trực tiếp qua ngân hàng',
    icon: <Building2 className="h-5 w-5" />,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
  },
];

export function PaymentDialog({
  isOpen,
  onOpenChange,
  planName,
  planPrice,
  maxStores,
  onConfirm,
}: PaymentDialogProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('bank_transfer');
  const [isProcessing, setIsProcessing] = useState(false);

  const vat = planPrice * 0.1; // 10% VAT
  const totalAmount = planPrice + vat;

  const handleConfirm = async () => {
    setIsProcessing(true);
    try {
      await onConfirm(selectedMethod);
    } finally {
      setIsProcessing(false);
    }
  };

  // Format plan name for display
  const getPlanDisplayInfo = () => {
    if (planName.includes('Cơ Bản')) {
      return {
        name: planName,
        stores: '1 cửa hàng',
        note: 'Phù hợp cho cửa hàng nhỏ, mới bắt đầu'
      };
    } else if (planName.includes('Chuyên Nghiệp')) {
      return {
        name: planName,
        stores: '5 cửa hàng',
        note: 'Phù hợp cho chuỗi cửa hàng vừa và nhỏ'
      };
    } else {
      return {
        name: planName,
        stores: 'Không giới hạn',
        note: 'Phù hợp cho doanh nghiệp lớn, nhiều chi nhánh'
      };
    }
  };

  const planInfo = getPlanDisplayInfo();

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Thanh toán gói dịch vụ</DialogTitle>
          <DialogDescription>
            Chọn phương thức thanh toán để nâng cấp gói dịch vụ
          </DialogDescription>
        </DialogHeader>

        {/* Order Summary */}
        <div className="bg-muted/50 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-medium">Gói dịch vụ:</span>
            <span className="font-semibold text-lg">{planInfo.name}</span>
          </div>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Số cửa hàng:</span>
            <span>{planInfo.stores}</span>
          </div>
          <div className="text-xs text-muted-foreground italic">
            💡 {planInfo.note}
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <span>Giá gói:</span>
            <span>{formatCurrency(planPrice)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>VAT (10%):</span>
            <span>{formatCurrency(vat)}</span>
          </div>
          <Separator />
          <div className="flex items-center justify-between text-lg font-bold">
            <span>Tổng thanh toán:</span>
            <span className="text-primary">{formatCurrency(totalAmount)}</span>
          </div>
          <div className="text-xs text-muted-foreground">
            * Giá trên là giá theo tháng, tự động gia hạn hàng tháng
          </div>
        </div>

        {/* Payment Methods */}
        <div className="space-y-3">
          <Label className="text-base font-semibold">Chọn phương thức thanh toán</Label>
          <RadioGroup value={selectedMethod} onValueChange={(value) => setSelectedMethod(value as PaymentMethod)}>
            {paymentMethods.map((method) => (
              <div key={method.id} className="relative">
                <RadioGroupItem
                  value={method.id}
                  id={method.id}
                  className="peer sr-only"
                />
                <Label
                  htmlFor={method.id}
                  className={`flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all hover:bg-muted/50 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 ${
                    selectedMethod === method.id ? 'border-primary bg-primary/5' : 'border-border'
                  }`}
                >
                  <div className={`p-2 rounded-lg ${method.bgColor} ${method.color}`}>
                    {method.icon}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold mb-1">{method.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {method.description}
                    </div>
                  </div>
                  {selectedMethod === method.id && (
                    <div className="text-primary">
                      <Check className="h-5 w-5" />
                    </div>
                  )}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        {/* Bank Transfer Info */}
        {selectedMethod === 'bank_transfer' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
            <div className="font-semibold text-blue-900 flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Thông tin chuyển khoản
            </div>
            <div className="text-sm space-y-1 text-blue-800">
              <div><strong>Ngân hàng:</strong> Vietcombank</div>
              <div><strong>Số tài khoản:</strong> 1234567890</div>
              <div><strong>Chủ tài khoản:</strong> CÔNG TY TNHH SMART INVENTORY</div>
              <div><strong>Nội dung:</strong> NANGCAP [SỐ ĐIỆN THOẠI]</div>
            </div>
            <div className="text-xs text-blue-700 mt-2">
              * Sau khi chuyển khoản, vui lòng liên hệ hotline để được kích hoạt ngay
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
            disabled={isProcessing}
          >
            Hủy
          </Button>
          <Button
            className="flex-1"
            onClick={handleConfirm}
            disabled={isProcessing}
          >
            {isProcessing ? (
              'Đang xử lý...'
            ) : (
              <>
                Thanh toán {formatCurrency(totalAmount)}
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>

        {/* Security Note */}
        <div className="text-xs text-center text-muted-foreground">
          🔒 Giao dịch được bảo mật bởi SSL 256-bit encryption
        </div>
      </DialogContent>
    </Dialog>
  );
}
