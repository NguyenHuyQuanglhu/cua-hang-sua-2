'use client';

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
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Building2, CheckCircle2 } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

import Link from 'next/link';

// Role-based redirect mapping
const ROLE_REDIRECTS: Record<string, string> = {
  owner: '/dashboard',
  company_manager: '/dashboard',
  store_manager: '/dashboard',
  salesperson: '/pos',
  admin: '/dashboard', // Legacy role support
};

// Role display names in Vietnamese
const ROLE_DISPLAY_NAMES: Record<string, string> = {
  owner: 'Chủ sở hữu',
  company_manager: 'Quản lý công ty',
  store_manager: 'Quản lý cửa hàng',
  salesperson: 'Nhân viên bán hàng',
  admin: 'Quản trị viên',
};

interface LoginSuccessInfo {
  tenantName?: string;
  userName?: string;
  role: string;
  storeCount: number;
}

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loginSuccess, setLoginSuccess] = useState<LoginSuccessInfo | null>(null);

  // Check if user is already logged in
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = apiClient.getToken();
        if (token) {
          const data = await apiClient.getMe();
          if (data.user) {
            // User is already logged in, redirect based on role
            const redirectPath = ROLE_REDIRECTS[data.user.role] || '/dashboard';
            router.push(redirectPath);
            return;
          }
        }
      } catch {
        // Not logged in, continue to show login form
      }
      setIsCheckingAuth(false);
    };

    checkAuth();
  }, [router]);

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoginSuccess(null);
    setIsLoading(true);

    const formData = new FormData(event.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
      const result = await apiClient.login(email, password);

      if (result.user) {
        // Store user info in localStorage for client-side access
        localStorage.setItem('user', JSON.stringify(result.user));

        // Store tenant info if available
        if (result.tenant) {
          localStorage.setItem('tenant', JSON.stringify(result.tenant));
        }

        // Set first store as current if available
        if (result.stores && result.stores.length > 0) {
          // Handle both string[] and object[] formats
          const firstStoreId = typeof result.stores[0] === 'string' 
            ? result.stores[0] 
            : (result.stores[0] as { storeId: string }).storeId;
          apiClient.setStoreId(firstStoreId);
        }

        // Show success info briefly before redirect
        setLoginSuccess({
          tenantName: result.tenant?.name,
          userName: result.user.displayName || result.user.email,
          role: result.user.role,
          storeCount: result.stores?.length || 0,
        });

        // Redirect based on role after a brief delay to show success message
        setTimeout(() => {
          const redirectPath = ROLE_REDIRECTS[result.user.role] || '/dashboard';
          router.push(redirectPath);
          // Auto reload page after successful login
          setTimeout(() => {
            window.location.reload();
          }, 100);
        }, 1000);
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(
        err instanceof Error ? err.message : 'Đã xảy ra lỗi khi đăng nhập'
      );
      setIsLoading(false);
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Đang tải...</span>
      </div>
    );
  }

  // Show success state with tenant info
  if (loginSuccess) {
    return (
      <Card className="mx-auto max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="h-6 w-6 text-green-600" />
          </div>
          <CardTitle className="text-xl">Đăng nhập thành công!</CardTitle>
          <CardDescription>
            Đang chuyển hướng...
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loginSuccess.tenantName && (
            <div className="flex items-center gap-3 rounded-lg border p-3 bg-muted/50">
              <Building2 className="h-5 w-5 text-primary" />
              <div className="flex-1">
                <p className="text-sm font-medium">{loginSuccess.tenantName}</p>
                <p className="text-xs text-muted-foreground">
                  {loginSuccess.storeCount} cửa hàng
                </p>
              </div>
            </div>
          )}
          <div className="text-center text-sm text-muted-foreground">
            <p>Xin chào, <span className="font-medium">{loginSuccess.userName}</span></p>
            <p className="text-xs mt-1">
              Vai trò: {ROLE_DISPLAY_NAMES[loginSuccess.role] || loginSuccess.role}
            </p>
          </div>
          <div className="flex justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mx-auto max-w-sm">
      <CardHeader>
        <CardTitle className="text-2xl">Đăng nhập</CardTitle>
        <CardDescription>
          Nhập email của bạn dưới đây để đăng nhập vào tài khoản của bạn
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleLogin} className="grid gap-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="m@example.com"
              required
              disabled={isLoading}
            />
          </div>
          <div className="grid gap-2">
            <div className="flex items-center">
              <Label htmlFor="password">Mật khẩu</Label>
              <a href="#" className="ml-auto inline-block text-sm underline">
                Quên mật khẩu?
              </a>
            </div>
            <Input
              id="password"
              name="password"
              type="password"
              required
              disabled={isLoading}
            />
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang đăng nhập...
              </>
            ) : (
              'Đăng nhập'
            )}
          </Button>
          <div className="text-center text-sm">
            <span className="text-muted-foreground">Chưa có tài khoản? </span>
            <Link href="/register" className="text-primary hover:underline">
              Đăng ký ngay
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
