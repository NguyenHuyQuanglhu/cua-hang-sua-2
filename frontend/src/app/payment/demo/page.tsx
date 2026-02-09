'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Loader2, CreditCard } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { apiClient } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';

function PaymentDemoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  const plan = searchParams.get('plan');
  const amount = searchParams.get('amount');
  const method = searchParams.get('method');
  
  const [status, setStatus] = useState<'processing' | 'success' | 'failed'>('processing');
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    // Simulate payment processing
    const timer = setTimeout(() => {
      // 90% success rate for demo
      const isSuccess = Math.random() > 0.1;
      setStatus(isSuccess ? 'success' : 'failed');
      
      if (isSuccess) {
        // Call API to actually upgrade the subscription
        upgradeSubscription();
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (status === 'success' && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (status === 'success' && countdown === 0) {
      router.push('/subscription');
    }
  }, [status, countdown, router]);

  const upgradeSubscription = async () => {
    try {
      const maxStores = plan === 'basic' ? 3 : plan === 'pro' ? 10 : 999;
      await apiClient.request('/subscription/upgrade', {
        method: 'POST',
        body: {
          planId: plan,
          maxStores,
          paymentMethod: method,
        }
      });
    } catch (error) {
      console.error('Failed to upgrade subscription:', error);
    }
  };

  const getMethodName = (method: string | null) => {
    switch (method) {
      case 'vnpay': return 'VNPay';
      case 'momo': return 'MoMo';
      case 'zalopay': return 'ZaloPay';
      case 'bank_transfer': return 'Chuyển khoản ngân hàng';
      default: return 'Không xác định';
    }
  };

  const getPlanName = (plan: string | null) => {
    switch (plan) {
      case 'basic': return 'Gói Cơ Bản';
      case 'pro': return 'Gói Chuyên Nghiệp';
      case 'enterprise': return 'Gói Doanh Nghiệp';
      default: return 'Không xác định';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            {status === 'processing' && (
              <Loader2 className="h-16 w-16 text-blue-500 animate-spin" />
            )}
            {status === 'success' && (
              <CheckCircle2 className="h-16 w-16 text-green-500" />
            )}
            {status === 'failed' && (
              <XCircle className="h-16 w-16 text-red-500" />
            )}
          </div>
          <CardTitle className="text-2xl">
            {status === 'processing' && 'Đang xử lý thanh toán...'}
            {status === 'success' && 'Thanh toán thành công!'}
            {status === 'failed' && 'Thanh toán thất bại'}
          </CardTitle>
          <CardDescription>
            {status === 'processing' && 'Vui lòng đợi trong giây lát'}
            {status === 'success' && `Chuyển hướng trong ${countdown}s...`}
            {status === 'failed' && 'Giao dịch không thành công'}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Payment Details */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Chi tiết thanh toán</span>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Gói dịch vụ:</span>
                <span className="font-semibold">{getPlanName(plan)}</span>
              </div>
              <div className="flex justify-between">
                <span>Phương thức:</span>
                <span className="font-semibold">{getMethodName(method)}</span>
              </div>
              <div className="flex justify-between">
                <span>Số tiền:</span>
                <span className="font-semibold text-primary">
                  {formatCurrency(Number(amount) || 0)}
                </span>
              </div>
            </div>
          </div>

          {/* Success Message */}
          {status === 'success' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-800">
              <p className="font-semibold mb-1">🎉 Chúc mừng!</p>
              <p>Gói dịch vụ của bạn đã được nâng cấp thành công. Bạn có thể bắt đầu sử dụng các tính năng mới ngay bây giờ.</p>
            </div>
          )}

          {/* Failed Message */}
          {status === 'failed' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800">
              <p className="font-semibold mb-1">❌ Giao dịch thất bại</p>
              <p>Thanh toán không thành công. Vui lòng thử lại hoặc liên hệ hỗ trợ nếu vấn đề vẫn tiếp diễn.</p>
            </div>
          )}

          {/* Action Buttons */}
          {status === 'success' && (
            <Button 
              className="w-full" 
              onClick={() => router.push('/subscription')}
            >
              Quay lại trang gói dịch vụ
            </Button>
          )}
          
          {status === 'failed' && (
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => router.push('/subscription')}
              >
                Quay lại
              </Button>
              <Button 
                className="flex-1"
                onClick={() => window.location.reload()}
              >
                Thử lại
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function PaymentDemoPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    }>
      <PaymentDemoContent />
    </Suspense>
  );
}
