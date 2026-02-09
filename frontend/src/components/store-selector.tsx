'use client';

import { Store, Building2, ChevronDown, Settings2, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useStore } from '@/contexts/store-context';
import { Skeleton } from '@/components/ui/skeleton';
import { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface StoreSelectorProps {
  className?: string;
}

export function StoreSelector({ className }: StoreSelectorProps) {
  const { currentStore, stores, user, tenant, isLoading, switchStore, canAccessStore, error } = useStore();
  const [switchError, setSwitchError] = useState<string | null>(null);
  const router = useRouter();
  
  // Check if user can manage stores (owner or admin)
  const canManageStores = user?.role === 'owner' || user?.role === 'admin';

  const handleSwitchStore = async (storeId: string) => {
    setSwitchError(null);

    // Verify permission before switching
    if (!canAccessStore(storeId)) {
      setSwitchError('Bạn không có quyền truy cập cửa hàng này');
      return;
    }

    const success = await switchStore(storeId);
    if (success) {
      // Refresh the current page data without full reload
      router.refresh();
    } else {
      setSwitchError('Không thể chuyển đến cửa hàng này');
    }
  };

  if (isLoading) {
    return <Skeleton className="h-10 w-[200px]" />;
  }

  if (stores.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Building2 className="h-4 w-4" />
        <span>Chưa có cửa hàng</span>
      </div>
    );
  }

  // If only one store and user can't manage stores, show it without dropdown
  if (stores.length === 1 && !canManageStores) {
    return (
      <div className="flex items-center gap-2 text-sm font-medium">
        <Store className="h-4 w-4 text-primary" />
        <span>{stores[0].name}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className={`w-[200px] justify-between ${className || ''}`}>
            <div className="flex items-center gap-2">
              <Store className="h-4 w-4 text-primary" />
              <span className="truncate">{currentStore?.name || 'Chọn cửa hàng'}</span>
            </div>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-[200px]">
          {/* Show tenant name if available */}
          {tenant && (
            <>
              <div className="px-2 py-1.5 text-xs text-muted-foreground flex items-center gap-1.5">
                <Building2 className="h-3 w-3" />
                {tenant.name}
              </div>
              <DropdownMenuSeparator />
            </>
          )}
          
          {/* Store list - only shows stores user has access to */}
          {stores.map((store) => (
            <DropdownMenuItem
              key={store.id}
              onClick={() => handleSwitchStore(store.id)}
              className={currentStore?.id === store.id ? 'bg-accent' : ''}
            >
              <div className="flex flex-col">
                <span className="font-medium">{store.name}</span>
                {store.address && (
                  <span className="text-xs text-muted-foreground truncate max-w-[180px]">
                    {store.address}
                  </span>
                )}
              </div>
            </DropdownMenuItem>
          ))}
          
          {/* Store management link for owners/admins */}
          {canManageStores && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/stores" className="flex items-center gap-2">
                  <Settings2 className="h-4 w-4" />
                  <span>Quản lý cửa hàng</span>
                </Link>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      
      {/* Show error if store switch failed */}
      {(switchError || error) && (
        <Alert variant="destructive" className="py-1 px-2">
          <AlertCircle className="h-3 w-3" />
          <AlertDescription className="text-xs">
            {switchError || error}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

export function StoreSelectorCompact() {
  const { currentStore, stores, user, isLoading, switchStore, canAccessStore } = useStore();
  const [switchError, setSwitchError] = useState<string | null>(null);
  const router = useRouter();
  
  // Check if user can manage stores (owner or admin)
  const canManageStores = user?.role === 'owner' || user?.role === 'admin';

  const handleSwitchStore = async (storeId: string) => {
    setSwitchError(null);

    // Verify permission before switching
    if (!canAccessStore(storeId)) {
      setSwitchError('Không có quyền');
      setTimeout(() => setSwitchError(null), 3000);
      return;
    }

    const success = await switchStore(storeId);
    if (success) {
      // Refresh the current page data without full reload
      router.refresh();
    } else {
      setSwitchError('Lỗi chuyển cửa hàng');
      setTimeout(() => setSwitchError(null), 3000);
    }
  };

  if (isLoading) {
    return <Skeleton className="h-8 w-[150px]" />;
  }

  if (stores.length === 0 || !currentStore) {
    return null;
  }

  // If only one store and user can't manage stores, show without dropdown
  if (stores.length === 1 && !canManageStores) {
    return (
      <div className="flex items-center gap-1.5 text-sm">
        <Store className="h-3.5 w-3.5 text-primary" />
        <span className="font-medium truncate max-w-[120px]">{currentStore.name}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-[150px] justify-between text-sm">
            <div className="flex items-center gap-1.5">
              <Store className="h-3.5 w-3.5 text-primary" />
              <span className="truncate">{currentStore.name}</span>
            </div>
            <ChevronDown className="h-3.5 w-3.5 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-[150px]">
          {stores.map((store) => (
            <DropdownMenuItem
              key={store.id}
              onClick={() => handleSwitchStore(store.id)}
              className={currentStore.id === store.id ? 'bg-accent' : ''}
            >
              {store.name}
            </DropdownMenuItem>
          ))}
          {canManageStores && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/stores" className="flex items-center gap-2">
                  <Settings2 className="h-3.5 w-3.5" />
                  <span>Quản lý</span>
                </Link>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      
      {/* Show brief error tooltip */}
      {switchError && (
        <span className="text-xs text-destructive">{switchError}</span>
      )}
    </div>
  );
}
