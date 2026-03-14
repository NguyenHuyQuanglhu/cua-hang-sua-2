'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { ProfileDialog } from '@/components/profile-dialog'
import { useStore } from '@/contexts/store-context'
import { useUserRole } from '@/hooks/use-user-role'
import { useToast } from '@/hooks/use-toast'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api-client'

export function UserNav() {
  const { user, logout } = useStore();
  const { role, permissions } = useUserRole();
  const { toast } = useToast();
  const router = useRouter();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [hasActiveShift, setHasActiveShift] = useState(false);
  const [checkingShift, setCheckingShift] = useState(false);

  const checkActiveShift = async () => {
    try {
      setCheckingShift(true);
      const response = await apiClient.getActiveShift();
      setHasActiveShift(!!response);
      return !!response;
    } catch (error) {
      // No active shift or error
      setHasActiveShift(false);
      return false;
    } finally {
      setCheckingShift(false);
    }
  };

  const handleLogoutClick = async () => {
    // Check if there's an active shift
    const hasShift = await checkActiveShift();
    
    if (hasShift) {
      // Show blocking dialog - MUST close shift first
      setShowLogoutDialog(true);
    } else {
      // No active shift, logout directly
      await performLogout();
    }
  };

  const performLogout = async () => {
    await logout();
    router.push('/login');
  };
  
  const canViewSettings = permissions?.settings?.includes('view');

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-8 w-8 rounded-full">
            <Avatar className="h-9 w-9">
              <AvatarImage src={user?.photoURL || "https://i.pravatar.cc/150?u=a042581f4e29026704d"} alt="@user" />
              <AvatarFallback>{user?.email?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{user?.displayName || 'Người dùng'}</p>
              <p className="text-xs leading-none text-muted-foreground">
                {user?.email}
              </p>
              {role && <p className="text-xs leading-none text-muted-foreground capitalize pt-1">{role}</p>}
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => setShowProfileDialog(true)}>
              Hồ sơ
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/guide">Hướng dẫn</Link>
            </DropdownMenuItem>
            {canViewSettings && (
              <DropdownMenuItem asChild>
                <Link href="/settings">Cài đặt</Link>
              </DropdownMenuItem>
            )}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogoutClick} disabled={checkingShift}>
            {checkingShift ? 'Đang kiểm tra...' : 'Đăng xuất'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Profile Dialog */}
      <ProfileDialog 
        open={showProfileDialog} 
        onOpenChange={setShowProfileDialog} 
      />

      {/* Logout Warning Dialog - MUST close shift */}
      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>🚫 Không thể đăng xuất</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn hiện đang có ca làm việc chưa đóng. Bạn phải đóng ca trước khi đăng xuất.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3">
            <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-md p-4">
              <p className="text-sm text-red-800 dark:text-red-200 font-semibold mb-2">
                ⚠️ Yêu cầu bắt buộc:
              </p>
              <ol className="text-sm text-red-700 dark:text-red-300 space-y-2 list-decimal list-inside">
                <li>Vào trang POS (Point of Sale)</li>
                <li>Kiểm tra và đối chiếu số tiền cuối ca</li>
                <li>Nhấn nút "Đóng ca" để kết thúc ca làm việc</li>
                <li>Sau đó mới có thể đăng xuất</li>
              </ol>
            </div>
            <p className="text-sm text-muted-foreground">
              Việc đóng ca đúng quy trình giúp đảm bảo dữ liệu chính xác và tránh sai sót trong báo cáo.
            </p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Đóng</AlertDialogCancel>
            <AlertDialogAction asChild>
              <Link href="/pos" onClick={() => setShowLogoutDialog(false)}>
                Đi đến POS để đóng ca
              </Link>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
