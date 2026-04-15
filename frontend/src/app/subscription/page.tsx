'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Check, Store, Zap, Crown, Plus, Edit, Trash2, History, MoreHorizontal } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/api-client';
import { PaymentDialog } from './components/payment-dialog';
import { useStore } from '@/contexts/store-context';
import { formatCurrency } from '@/lib/utils';

interface SubscriptionPlan {
  id: string;
  name: string;
  description?: string | null;
  maxStores: number;
  price: number;
  features: string[];
  isActive?: boolean;
  sortOrder?: number;
  popular?: boolean;
}

interface PlanFormState {
  id: string;
  name: string;
  description: string;
  maxStores: string;
  price: string;
  featuresText: string;
  sortOrder: string;
  isActive: boolean;
}

interface PurchaseHistoryItem {
  id: string;
  planId: string;
  planName: string;
  amount: number;
  paymentMethod: string;
  paymentStatus: string;
  startDate: string | null;
  endDate: string | null;
  createdAt: string | null;
}

const fallbackPlans: SubscriptionPlan[] = [
  {
    id: 'basic',
    name: 'Gói Cơ Bản',
    description: 'Phù hợp cửa hàng nhỏ mới bắt đầu',
    maxStores: 1,
    price: 199000,
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
    description: 'Phù hợp chuỗi cửa hàng vừa và nhỏ',
    maxStores: 5,
    price: 499000,
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
    description: 'Phù hợp doanh nghiệp lớn, nhiều chi nhánh',
    maxStores: 999,
    price: 1999000,
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

const emptyPlanForm: PlanFormState = {
  id: '',
  name: '',
  description: '',
  maxStores: '',
  price: '',
  featuresText: '',
  sortOrder: '0',
  isActive: true,
};

const getPlanIcon = (planId: string) => {
  if (planId === 'basic') return <Store className="h-6 w-6" />;
  if (planId === 'pro') return <Zap className="h-6 w-6" />;
  if (planId === 'enterprise') return <Crown className="h-6 w-6" />;
  return <Store className="h-6 w-6" />;
};

const getStatusBadgeVariant = (status: string) => {
  if (status === 'completed') return 'default';
  if (status === 'pending') return 'secondary';
  return 'destructive';
};

export default function SubscriptionPage() {
  const { toast } = useToast();
  const { user } = useStore();
  const canManagePlans = user?.role === 'owner' || user?.role === 'admin' || user?.role === 'company_manager';

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
  const [plans, setPlans] = useState<SubscriptionPlan[]>(fallbackPlans);
  const [history, setHistory] = useState<PurchaseHistoryItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [plansLoading, setPlansLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [togglingAutoRenewal, setTogglingAutoRenewal] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);

  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [planForm, setPlanForm] = useState<PlanFormState>(emptyPlanForm);
  const [savingPlan, setSavingPlan] = useState(false);
  const [deletingPlanId, setDeletingPlanId] = useState<string | null>(null);

  useEffect(() => {
    fetchCurrentPlan().finally(() => setLoading(false));
    fetchPlans();
    fetchHistory();
  }, [canManagePlans]);

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
    }
  };

  const fetchPlans = async () => {
    setPlansLoading(true);
    try {
      const response = await apiClient.request<{ plans: SubscriptionPlan[] }>(
        `/subscription/plans${canManagePlans ? '?includeInactive=true' : ''}`
      );
      const mappedPlans = (response.plans || []).map((plan) => ({
        ...plan,
        popular: plan.id === 'pro',
      }));
      setPlans(mappedPlans.length > 0 ? mappedPlans : fallbackPlans);
    } catch (error) {
      console.error('Fetch subscription plans error:', error);
      setPlans(fallbackPlans);
    } finally {
      setPlansLoading(false);
    }
  };

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const response = await apiClient.request<{ history: PurchaseHistoryItem[] }>('/subscription/history?limit=20');
      setHistory(response.history || []);
    } catch (error) {
      console.error('Fetch subscription history error:', error);
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const openCreatePlanDialog = () => {
    setEditingPlan(null);
    setPlanForm(emptyPlanForm);
    setPlanDialogOpen(true);
  };

  const openEditPlanDialog = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setPlanForm({
      id: plan.id,
      name: plan.name,
      description: plan.description || '',
      maxStores: String(plan.maxStores),
      price: String(plan.price),
      featuresText: (plan.features || []).join('\n'),
      sortOrder: String(plan.sortOrder ?? 0),
      isActive: plan.isActive !== false,
    });
    setPlanDialogOpen(true);
  };

  const handleSavePlan = async () => {
    const maxStores = Number(planForm.maxStores);
    const price = Number(planForm.price);
    const sortOrder = Number(planForm.sortOrder || '0');
    const features = planForm.featuresText
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean);

    if (!planForm.name.trim()) {
      toast({ title: 'Thiếu dữ liệu', description: 'Tên gói dịch vụ là bắt buộc', variant: 'destructive' });
      return;
    }

    if (!Number.isFinite(maxStores) || maxStores <= 0) {
      toast({ title: 'Dữ liệu không hợp lệ', description: 'Số cửa hàng tối đa phải lớn hơn 0', variant: 'destructive' });
      return;
    }

    if (!Number.isFinite(price) || price < 0) {
      toast({ title: 'Dữ liệu không hợp lệ', description: 'Giá gói phải lớn hơn hoặc bằng 0', variant: 'destructive' });
      return;
    }

    setSavingPlan(true);
    try {
      const payload = {
        id: planForm.id.trim() || undefined,
        name: planForm.name.trim(),
        description: planForm.description.trim() || null,
        maxStores,
        price,
        features,
        sortOrder,
        isActive: planForm.isActive,
      };

      if (editingPlan) {
        await apiClient.request(`/subscription/plans/${editingPlan.id}`, {
          method: 'PUT',
          body: payload,
        });
        toast({ title: 'Đã cập nhật', description: 'Đã cập nhật gói dịch vụ thành công' });
      } else {
        await apiClient.request('/subscription/plans', {
          method: 'POST',
          body: payload,
        });
        toast({ title: 'Đã tạo gói mới', description: 'Đã thêm gói dịch vụ mới thành công' });
      }

      setPlanDialogOpen(false);
      await fetchPlans();
    } catch (error: any) {
      toast({
        title: 'Lỗi lưu gói',
        description: error.message || 'Không thể lưu gói dịch vụ',
        variant: 'destructive',
      });
    } finally {
      setSavingPlan(false);
    }
  };

  const handleDeletePlan = async (plan: SubscriptionPlan) => {
    if (!confirm(`Bạn có chắc muốn xóa gói ${plan.name}?`)) {
      return;
    }

    setDeletingPlanId(plan.id);
    try {
      await apiClient.request(`/subscription/plans/${plan.id}`, {
        method: 'DELETE',
      });
      toast({ title: 'Đã xóa gói', description: `Đã xóa gói ${plan.name}` });
      await fetchPlans();
    } catch (error: any) {
      toast({
        title: 'Không thể xóa gói',
        description: error.message || 'Gói đang được sử dụng hoặc đã phát sinh lỗi hệ thống',
        variant: 'destructive',
      });
    } finally {
      setDeletingPlanId(null);
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
      await fetchHistory();
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

  const visiblePlans = plans.filter((plan) => plan.isActive !== false);

  return (
    <div className="container mx-auto p-6">
      <Dialog open={planDialogOpen} onOpenChange={setPlanDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingPlan ? 'Cập nhật gói dịch vụ' : 'Thêm gói dịch vụ mới'}</DialogTitle>
            <DialogDescription>
              {editingPlan
                ? 'Chỉnh sửa thông tin gói dịch vụ hiện có.'
                : 'Tạo gói dịch vụ mới để người dùng có thể mua.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid md:grid-cols-2 gap-4">
            {!editingPlan && (
              <div className="space-y-2">
                <Label htmlFor="plan-id">Mã gói (không bắt buộc)</Label>
                <Input
                  id="plan-id"
                  placeholder="vd: starter"
                  value={planForm.id}
                  onChange={(e) => setPlanForm((prev) => ({ ...prev, id: e.target.value }))}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="plan-name">Tên gói</Label>
              <Input
                id="plan-name"
                value={planForm.name}
                onChange={(e) => setPlanForm((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="plan-max-stores">Số cửa hàng tối đa</Label>
              <Input
                id="plan-max-stores"
                type="number"
                min={1}
                value={planForm.maxStores}
                onChange={(e) => setPlanForm((prev) => ({ ...prev, maxStores: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="plan-price">Giá/tháng (VNĐ)</Label>
              <Input
                id="plan-price"
                type="number"
                min={0}
                value={planForm.price}
                onChange={(e) => setPlanForm((prev) => ({ ...prev, price: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="plan-sort-order">Thứ tự hiển thị</Label>
              <Input
                id="plan-sort-order"
                type="number"
                value={planForm.sortOrder}
                onChange={(e) => setPlanForm((prev) => ({ ...prev, sortOrder: e.target.value }))}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="plan-description">Mô tả</Label>
              <Input
                id="plan-description"
                value={planForm.description}
                onChange={(e) => setPlanForm((prev) => ({ ...prev, description: e.target.value }))}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="plan-features">Tính năng (mỗi dòng 1 tính năng)</Label>
              <Textarea
                id="plan-features"
                rows={6}
                value={planForm.featuresText}
                onChange={(e) => setPlanForm((prev) => ({ ...prev, featuresText: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3 text-sm">
            <span>Trạng thái gói</span>
            <Button
              type="button"
              variant={planForm.isActive ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPlanForm((prev) => ({ ...prev, isActive: !prev.isActive }))}
            >
              {planForm.isActive ? 'Đang hoạt động' : 'Đã tắt'}
            </Button>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPlanDialogOpen(false)} disabled={savingPlan}>
              Hủy
            </Button>
            <Button onClick={handleSavePlan} disabled={savingPlan}>
              {savingPlan ? 'Đang lưu...' : editingPlan ? 'Cập nhật' : 'Tạo gói'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PaymentDialog
        isOpen={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        planName={selectedPlan?.name || ''}
        planPrice={selectedPlan?.price || 0}
        maxStores={selectedPlan?.maxStores || 0}
        onConfirm={handlePaymentConfirm}
      />
      
      <div className="mb-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Quản Lý Gói Dịch Vụ</h1>
            <p className="text-muted-foreground">
              Nâng cấp gói để tạo thêm cửa hàng và mở khóa nhiều tính năng hơn
            </p>
          </div>
          {canManagePlans && (
            <Button onClick={openCreatePlanDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Thêm gói
            </Button>
          )}
        </div>
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
        {visiblePlans.map((plan) => {
          const isCurrentPlan = currentPlan?.planId === plan.id;
          const isPlanExpiredOrCancelled = Boolean(currentPlan?.isExpired || currentPlan?.status === 'cancelled');
          const isLowerTier = Boolean(currentPlan && currentPlan.maxStores > plan.maxStores);
          const canPurchasePlan = Boolean(currentPlan) && (!isCurrentPlan || isPlanExpiredOrCancelled);

          return (
            <Card
              key={plan.id}
              id={`plan-${plan.id}`}
              className={`relative ${
                plan.popular ? 'border-primary shadow-lg' : ''
              } ${isCurrentPlan ? 'border-green-500' : ''} flex h-full flex-col`}
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
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                      {getPlanIcon(plan.id)}
                    </div>
                    <CardTitle className="whitespace-nowrap">{plan.name}</CardTitle>
                  </div>
                  {canManagePlans && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="icon" className="h-9 w-9">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Tùy chọn gói</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditPlanDialog(plan)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Sửa
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDeletePlan(plan)}
                          disabled={deletingPlanId === plan.id}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          {deletingPlanId === plan.id ? 'Đang xóa...' : 'Xóa'}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold">
                    {plan.price.toLocaleString('vi-VN')}
                  </span>
                  <span className="text-muted-foreground">đ/tháng</span>
                </div>
              </CardHeader>

              <CardContent className="flex flex-1 flex-col gap-4">
                <ul className="space-y-2 flex-1">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                {isLowerTier && !isCurrentPlan ? (
                  <div className="text-sm text-muted-foreground text-center p-3 bg-muted/50 rounded mt-auto">
                    Bạn đang sử dụng gói cao hơn
                  </div>
                ) : (
                  <Button
                    className="w-full h-11 mt-auto"
                    variant={canPurchasePlan ? 'default' : 'secondary'}
                    disabled={!canPurchasePlan || upgrading !== null}
                    onClick={() => handleUpgrade(plan.id, plan.maxStores)}
                  >
                    {upgrading === plan.id ? (
                      'Đang xử lý...'
                    ) : isCurrentPlan && isPlanExpiredOrCancelled ? (
                      'Mua lại gói này'
                    ) : isCurrentPlan ? (
                      'Gói hiện tại'
                    ) : (
                      'Mua gói này'
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Lịch sử mua gói dịch vụ
          </CardTitle>
          <CardDescription>Lưu lại toàn bộ giao dịch mua/gia hạn gói dịch vụ của tài khoản.</CardDescription>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="text-sm text-muted-foreground">Đang tải lịch sử mua...</div>
          ) : history.length === 0 ? (
            <div className="text-sm text-muted-foreground">Chưa có giao dịch mua gói dịch vụ.</div>
          ) : (
            <div className="space-y-3">
              {history.map((item) => (
                <div key={item.id} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="font-semibold">{item.planName}</div>
                      <div className="text-sm text-muted-foreground">
                        {item.createdAt ? new Date(item.createdAt).toLocaleString('vi-VN') : 'N/A'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{formatCurrency(item.amount)}</div>
                      <Badge variant={getStatusBadgeVariant(item.paymentStatus)}>{item.paymentStatus}</Badge>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground mt-2">
                    Thanh toán: {item.paymentMethod} | Thời hạn:{' '}
                    {item.startDate ? new Date(item.startDate).toLocaleDateString('vi-VN') : 'N/A'} -{' '}
                    {item.endDate ? new Date(item.endDate).toLocaleDateString('vi-VN') : 'N/A'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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
