'use client';

import { ReactNode, useEffect, useState, useMemo, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useStore } from '@/contexts/store-context';
import { useUserRole } from '@/hooks/use-user-role';
import { checkRoutePermission } from '@/lib/auth/permissions';
import { AccessDenied } from '@/components/access-denied';

interface RouteGuardProps {
  children: ReactNode;
}

// Routes that don't require authentication
const PUBLIC_ROUTES = ['/login', '/register', '/forgot-password'];

// Routes that don't require permission checks (but require authentication)
const AUTH_ONLY_ROUTES = ['/dashboard', '/guide', '/store', '/online-stores'];

/**
 * RouteGuard component that protects routes based on authentication and permissions
 * 
 * This component:
 * 1. Redirects unauthenticated users to login
 * 2. Checks route permissions for authenticated users
 * 3. Shows AccessDenied for unauthorized access
 */
export function RouteGuard({ children }: RouteGuardProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading: isUserLoading } = useStore();
  const { permissions, isLoading: isRoleLoading } = useUserRole();
  const [hasRedirected, setHasRedirected] = useState(false);

  const isLoading = isUserLoading || isRoleLoading;

  // Check if route is public
  const isPublicRoute = useMemo(() => {
    return PUBLIC_ROUTES.some(route => pathname.startsWith(route));
  }, [pathname]);

  // Check if route only requires authentication
  const isAuthOnlyRoute = useMemo(() => {
    return AUTH_ONLY_ROUTES.some(route => 
      pathname === route || pathname.startsWith(route + '/')
    );
  }, [pathname]);

  // Calculate authorization status
  const authStatus = useMemo(() => {
    if (isLoading) {
      return { status: 'loading' as const };
    }

    if (isPublicRoute) {
      return { status: 'authorized' as const };
    }

    if (!user) {
      return { status: 'unauthenticated' as const };
    }

    if (isAuthOnlyRoute) {
      return { status: 'authorized' as const };
    }

    const { requiresPermission, hasAccess } = checkRoutePermission(
      pathname,
      permissions,
      user.role
    );

    if (!requiresPermission || hasAccess) {
      return { status: 'authorized' as const };
    }

    return { status: 'unauthorized' as const };
  }, [isLoading, isPublicRoute, isAuthOnlyRoute, user, pathname, permissions]);

  // Handle redirect for unauthenticated users
  useEffect(() => {
    if (authStatus.status === 'unauthenticated' && !hasRedirected) {
      setHasRedirected(true);
      router.push('/login');
      // Auto reload page after redirect to login
      setTimeout(() => {
        window.location.reload();
      }, 100);
    }
  }, [authStatus.status, hasRedirected, router]);

  // Reset redirect flag when pathname changes
  useEffect(() => {
    setHasRedirected(false);
  }, [pathname]);

  // Render based on auth status
  if (authStatus.status === 'loading') {
    return null;
  }

  if (authStatus.status === 'unauthenticated') {
    return null;
  }

  if (authStatus.status === 'unauthorized') {
    return <AccessDenied />;
  }

  return <>{children}</>;
}
