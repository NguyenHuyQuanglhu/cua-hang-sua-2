'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Store, Zap, Crown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/api-client';
import { PaymentDialog } from './components/payment-dialog';

interface SubscriptionPlan {
  id: string;
  name: string;
  maxStores: number;
  price: number;
  features: string[];
  icon: React.ReactNode;
  popular?: boolean;
}

  const plans: SubscriptionPlan[] = [
  {
    id: 'basic',
    name: 'Gói Cơ Bản',
    maxStores: 1,
    price: 199000,
    icon: <Store className="h-6 w-6" />,
    features: [
      '1 cửa hàng',
      'Quản lý sản phẩm không giới hạn',
      'Quản lý bán hàng cơ bản',
      'Báo cáo doanh thu',
      'Quản lý tồn kho',
      'Hỗ trợ qua email',
    ],
  },
  {
    id: 'pro',
    name: 'Gói Chuyên Nghiệp',
    maxStores: 5,
    price: 499000,
    icon: <Zap className="h-6 w-6" />,
    popular: true,
    features: [
      'Tối đa 5 cửa hàng',
      'Tất cả tính năng Gói Cơ Bản',
      'Báo cáo nâng cao (lợi nhuận, công nợ)',
      'Phân tích xu hướng bán hàng',
      'Quản lý nhân viên & phân quyền',
      'Xuất dữ liệu Excel',
      'Hỗ trợ ưu tiên',
    ],
  },
  {
    id: 'enterprise',
    name: 'Gói Doanh Nghiệp',
    maxStores: 999,
    price: 1999000,
    icon: <Crown className="h-6 w-6" />,
    features: [
      'Không giới hạn cửa hàng',
      'Tất cả tính năng Gói Chuyên Nghiệp',
      'Báo cáo tùy chỉnh theo yêu cầu',
      'Phân tích AI & dự đoán doanh thu',
      'Tích hợp API với hệ thống khác',
      'Hỗ trợ 24/7 qua điện thoại',
      'Đào tạo nhân viên miễn phí',
      'Tư vấn vận hành',
    ],
  },
];

export default function SubscriptionPage() {
  const { toast } = useToast();
  const [currentPlan, setCurrentPlan] = useState<{
    maxStores: number;
    currentStores: number;
    planId: string;
    startDate: string | null;
    endDate: string | null;
    daysRemaining: number | null;
    isExpired: boolean;
    autoRenewal: boolean;
    status: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [togglingAutoRenewal, setTogglingAutoRenewal] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);

  useEffect(() => {
    fetchCurrentPlan();
  }, []);

  const fetchCurrentPlan = async () => {
    try {
      const response = await apiClient.request<{
        maxStores: number;
        currentStores: number;
        planId: string;
        startDate: string | null;
        endDate: string | null;
        daysRemaining: number | null;
        isExpired: boolean;
        autoRenewal: boolean;
        status: string;
      }>('/subscription/current');
      console.log('[Subscription] Current plan data:', response);
      setCurrentPlan(response);
    } catch (error) {
      console.error('Fetch current plan error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAutoRenewal = async () => {
    if (!currentPlan) {
      toast({
        title: 'Lỗi',
        description: 'Không tìm thấy thông tin gói dịch vụ',
        variant: 'destructive',
      });
      return;
    }

    // Check if basic plan (support both 'basic' and null/undefined)
    const isBasicPlan = !currentPlan.planId || currentPlan.planId === 'basic';
    
    if (isBasicPlan) {
      toast({
        title: 'Không khả dụng',
        description: 'Tính năng tự động gia hạn chỉ dành cho gói Standard và Premium',
        variant: 'destructive',
      });
      return;
    }
    
    if (currentPlan.status === 'cancelled') {
      toast({
        title: 'Không thể thay đổi',
        description: 'Gói dịch vụ đã bị hủy. Vui lòng nâng cấp gói mới.',
        variant: 'destructive',
      });
      return;
    }
    
    setTogglingAutoRenewal(true);
    
    try {
      const newValue = !currentPlan.autoRenewal;
      
      console.log('[Auto-Renewal] Current plan:', currentPlan.planId);
      console.log('[Auto-Renewal] Toggling to:', newValue);
      
      const response = await apiClient.request('/subscription/toggle-auto-renewal', {
        method: 'POST',
        body: { autoRenewal: newValue }
      });
      
      console.log('[Auto-Renewal] Response:', response);
      
      toast({
        title: newValue ? 'Đã bật tự động gia hạn' : 'Đã tắt tự động gia hạn',
        description: newValue 
          ? 'Gói dịch vụ sẽ tự động gia hạn khi hết hạn'
          : 'Gói dịch vụ sẽ không tự động gia hạn',
      });
      
      // Refresh plan data
      await fetchCurrentPlan();
    } catch (error: any) {
      console.error('Toggle auto-renewal error:', error);
      
      toast({
        title: 'Lỗi',
        description: error.message || 'Không thể thay đổi cài đặt tự động gia hạn',
        variant: 'destructive',
      });
    } finally {
      setTogglingAutoRenewal(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!currentPlan || currentPlan.planId === 'basic') return;
    
    if (!confirm('Bạn có chắc muốn hủy gói dịch vụ? Gói sẽ hết hạn vào ngày đã thanh toán và không tự động gia hạn.')) {
      return;
    }
    
    try {
      await apiClient.request('/subscription/cancel', {
        method: 'POST',
      });
      
      toast({
        title: 'Đã hủy gói dịch vụ',
        description: 'Gói dịch vụ sẽ hết hạn vào ngày đã thanh toán',
      });
      
      await fetchCurrentPlan();
    } catch (error: any) {
      toast({
        title: 'Lỗi',
        description: error.message || 'Không thể hủy gói dịch vụ',
        variant: 'destructive',
      });
    }
  };

  const handleUpgrade = async (planId: string, maxStores: number) => {
    const plan = plans.find(p => p.id === planId);
    if (!plan) return;
    
    // Open payment dialog
    setSelectedPlan(plan);
    setPaymentDialogOpen(true);
  };

  const handlePaymentConfirm = async (paymentMethod: string) => {
    if (!selectedPlan) return;
    
    setUpgrading(selectedPlan.id);
    try {
      // Call upgrade API with payment method
      const response = await apiClient.request<{ paymentUrl?: string }>('/subscription/upgrade', { 
        method: 'POST',
        body: { 
          planId: selectedPlan.id,
          maxStores: selectedPlan.maxStores,
          paymentMethod,
        }
      });
      
      // If payment gateway returns URL, redirect to it
      if (response.paymentUrl) {
        window.location.href = response.paymentUrl;
        return;
      }
      
      // Otherwise show success message
      toast({
        title: 'Nâng cấp thành công!',
        description: `Bạn đã nâng cấp lên ${selectedPlan.name}`,
      });
      
      setPaymentDialogOpen(false);
      await fetchCurrentPlan();
    } catch (error: any) {
      toast({
        title: 'Lỗi thanh toán',
        description: error.message || 'Không thể xử lý thanh toán. Vui lòng thử lại.',
        variant: 'destructive',
      });
    } finally {
      setUpgrading(null);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Đang tải...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <PaymentDialog
        isOpen={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        planName={selectedPlan?.name || ''}
        planPrice={selectedPlan?.price || 0}
        maxStores={selectedPlan?.maxStores || 0}
        onConfirm={handlePaymentConfirm}
      />
      
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Quản Lý Gói Dịch Vụ</h1>
        <p className="text-muted-foreground">
          Nâng cấp gói để tạo thêm cửa hàng và mở khóa nhiều tính năng hơn
        </p>
      </div>

      {currentPlan && (
        <>
          <Card className="mb-8 border-primary bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="h-5 w-5" />
                Gói Hiện Tại
              </CardTitle>
              <CardDescription>
                Bạn đang sử dụng <strong>{currentPlan.currentStores}</strong> / <strong>{currentPlan.maxStores}</strong> cửa hàng
                {currentPlan.currentStores >= currentPlan.maxStores && (
                  <span className="text-destructive ml-2">
                    (Đã đạt giới hạn - Vui lòng nâng cấp để tạo thêm cửa hàng)
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="h-3 bg-secondary rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        currentPlan.currentStores >= currentPlan.maxStores
                          ? 'bg-destructive'
                          : 'bg-primary'
                      }`}
                      style={{
                        width: `${Math.min((currentPlan.currentStores / currentPlan.maxStores) * 100, 100)}%`,
                      }}
                    />
                  </div>
                </div>
                <div className="text-sm font-medium">
                  {currentPlan.currentStores} / {currentPlan.maxStores}
                </div>
              </div>
              {currentPlan.maxStores - currentPlan.currentStores > 0 && (
                <p className="text-sm text-muted-foreground mt-3">
                  Bạn còn có thể tạo thêm <strong>{currentPlan.maxStores - currentPlan.currentStores}</strong> cửa hàng nữa
                </p>
              )}
            </CardContent>
          </Card>

          {/* Subscription Status Card */}
          {currentPlan.endDate && (
            <Card className={`mb-8 ${currentPlan.isExpired ? 'border-destructive' : currentPlan.daysRemaining && currentPlan.daysRemaining <= 7 ? 'border-yellow-500' : ''}`}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    {currentPlan.isExpired ? '⚠️' : currentPlan.daysRemaining && currentPlan.daysRemaining <= 7 ? '⏰' : '✅'} 
                    Trạng thái gói dịch vụ
                  </span>
                  <Badge variant={currentPlan.status === 'active' ? 'default' : currentPlan.status === 'expired' ? 'destructive' : 'secondary'}>
                    {currentPlan.status === 'active' ? 'Đang hoạt động' : currentPlan.status === 'expired' ? 'Hết hạn' : 'Đã hủy'}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Ngày bắt đầu</div>
                    <div className="font-semibold">
                      {currentPlan.startDate ? new Date(currentPlan.startDate).toLocaleDateString('vi-VN') : 'N/A'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Ngày hết hạn</div>
                    <div className="font-semibold">
                      {new Date(currentPlan.endDate).toLocaleDateString('vi-VN')}
                    </div>
                  </div>
                </div>

                {currentPlan.daysRemaining !== null && (
                  <div className={`p-3 rounded-lg ${
                    currentPlan.isExpired 
                      ? 'bg-destructive/10 text-destructive' 
                      : currentPlan.daysRemaining <= 7 
                        ? 'bg-yellow-50 text-yellow-800'
                        : 'bg-green-50 text-green-800'
                  }`}>
                    <div className="font-semibold">
                      {currentPlan.isExpired 
                        ? `Đã hết hạn ${Math.abs(currentPlan.daysRemaining)} ngày trước`
                        : `Còn ${currentPlan.daysRemaining} ngày`
                      }
                    </div>
                    {currentPlan.isExpired && (
                      <div className="text-sm mt-1">
                        Vui lòng gia hạn để tiếp tục sử dụng dịch vụ
                      </div>
                    )}
                  </div>
                )}

                {/* Show upgrade message for basic plan ONLY */}
                {(!currentPlan.planId || currentPlan.planId === 'basic') && (
                  <div className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border-2 border-yellow-400">
                    <div className="flex items-start gap-3">
                      <span className="text-3xl">🔒</span>
                      <div className="flex-1">
                        <div className="font-bold text-lg mb-2 text-yellow-900">Tính năng Tự động gia hạn</div>
                        <div className="text-sm text-yellow-800 mb-3">
                          Tính năng này chỉ khả dụng cho <span className="font-semibold">Gói Chuyên Nghiệp</span> và <span className="font-semibold">Gói Doanh Nghiệp</span>.
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => {
                              const proCard = document.getElementById('plan-pro');
                              proCard?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }}
                            className="bg-yellow-600 hover:bg-yellow-700"
                          >
                            <Zap className="h-4 w-4 mr-1" />
                            Xem gói Chuyên Nghiệp
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Show auto-renewal toggle for ALL non-basic plans */}
                {currentPlan.planId && currentPlan.planId !== 'basic' && (
                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border">
                    <div className="flex-1">
                      <div className="font-semibold mb-1">Tự động gia hạn</div>
                      <div className="text-sm text-muted-foreground">
                        {currentPlan.autoRenewal 
                          ? 'Gói sẽ tự động gia hạn khi hết hạn'
                          : 'Bấm nút bên phải để bật tự động gia hạn'
                        }
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleToggleAutoRenewal}
                      disabled={currentPlan.status === 'cancelled' || togglingAutoRenewal}
                      className={`min-w-[140px] h-11 px-6 rounded-md font-semibold text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${
                        currentPlan.autoRenewal 
                          ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
                          : 'border border-input bg-background hover:bg-accent hover:text-accent-foreground'
                      }`}
                    >
                      {togglingAutoRenewal ? (
                        <>
                          <span className="animate-spin mr-2">⏳</span>
                          Đang xử lý...
                        </>
                      ) : currentPlan.autoRenewal ? (
                        <>
                          <span className="mr-2">✓</span>
                          Đang bật
                        </>
                      ) : (
                        <>
                          <span className="mr-2">○</span>
                          Bật ngay
                        </>
                      )}
                    </button>
                  </div>
                )}

                {currentPlan.planId !== 'basic' && currentPlan.status === 'active' && (
                  <Button
                    variant="destructive"
                    size="sm"
                    className="w-full"
                    onClick={handleCancelSubscription}
                  >
                    Hủy gói dịch vụ
                  </Button>
                )}
                
                {currentPlan.planId === 'basic' && (
                  <div className="text-sm text-muted-foreground text-center p-2 bg-muted/50 rounded">
                    💡 Gói Cơ Bản không thể hủy. Vui lòng nâng cấp hoặc liên hệ hỗ trợ.
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}

      <div className="grid md:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const isCurrentPlan = currentPlan?.planId === plan.id;
          
          // Determine if user can upgrade to this plan
          // Can upgrade if:
          // 1. Plan has more stores than current plan (higher tier)
          // 2. Current plan is expired
          // 3. Current plan is cancelled
          const canUpgrade = currentPlan && (
            currentPlan.maxStores < plan.maxStores || 
            currentPlan.isExpired ||
            currentPlan.status === 'cancelled'
          );
          
          // Check if this is a lower tier plan (should hide upgrade button)
          const isLowerTier = currentPlan && currentPlan.maxStores > plan.maxStores;

          return (
            <Card
              key={plan.id}
              id={`plan-${plan.id}`}
              className={`relative ${
                plan.popular ? 'border-primary shadow-lg' : ''
              } ${isCurrentPlan ? 'border-green-500' : ''}`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary">Phổ biến nhất</Badge>
                </div>
              )}
              {isCurrentPlan && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-green-500">Gói hiện tại</Badge>
                </div>
              )}

              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-primary/10 rounded-lg text-primary">
                    {plan.icon}
                  </div>
                  <CardTitle>{plan.name}</CardTitle>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold">
                    {plan.price.toLocaleString('vi-VN')}
                  </span>
                  <span className="text-muted-foreground">đ/tháng</span>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* Only show button if not a lower tier plan */}
                {!isLowerTier && (
                  <Button
                    className="w-full"
                    variant={plan.popular ? 'default' : 'outline'}
                    disabled={isCurrentPlan || !canUpgrade || upgrading !== null}
                    onClick={() => handleUpgrade(plan.id, plan.maxStores)}
                  >
                    {upgrading === plan.id ? (
                      'Đang xử lý...'
                    ) : isCurrentPlan ? (
                      'Gói hiện tại'
                    ) : canUpgrade ? (
                      'Nâng cấp ngay'
                    ) : (
                      'Không khả dụng'
                    )}
                  </Button>
                )}
                
                {/* Show message for lower tier plans */}
                {isLowerTier && !isCurrentPlan && (
                  <div className="text-sm text-muted-foreground text-center p-3 bg-muted/50 rounded">
                    Bạn đang sử dụng gói cao hơn
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-8 p-6 bg-muted rounded-lg">
        <h3 className="font-semibold mb-3 text-lg">📋 Lưu ý quan trọng:</h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <span className="text-primary">•</span>
            <span>Giá trên là giá theo tháng, thanh toán hàng tháng (đã bao gồm VAT 10%)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">•</span>
            <span><strong>Gói Cơ Bản (199.000đ/tháng)</strong>: Dành cho 1 cửa hàng, phù hợp cho cửa hàng nhỏ mới bắt đầu</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">•</span>
            <span><strong>Gói Chuyên Nghiệp (499.000đ/tháng)</strong>: Dành cho tối đa 5 cửa hàng, phù hợp cho chuỗi cửa hàng vừa và nhỏ</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">•</span>
            <span><strong>Gói Doanh Nghiệp (1.999.000đ/tháng)</strong>: Không giới hạn cửa hàng, phù hợp cho doanh nghiệp lớn</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">•</span>
            <span>Bạn có thể nâng cấp gói bất kỳ lúc nào. Phí sẽ được tính theo tỷ lệ thời gian sử dụng</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">•</span>
            <span>Dữ liệu của bạn sẽ được bảo toàn 100% khi thay đổi gói</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">•</span>
            <span>Gói dịch vụ tự động gia hạn hàng tháng. Bạn có thể tắt tự động gia hạn bất kỳ lúc nào</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">•</span>
            <span>Khi đạt giới hạn số cửa hàng, bạn cần nâng cấp gói để tạo thêm cửa hàng mới</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">•</span>
            <span>Liên hệ hỗ trợ: <strong>support@smartinventory.vn</strong> hoặc <strong>1900-xxxx</strong> nếu cần tư vấn</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
