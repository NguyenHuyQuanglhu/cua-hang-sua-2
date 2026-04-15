'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Loader2,
  Building2,
  User,
  Store,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import Link from 'next/link';

// Registration steps
type Step = 'business' | 'owner' | 'store' | 'provisioning' | 'complete';

// Form data interface
interface RegistrationData {
  // Business info
  businessName: string;
  businessEmail: string;
  businessPhone: string;
  subscriptionPlan: 'basic' | 'standard' | 'premium';
  // Owner info
  ownerName: string;
  ownerEmail: string;
  ownerPassword: string;
  ownerPasswordConfirm: string;
  // Store info
  defaultStoreName: string;
}

// Provisioning status type
type ProvisioningStatus = 'pending' | 'creating_database' | 'running_migrations' | 'creating_owner' | 'creating_default_store' | 'completed' | 'failed';

// Step indicator component
function StepIndicator({ currentStep, steps }: { currentStep: Step; steps: { key: Step; label: string; icon: React.ReactNode }[] }) {
  const currentIndex = steps.findIndex(s => s.key === currentStep);
  
  return (
    <div className="flex items-center justify-center mb-8">
      {steps.map((step, index) => (
        <div key={step.key} className="flex items-center">
          <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors ${
            index < currentIndex 
              ? 'bg-primary border-primary text-primary-foreground' 
              : index === currentIndex 
                ? 'border-primary text-primary' 
                : 'border-muted text-muted-foreground'
          }`}>
            {index < currentIndex ? (
              <CheckCircle2 className="h-5 w-5" />
            ) : (
              step.icon
            )}
          </div>
          {index < steps.length - 1 && (
            <div className={`w-12 h-0.5 mx-2 transition-colors ${
              index < currentIndex ? 'bg-primary' : 'bg-muted'
            }`} />
          )}
        </div>
      ))}
    </div>
  );
}


// Provisioning progress component
function ProvisioningProgress({ 
  status, 
  progress, 
  message, 
  error 
}: { 
  status: ProvisioningStatus; 
  progress: number; 
  message: string; 
  error?: string;
}) {
  const statusLabels: Record<ProvisioningStatus, string> = {
    pending: 'Đang chờ...',
    creating_database: 'Đang tạo database...',
    running_migrations: 'Đang tạo cấu trúc dữ liệu...',
    creating_owner: 'Đang tạo tài khoản chủ sở hữu...',
    creating_default_store: 'Đang tạo cửa hàng mặc định...',
    completed: 'Hoàn tất!',
    failed: 'Thất bại',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center">
        {status === 'failed' ? (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
        ) : status === 'completed' ? (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
      </div>
      
      <div className="text-center">
        <p className="text-lg font-medium">{statusLabels[status]}</p>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>

      {status !== 'failed' && status !== 'completed' && (
        <Progress value={progress} className="h-2" />
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>('business');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [provisioningStatus, setProvisioningStatus] = useState<{
    status: ProvisioningStatus;
    progress: number;
    message: string;
    error?: string;
  } | null>(null);

  const [formData, setFormData] = useState<RegistrationData>({
    businessName: '',
    businessEmail: '',
    businessPhone: '',
    subscriptionPlan: 'basic',
    ownerName: '',
    ownerEmail: '',
    ownerPassword: '',
    ownerPasswordConfirm: '',
    defaultStoreName: '',
  });

  const steps: { key: Step; label: string; icon: React.ReactNode }[] = [
    { key: 'business', label: 'Doanh nghiệp', icon: <Building2 className="h-5 w-5" /> },
    { key: 'owner', label: 'Chủ sở hữu', icon: <User className="h-5 w-5" /> },
    { key: 'store', label: 'Cửa hàng', icon: <Store className="h-5 w-5" /> },
  ];

  const updateFormData = (field: keyof RegistrationData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };


  // Poll provisioning status
  const pollProvisioningStatus = useCallback(async (id: string) => {
    try {
      const status = await apiClient.getRegistrationStatus(id);
      setProvisioningStatus(status);

      if (status.status === 'completed') {
        setCurrentStep('complete');
      } else if (status.status === 'failed') {
        setError(status.error || 'Đăng ký thất bại');
      } else {
        // Continue polling
        setTimeout(() => pollProvisioningStatus(id), 1000);
      }
    } catch (err) {
      console.error('Error polling status:', err);
      setError('Không thể kiểm tra trạng thái đăng ký');
    }
  }, []);

  // Start polling when tenantId is set
  useEffect(() => {
    if (tenantId && currentStep === 'provisioning') {
      pollProvisioningStatus(tenantId);
    }
  }, [tenantId, currentStep, pollProvisioningStatus]);

  const validateBusinessStep = async (): Promise<boolean> => {
    if (!formData.businessName.trim()) {
      setError('Vui lòng nhập tên doanh nghiệp');
      return false;
    }
    if (!formData.businessEmail.trim()) {
      setError('Vui lòng nhập email doanh nghiệp');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.businessEmail)) {
      setError('Email không hợp lệ');
      return false;
    }

    // Check if email is available
    try {
      const result = await apiClient.checkBusinessEmail(formData.businessEmail);
      if (!result.available) {
        setError('Email đã được sử dụng');
        return false;
      }
    } catch {
      setError('Không thể kiểm tra email');
      return false;
    }

    return true;
  };

  const validateOwnerStep = async (): Promise<boolean> => {
    if (!formData.ownerName.trim()) {
      setError('Vui lòng nhập tên chủ sở hữu');
      return false;
    }
    if (!formData.ownerEmail.trim()) {
      setError('Vui lòng nhập email chủ sở hữu');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.ownerEmail)) {
      setError('Email không hợp lệ');
      return false;
    }
    if (formData.ownerPassword.length < 8) {
      setError('Mật khẩu phải có ít nhất 8 ký tự');
      return false;
    }
    if (formData.ownerPassword !== formData.ownerPasswordConfirm) {
      setError('Mật khẩu xác nhận không khớp');
      return false;
    }

    // Check if owner email is available
    try {
      const result = await apiClient.checkOwnerEmail(formData.ownerEmail);
      if (!result.available) {
        setError('Email chủ sở hữu đã được sử dụng');
        return false;
      }
    } catch {
      setError('Không thể kiểm tra email');
      return false;
    }

    return true;
  };

  const handleNext = async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (currentStep === 'business') {
        if (await validateBusinessStep()) {
          setCurrentStep('owner');
        }
      } else if (currentStep === 'owner') {
        if (await validateOwnerStep()) {
          setCurrentStep('store');
        }
      } else if (currentStep === 'store') {
        // Submit registration
        await handleSubmit();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    setError(null);
    if (currentStep === 'owner') {
      setCurrentStep('business');
    } else if (currentStep === 'store') {
      setCurrentStep('owner');
    }
  };


  const handleSubmit = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await apiClient.registerTenant({
        businessName: formData.businessName,
        businessEmail: formData.businessEmail,
        businessPhone: formData.businessPhone || undefined,
        ownerName: formData.ownerName,
        ownerEmail: formData.ownerEmail,
        ownerPassword: formData.ownerPassword,
        subscriptionPlan: formData.subscriptionPlan,
        defaultStoreName: formData.defaultStoreName || undefined,
      });

      if (result.success) {
        setTenantId(result.tenantId);
        setCurrentStep('provisioning');
        setProvisioningStatus({
          status: 'pending',
          progress: 0,
          message: 'Đang khởi tạo...',
        });
      }
    } catch (err) {
      console.error('Registration error:', err);
      setError(err instanceof Error ? err.message : 'Đăng ký thất bại');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoToLogin = () => {
    router.push('/login');
    // Auto reload page after redirect to login
    setTimeout(() => {
      window.location.reload();
    }, 100);
  };

  // Render provisioning step
  if (currentStep === 'provisioning' && provisioningStatus) {
    return (
      <Card className="mx-auto max-w-md w-full">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Đang tạo tài khoản</CardTitle>
          <CardDescription>
            Vui lòng đợi trong khi chúng tôi thiết lập hệ thống cho bạn
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProvisioningProgress
            status={provisioningStatus.status}
            progress={provisioningStatus.progress}
            message={provisioningStatus.message}
            error={provisioningStatus.error}
          />
          
          {provisioningStatus.status === 'failed' && (
            <div className="mt-6 flex justify-center">
              <Button variant="outline" onClick={() => setCurrentStep('store')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Thử lại
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Render complete step
  if (currentStep === 'complete') {
    return (
      <Card className="mx-auto max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>
          <CardTitle className="text-xl">Đăng ký thành công!</CardTitle>
          <CardDescription>
            Tài khoản của bạn đã được tạo thành công
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border p-4 bg-muted/50">
            <div className="flex items-center gap-3 mb-3">
              <Building2 className="h-5 w-5 text-primary" />
              <span className="font-medium">{formData.businessName}</span>
            </div>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>Email: {formData.businessEmail}</p>
              <p>Chủ sở hữu: {formData.ownerName}</p>
              <p>Cửa hàng: {formData.defaultStoreName || 'Cửa hàng chính'}</p>
            </div>
          </div>

          <Alert>
            <AlertDescription>
              Bạn có thể đăng nhập ngay bằng email <strong>{formData.ownerEmail}</strong> và mật khẩu đã đăng ký.
            </AlertDescription>
          </Alert>

          <Button className="w-full" onClick={handleGoToLogin}>
            Đăng nhập ngay
          </Button>
        </CardContent>
      </Card>
    );
  }


  // Render form steps
  return (
    <Card className="mx-auto max-w-md w-full">
      <CardHeader>
        <CardTitle className="text-2xl text-center">Đăng ký doanh nghiệp</CardTitle>
        <CardDescription className="text-center">
          Tạo tài khoản để quản lý cửa hàng của bạn
        </CardDescription>
      </CardHeader>
      <CardContent>
        <StepIndicator currentStep={currentStep} steps={steps} />

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Business Info Step */}
        {currentStep === 'business' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="businessName">Tên doanh nghiệp *</Label>
              <Input
                id="businessName"
                placeholder="Công ty TNHH ABC"
                value={formData.businessName}
                onChange={(e) => updateFormData('businessName', e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="businessEmail">Email doanh nghiệp *</Label>
              <Input
                id="businessEmail"
                type="email"
                placeholder="contact@company.com"
                value={formData.businessEmail}
                onChange={(e) => updateFormData('businessEmail', e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="businessPhone">Số điện thoại</Label>
              <Input
                id="businessPhone"
                placeholder="0123 456 789"
                value={formData.businessPhone}
                onChange={(e) => updateFormData('businessPhone', e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="subscriptionPlan">Gói dịch vụ</Label>
              <Select
                value={formData.subscriptionPlan}
                onValueChange={(value) => updateFormData('subscriptionPlan', value)}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn gói dịch vụ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">Basic - Miễn phí</SelectItem>
                  <SelectItem value="standard">Standard - 199.000đ/tháng</SelectItem>
                  <SelectItem value="premium">Premium - 499.000đ/tháng</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Owner Info Step */}
        {currentStep === 'owner' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ownerName">Họ và tên *</Label>
              <Input
                id="ownerName"
                placeholder="Nguyễn Văn A"
                value={formData.ownerName}
                onChange={(e) => updateFormData('ownerName', e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ownerEmail">Email đăng nhập *</Label>
              <Input
                id="ownerEmail"
                type="email"
                placeholder="email@example.com"
                value={formData.ownerEmail}
                onChange={(e) => updateFormData('ownerEmail', e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ownerPassword">Mật khẩu *</Label>
              <Input
                id="ownerPassword"
                type="password"
                placeholder="Tối thiểu 8 ký tự"
                value={formData.ownerPassword}
                onChange={(e) => updateFormData('ownerPassword', e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ownerPasswordConfirm">Xác nhận mật khẩu *</Label>
              <Input
                id="ownerPasswordConfirm"
                type="password"
                placeholder="Nhập lại mật khẩu"
                value={formData.ownerPasswordConfirm}
                onChange={(e) => updateFormData('ownerPasswordConfirm', e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>
        )}

        {/* Store Info Step */}
        {currentStep === 'store' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="defaultStoreName">Tên cửa hàng đầu tiên</Label>
              <Input
                id="defaultStoreName"
                placeholder="Cửa hàng chính (mặc định)"
                value={formData.defaultStoreName}
                onChange={(e) => updateFormData('defaultStoreName', e.target.value)}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                Để trống nếu muốn sử dụng tên mặc định &quot;Cửa hàng chính&quot;
              </p>
            </div>

            <div className="rounded-lg border p-4 bg-muted/50">
              <h4 className="font-medium mb-2">Thông tin đăng ký</h4>
              <div className="text-sm text-muted-foreground space-y-1">
                <p><strong>Doanh nghiệp:</strong> {formData.businessName}</p>
                <p><strong>Email DN:</strong> {formData.businessEmail}</p>
                <p><strong>Chủ sở hữu:</strong> {formData.ownerName}</p>
                <p><strong>Email đăng nhập:</strong> {formData.ownerEmail}</p>
                <p><strong>Gói dịch vụ:</strong> {formData.subscriptionPlan === 'basic' ? 'Basic' : formData.subscriptionPlan === 'standard' ? 'Standard' : 'Premium'}</p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation buttons */}
        <div className="flex justify-between mt-6">
          {currentStep !== 'business' ? (
            <Button variant="outline" onClick={handleBack} disabled={isLoading}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Quay lại
            </Button>
          ) : (
            <Link href="/login">
              <Button variant="ghost">
                Đã có tài khoản?
              </Button>
            </Link>
          )}

          <Button onClick={handleNext} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang xử lý...
              </>
            ) : currentStep === 'store' ? (
              <>
                Đăng ký
                <CheckCircle2 className="ml-2 h-4 w-4" />
              </>
            ) : (
              <>
                Tiếp tục
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
