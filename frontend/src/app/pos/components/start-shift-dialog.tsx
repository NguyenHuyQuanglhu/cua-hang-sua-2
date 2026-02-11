'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { useStore } from '@/contexts/store-context'
import { startShift } from '../actions'
import { LogOut, AlertCircle } from 'lucide-react'

interface StartShiftDialogProps {
  userId: string;
  userName: string;
  userRole?: string; // Add role to determine redirect behavior
  onShiftStarted: () => void;
  // Legacy support for user object
  user?: { uid?: string; displayName?: string | null; role?: string };
}

const FormattedNumberInput = ({
  value,
  onChange,
  ...props
}: {
  value: number
  onChange: (value: number) => void
  [key: string]: unknown
}) => {
  const [displayValue, setDisplayValue] = useState(
    value?.toLocaleString('en-US') || ''
  )

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/,/g, '')
    const numberValue = parseInt(rawValue, 10)

    if (!isNaN(numberValue)) {
      setDisplayValue(numberValue.toLocaleString('en-US'))
      onChange(numberValue)
    } else if (rawValue === '') {
      setDisplayValue('')
      onChange(0)
    }
  }

  return <Input type="text" value={displayValue} onChange={handleChange} {...props} />
}

export function StartShiftDialog({ userId, userName, userRole, onShiftStarted, user }: StartShiftDialogProps) {
  const [startingCash, setStartingCash] = useState(0)
  const [isStarting, setIsStarting] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [showCloseWarning, setShowCloseWarning] = useState(false)
  const { toast } = useToast()
  const router = useRouter()
  const { logout } = useStore()

  // Support both new props and legacy user object
  const effectiveUserId = userId || user?.uid || '';
  const effectiveUserName = userName || user?.displayName || '';
  const effectiveUserRole = userRole || user?.role || 'salesperson';

  // Check if user can access management pages
  const canAccessManagement = ['owner', 'company_manager', 'store_manager'].includes(effectiveUserRole);

  const handleStartShift = async () => {
    setIsStarting(true)
    const result = await startShift({ startingCash })
    if (result.success) {
      toast({
        title: 'Đã bắt đầu ca mới',
        description: 'Bạn có thể bắt đầu bán hàng.',
      })
      onShiftStarted()
    } else {
      toast({
        variant: 'destructive',
        title: 'Lỗi bắt đầu ca',
        description: result.error,
      })
    }
    setIsStarting(false)
  }

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await logout()
      toast({
        title: 'Đã đăng xuất',
        description: 'Bạn đã đăng xuất thành công.',
      })
      router.push('/login')
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Lỗi đăng xuất',
        description: 'Không thể đăng xuất. Vui lòng thử lại.',
      })
    } finally {
      setIsLoggingOut(false)
    }
  }

  const handleCloseAttempt = () => {
    // If user is admin/manager, redirect to dashboard
    if (canAccessManagement) {
      router.push('/dashboard')
    } else {
      // If user is salesperson, show warning
      setShowCloseWarning(true)
    }
  }

  return (
    <>
      <Dialog open={true} onOpenChange={(open) => !open && handleCloseAttempt()}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Bắt đầu ca làm việc</DialogTitle>
            <DialogDescription>
              Nhập số tiền mặt ban đầu trong ngăn kéo để bắt đầu ca mới.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="startingCash" className="text-right">
                Tiền đầu ca
              </Label>
              <div className="col-span-3">
                <FormattedNumberInput
                  id="startingCash"
                  value={startingCash}
                  onChange={setStartingCash}
                  className="text-right"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button 
              variant="outline" 
              onClick={handleLogout} 
              disabled={isLoggingOut || isStarting}
              className="w-full sm:w-auto"
            >
              <LogOut className="mr-2 h-4 w-4" />
              {isLoggingOut ? 'Đang đăng xuất...' : 'Đăng xuất'}
            </Button>
            <Button 
              onClick={handleStartShift} 
              disabled={isStarting || isLoggingOut}
              className="w-full sm:w-auto"
            >
              {isStarting ? 'Đang bắt đầu...' : 'Bắt đầu ca'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Warning Dialog when trying to close - Only for salesperson */}
      <AlertDialog open={showCloseWarning} onOpenChange={setShowCloseWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              Không thể đóng
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p className="text-base font-medium text-foreground">
                Nhân viên bán hàng phải bắt đầu ca làm việc mới có thể sử dụng hệ thống POS.
              </p>
              <div className="bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-md p-4">
                <p className="text-sm text-orange-900 dark:text-orange-100">
                  Vui lòng chọn một trong hai tùy chọn:
                </p>
                <ul className="list-disc list-inside text-sm text-orange-800 dark:text-orange-200 mt-2 space-y-1">
                  <li><strong>Bắt đầu ca</strong> - Để tiếp tục làm việc và bán hàng</li>
                  <li><strong>Đăng xuất</strong> - Để kết thúc và cho người khác đăng nhập</li>
                </ul>
              </div>
              <p className="text-xs text-muted-foreground italic">
                💡 Lưu ý: Chỉ tài khoản quản lý mới có thể truy cập các trang khác mà không cần mở ca.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowCloseWarning(false)}>
              Đã hiểu
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
