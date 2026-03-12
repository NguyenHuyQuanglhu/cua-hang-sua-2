'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Loader2, QrCode } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface QRPaymentDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  amount: number;
  orderInfo: string;
}

export function QRPaymentDialog({
  open,
  onClose,
  onSuccess,
  amount,
  orderInfo,
}: QRPaymentDialogProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'success' | 'failed'>('pending');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      generateQRCode();
      // Simulate payment check (in real app, poll backend for payment status)
      const checkInterval = setInterval(() => {
        checkPaymentStatus();
      }, 3000);

      return () => clearInterval(checkInterval);
    }
  }, [open]);

  const generateQRCode = async () => {
    setIsLoading(true);
    try {
      // In real app, call backend to generate QR code
      // For now, generate a simple QR code using a free service
      const qrData = `PAYMENT|${amount}|${orderInfo}|${Date.now()}`;
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrData)}`;
      setQrCodeUrl(qrUrl);
    } catch (error) {
      toast({
        title: 'Lỗi',
        description: 'Không thể tạo mã QR',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const checkPaymentStatus = async () => {
    // In real app, call backend to check payment status
    // For demo, we'll just simulate
    console.log('Checking payment status...');
  };

  const handleManualConfirm = () => {
    setPaymentStatus('success');
    toast({
      title: 'Thanh toán thành công',
      description: 'Đã xác nhận thanh toán QR Code',
    });
    setTimeout(() => {
      onSuccess();
      onClose();
    }, 1000);
  };

  const handleCancel = () => {
    setPaymentStatus('failed');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Thanh toán QR Code</DialogTitle>
          <DialogDescription>
            Quét mã QR bằng ứng dụng ngân hàng để thanh toán
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center py-6 space-y-4">
          {/* Amount */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Số tiền thanh toán</p>
            <p className="text-3xl font-bold text-primary">{amount.toLocaleString('vi-VN')} đ</p>
          </div>

          {/* QR Code */}
          {isLoading ? (
            <div className="flex items-center justify-center w-[300px] h-[300px] border-2 border-dashed rounded-lg">
              <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
            </div>
          ) : paymentStatus === 'success' ? (
            <div className="flex flex-col items-center justify-center w-[300px] h-[300px] border-2 border-green-500 rounded-lg bg-green-50">
              <CheckCircle2 className="h-20 w-20 text-green-500 mb-4" />
              <p className="text-lg font-semibold text-green-700">Thanh toán thành công!</p>
            </div>
          ) : paymentStatus === 'failed' ? (
            <div className="flex flex-col items-center justify-center w-[300px] h-[300px] border-2 border-red-500 rounded-lg bg-red-50">
              <XCircle className="h-20 w-20 text-red-500 mb-4" />
              <p className="text-lg font-semibold text-red-700">Thanh toán thất bại</p>
            </div>
          ) : (
            <div className="relative">
              {qrCodeUrl ? (
                <img src={qrCodeUrl} alt="QR Code" className="w-[300px] h-[300px] border-2 rounded-lg" />
              ) : (
                <div className="flex items-center justify-center w-[300px] h-[300px] border-2 border-dashed rounded-lg">
                  <QrCode className="h-12 w-12 text-muted-foreground" />
                </div>
              )}
              {paymentStatus === 'pending' && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-white/90 rounded-full p-3">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Instructions */}
          {paymentStatus === 'pending' && (
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                1. Mở ứng dụng ngân hàng trên điện thoại
              </p>
              <p className="text-sm text-muted-foreground">
                2. Chọn chức năng quét mã QR
              </p>
              <p className="text-sm text-muted-foreground">
                3. Quét mã QR phía trên để thanh toán
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 w-full pt-4">
            {paymentStatus === 'pending' && (
              <>
                <Button variant="outline" onClick={handleCancel} className="flex-1">
                  Hủy
                </Button>
                <Button onClick={handleManualConfirm} className="flex-1">
                  Xác nhận đã thanh toán
                </Button>
              </>
            )}
            {paymentStatus === 'success' && (
              <Button onClick={() => { onSuccess(); onClose(); }} className="w-full">
                Hoàn tất
              </Button>
            )}
            {paymentStatus === 'failed' && (
              <Button variant="outline" onClick={onClose} className="w-full">
                Đóng
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
