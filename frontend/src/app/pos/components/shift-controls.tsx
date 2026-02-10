'use client'

import { useState, useEffect } from 'react'
import {
  Clock,
  LogOut,
  CircleDollarSign,
  Briefcase,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { formatCurrency } from '@/lib/utils'
import { closeShift } from '../actions'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface Shift {
  id: string;
  userId: string;
  userName: string;
  status: 'active' | 'closed';
  startTime: string;
  endTime?: string;
  startingCash: number;
  endingCash?: number;
  cashSales?: number;
  cashPayments?: number;
  totalCashInDrawer?: number;
  cashDifference?: number;
  totalRevenue: number;
  salesCount: number;
  hourlyRate?: number; // Lương theo giờ
}

interface ShiftControlsProps {
  activeShift: Shift
  onShiftClosed?: () => void
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

export function ShiftControls({ activeShift, onShiftClosed }: ShiftControlsProps) {
  const [isCloseShiftDialogOpen, setIsCloseShiftDialogOpen] = useState(false)
  const [isOvertimeDialogOpen, setIsOvertimeDialogOpen] = useState(false)
  const [isCancelOvertimeDialogOpen, setIsCancelOvertimeDialogOpen] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const [additionalCash, setAdditionalCash] = useState(0)
  const [elapsedTime, setElapsedTime] = useState('')
  const [hoursWorked, setHoursWorked] = useState(0)
  const [hasAskedOvertime, setHasAskedOvertime] = useState(false)
  const [isOnOvertime, setIsOnOvertime] = useState(false) // Đang trong trạng thái tăng ca
  const [overtimeCountdown, setOvertimeCountdown] = useState(180) // 180 giây = 3 phút
  const [cancelReason, setCancelReason] = useState('') // Lý do hủy tăng ca
  const [isSubmittingCancelRequest, setIsSubmittingCancelRequest] = useState(false)
  const { toast } = useToast()
  const router = useRouter()
  
  // Countdown cho dialog tăng ca - tự động đóng ca sau 3 phút nếu không trả lời
  useEffect(() => {
    if (!isOvertimeDialogOpen) {
      setOvertimeCountdown(180) // Reset về 180 giây (3 phút)
      return
    }

    const countdownInterval = setInterval(() => {
      setOvertimeCountdown((prev) => {
        if (prev <= 1) {
          // Hết thời gian - tự động đóng ca
          clearInterval(countdownInterval)
          setIsOvertimeDialogOpen(false)
          toast({
            title: 'Hết thời gian trả lời',
            description: 'Bạn không trả lời trong 3 phút. Hệ thống sẽ tự động đóng ca.',
            variant: 'destructive'
          })
          setTimeout(() => {
            setIsCloseShiftDialogOpen(true)
          }, 1000)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(countdownInterval)
  }, [isOvertimeDialogOpen, toast])
  
  // Calculate elapsed time and hours worked from shift start
  useEffect(() => {
    if (!activeShift?.startTime) return;
    
    const updateElapsedTime = () => {
      try {
        const startTime = new Date(activeShift.startTime).getTime()
        if (isNaN(startTime)) {
          setElapsedTime('00:00:00')
          setHoursWorked(0)
          return
        }
        
        const now = Date.now()
        const diff = Math.max(0, now - startTime)
        
        const hours = Math.floor(diff / (1000 * 60 * 60))
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
        const seconds = Math.floor((diff % (1000 * 60)) / 1000)
        
        setElapsedTime(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`)
        
        // Calculate hours worked (with decimal for partial hours)
        const totalHours = diff / (1000 * 60 * 60)
        setHoursWorked(totalHours)

        // Hỏi tăng ca khi còn 5 phút nữa là đủ 8 tiếng (7h55p)
        // 7h55p = 7.9167 giờ, chỉ hỏi 1 lần
        if (totalHours >= 7.9167 && totalHours < 7.93 && !hasAskedOvertime) {
          setHasAskedOvertime(true)
          setIsOvertimeDialogOpen(true)
          toast({
            title: '⏰ Sắp hết giờ làm việc',
            description: 'Còn 5 phút nữa là đủ 8 tiếng. Vui lòng quyết định có tăng ca không.',
          })
        }

        // Tự động đóng ca khi đủ 12 tiếng
        if (totalHours >= 12 && totalHours < 12.02) {
          toast({
            title: 'Đã đủ 12 tiếng',
            description: 'Ca làm việc đã đạt giới hạn tối đa. Hệ thống sẽ tự động đóng ca.',
            variant: 'destructive'
          })
          setTimeout(() => {
            setIsCloseShiftDialogOpen(true)
          }, 2000)
        }
      } catch (error) {
        console.error('Error calculating elapsed time:', error)
        setElapsedTime('00:00:00')
        setHoursWorked(0)
      }
    }
    
    updateElapsedTime()
    const interval = setInterval(updateElapsedTime, 1000)
    
    return () => clearInterval(interval)
  }, [activeShift?.startTime, hasAskedOvertime, toast])
  
  // Tính lương theo giờ
  const hourlyRate = activeShift.hourlyRate || 20000; // Mặc định 20k/giờ
  const calculatedSalary = Math.round(hoursWorked * hourlyRate);
  
  // Tự động tính tiền mặt cuối ca
  const calculatedEndingCash = activeShift.startingCash + (activeShift.cashSales || 0) - (activeShift.cashPayments || 0) + additionalCash

  const handleCloseShift = async () => {
    setIsClosing(true)
    try {
      const result = await closeShift(activeShift.id, { endingCash: calculatedEndingCash })
      if (result.success) {
        toast({
          title: 'Đã đóng ca',
          description: 'Ca làm việc của bạn đã được đóng thành công.',
        })
        setIsCloseShiftDialogOpen(false)
        
        // Call the callback if provided
        if (onShiftClosed) {
          onShiftClosed()
        } else {
          // Default behavior: redirect to login
          router.push('/login')
        }
      } else {
        toast({
          variant: 'destructive',
          title: 'Lỗi đóng ca',
          description: result.error || 'Không thể đóng ca làm việc',
        })
      }
    } catch (error) {
      console.error('Error closing shift:', error)
      toast({
        variant: 'destructive',
        title: 'Lỗi đóng ca',
        description: error instanceof Error ? error.message : 'Đã xảy ra lỗi khi đóng ca',
      })
    } finally {
      setIsClosing(false)
    }
  }

  const handleOvertimeResponse = (acceptOvertime: boolean) => {
    setIsOvertimeDialogOpen(false)
    if (!acceptOvertime) {
      // Không tăng ca - tự động đóng ca
      toast({
        title: 'Kết thúc ca làm việc',
        description: 'Bạn đã từ chối tăng ca. Vui lòng đóng ca.',
      })
      setTimeout(() => {
        setIsCloseShiftDialogOpen(true)
      }, 1000)
    } else {
      // Chấp nhận tăng ca
      setIsOnOvertime(true)
      toast({
        title: 'Tăng ca được chấp nhận',
        description: 'Bạn có thể làm việc thêm đến 12 tiếng. Có thể hủy tăng ca bất cứ lúc nào.',
      })
    }
  }

  const handleCancelOvertime = async () => {
    if (!cancelReason.trim()) {
      toast({
        title: 'Thiếu thông tin',
        description: 'Vui lòng nhập lý do hủy tăng ca',
        variant: 'destructive'
      })
      return
    }

    setIsSubmittingCancelRequest(true)
    try {
      // TODO: Gửi yêu cầu hủy tăng ca đến backend
      // API sẽ tạo notification cho quản lý
      const response = await fetch('/api/shifts/cancel-overtime-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'x-store-id': localStorage.getItem('currentStoreId') || '',
        },
        body: JSON.stringify({
          shiftId: activeShift.id,
          reason: cancelReason,
          currentHours: hoursWorked,
          employeeName: activeShift.userName,
        })
      })

      if (!response.ok) {
        throw new Error('Không thể gửi yêu cầu')
      }

      setIsCancelOvertimeDialogOpen(false)
      setCancelReason('')
      toast({
        title: '✅ Đã gửi yêu cầu',
        description: 'Yêu cầu hủy tăng ca đã được gửi đến quản lý. Vui lòng chờ phê duyệt.',
      })
    } catch (error) {
      console.error('Error submitting cancel request:', error)
      toast({
        title: 'Lỗi',
        description: 'Không thể gửi yêu cầu hủy tăng ca. Vui lòng thử lại.',
        variant: 'destructive'
      })
    } finally {
      setIsSubmittingCancelRequest(false)
    }
  }

  return (
    <>
      <div className="flex items-center gap-4 text-sm text-muted-foreground ml-auto">
        <div className="flex items-center gap-2">
          <Briefcase className="h-4 w-4" />
          <span>Ca của: {activeShift.userName}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          <span>Thời gian ca: {elapsedTime}</span>
          {isOnOvertime && (
            <span className="ml-1 px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-xs font-semibold rounded">
              TĂNG CA
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <CircleDollarSign className="h-4 w-4" />
          <span>Tiền đầu ca: {formatCurrency(activeShift.startingCash)}</span>
        </div>
        {isOnOvertime && (
          <Button
            size="sm"
            variant="outline"
            className="border-orange-300 text-orange-700 hover:bg-orange-50 dark:border-orange-700 dark:text-orange-400 dark:hover:bg-orange-900/20"
            onClick={() => setIsCancelOvertimeDialogOpen(true)}
          >
            Yêu cầu hủy tăng ca
          </Button>
        )}
        <Button
          size="sm"
          variant="destructive"
          onClick={() => setIsCloseShiftDialogOpen(true)}
          data-shift-close-button
        >
          <LogOut className="mr-2 h-4 w-4" />
          Đóng ca
        </Button>
      </div>

      <Dialog
        open={isCloseShiftDialogOpen}
        onOpenChange={setIsCloseShiftDialogOpen}
      >
        <DialogContent className="max-h-[90vh] flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle>Đóng và Bàn giao ca</DialogTitle>
            <DialogDescription>
              Kiểm tra lại doanh thu và số tiền mặt trong ngăn kéo trước khi
              đóng ca.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto py-4 min-h-0">
            <div className="space-y-4">
            <div className="space-y-3 p-4 bg-muted rounded-lg">
              <div className="flex justify-between text-sm">
                <span>Bắt đầu ca lúc:</span>
                <span className="font-semibold">
                  {new Date(activeShift.startTime).toLocaleString('vi-VN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                  })}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Đóng ca lúc:</span>
                <span className="font-semibold">
                  {new Date().toLocaleString('vi-VN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                  })}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Thời gian làm việc:</span>
                <span className="font-semibold text-blue-600">{elapsedTime}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Lương theo giờ:</span>
                <span className="font-semibold">{formatCurrency(hourlyRate)}/giờ</span>
              </div>
              <div className="flex justify-between font-semibold text-base bg-green-50 dark:bg-green-950/20 p-2 rounded">
                <span className="text-green-700 dark:text-green-400">💰 Lương nhận được:</span>
                <span className="text-green-700 dark:text-green-400 text-lg">{formatCurrency(calculatedSalary)}</span>
              </div>
              <div className="border-t pt-2"></div>
              <div className="flex justify-between text-sm font-semibold text-lg">
                <span>Tổng doanh thu:</span>
                <span className="text-green-600">{formatCurrency(activeShift.totalRevenue || 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Số giao dịch:</span>
                <span className="font-semibold">{activeShift.salesCount || 0} đơn</span>
              </div>
              <div className="border-t pt-2"></div>
              <div className="flex justify-between text-sm">
                <span>Tiền đầu ca:</span>
                <span className="font-semibold">{formatCurrency(activeShift.startingCash)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Doanh thu tiền mặt:</span>
                <span className="font-semibold text-green-600">+{formatCurrency(activeShift.cashSales || 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Chi tiền mặt:</span>
                <span className="font-semibold text-red-600">-{formatCurrency(activeShift.cashPayments || 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Thanh toán ngoài (nếu có):</span>
                <span className="font-semibold text-blue-600">+{formatCurrency(additionalCash)}</span>
              </div>
              <div className="border-t pt-2 flex justify-between font-bold">
                <span>Tiền mặt cuối ca (tự động):</span>
                <span className="text-lg text-primary">{formatCurrency(calculatedEndingCash)}</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  // Open sales page filtered by shift
                  window.open(`/sales?shiftId=${activeShift.id}`, '_blank');
                }}
              >
                📋 Xem chi tiết {activeShift.salesCount || 0} giao dịch trong ca
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="additionalCash">Thanh toán ngoài (tùy chọn)</Label>
              <p className="text-xs text-muted-foreground">
                Nhập số tiền nếu có thanh toán ngoài không được ghi nhận trong hệ thống
              </p>
              <FormattedNumberInput
                id="additionalCash"
                value={additionalCash}
                onChange={setAdditionalCash}
                className="h-12 text-lg text-right font-bold"
                placeholder="0"
              />
            </div>
          </div>
          </div>
          <DialogFooter className="shrink-0 border-t pt-4">
            <Button
              variant="outline"
              onClick={() => setIsCloseShiftDialogOpen(false)}
              disabled={isClosing}
            >
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={handleCloseShift}
              disabled={isClosing}
            >
              {isClosing ? 'Đang đóng...' : 'Xác nhận Đóng ca'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog hỏi tăng ca với countdown 3 phút */}
      <Dialog open={isOvertimeDialogOpen} onOpenChange={setIsOvertimeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>⏰ Sắp hết giờ làm việc (còn 5 phút)</DialogTitle>
            <DialogDescription>
              Bạn sắp làm đủ 8 tiếng. Bạn có muốn tăng ca thêm không?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-lg border-2 border-red-200 dark:border-red-800">
              <p className="text-center text-3xl font-bold text-red-600 dark:text-red-400">
                ⏱️ {Math.floor(overtimeCountdown / 60)}:{(overtimeCountdown % 60).toString().padStart(2, '0')}
              </p>
              <p className="text-center text-sm text-red-600 dark:text-red-400 mt-1">
                Hệ thống sẽ tự động đóng ca nếu bạn không trả lời trong 3 phút
              </p>
            </div>
            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
              <p className="text-sm text-blue-700 dark:text-blue-400">
                ✅ <strong>Chấp nhận tăng ca:</strong> Bạn có thể làm việc thêm đến 12 tiếng
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-400 mt-2">
                ❌ <strong>Không tăng ca:</strong> Hệ thống sẽ yêu cầu bạn đóng ca khi đủ 8 tiếng
              </p>
              <p className="text-sm text-orange-600 dark:text-orange-400 mt-2">
                ℹ️ <strong>Lưu ý:</strong> Nếu chấp nhận, bạn có thể hủy tăng ca bất cứ lúc nào
              </p>
            </div>
            <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded">
              <p className="text-sm font-semibold text-green-700 dark:text-green-400">
                💰 Lương hiện tại: {formatCurrency(calculatedSalary)}
              </p>
              <p className="text-xs text-green-600 dark:text-green-500 mt-1">
                (Nếu làm đủ 8 tiếng: {formatCurrency(Math.round(8 * hourlyRate))})
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => handleOvertimeResponse(false)}
            >
              Không, đóng ca khi đủ 8 tiếng
            </Button>
            <Button
              onClick={() => handleOvertimeResponse(true)}
            >
              Có, tôi muốn tăng ca
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog yêu cầu hủy tăng ca */}
      <Dialog open={isCancelOvertimeDialogOpen} onOpenChange={(open) => {
        setIsCancelOvertimeDialogOpen(open)
        if (!open) setCancelReason('') // Reset reason when closing
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>📝 Yêu cầu hủy tăng ca</DialogTitle>
            <DialogDescription>
              Vui lòng nhập lý do để gửi yêu cầu hủy tăng ca đến quản lý phê duyệt.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-800 dark:text-blue-400">
                ℹ️ <strong>Lưu ý:</strong> Yêu cầu của bạn sẽ được gửi đến quản lý để xem xét và phê duyệt.
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="cancelReason">Lý do hủy tăng ca <span className="text-red-500">*</span></Label>
              <textarea
                id="cancelReason"
                className="w-full min-h-[100px] p-3 border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Ví dụ: Có việc gia đình đột xuất cần giải quyết gấp..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground text-right">
                {cancelReason.length}/500 ký tự
              </p>
            </div>

            <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <p className="text-sm text-yellow-800 dark:text-yellow-400 font-semibold mb-2">
                📋 Một số lý do thường gặp:
              </p>
              <ul className="text-sm text-yellow-700 dark:text-yellow-500 ml-4 list-disc space-y-1">
                <li>Có việc gia đình đột xuất</li>
                <li>Sức khỏe không cho phép tiếp tục</li>
                <li>Có công việc cá nhân quan trọng</li>
                <li>Lý do khác (vui lòng ghi rõ)</li>
              </ul>
            </div>

            <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded">
              <p className="text-sm font-semibold text-green-700 dark:text-green-400">
                💰 Lương hiện tại: {formatCurrency(calculatedSalary)}
              </p>
              <p className="text-xs text-green-600 dark:text-green-500 mt-1">
                Thời gian làm việc: {elapsedTime}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCancelOvertimeDialogOpen(false)
                setCancelReason('')
              }}
              disabled={isSubmittingCancelRequest}
            >
              Hủy bỏ
            </Button>
            <Button
              onClick={handleCancelOvertime}
              disabled={isSubmittingCancelRequest || !cancelReason.trim()}
            >
              {isSubmittingCancelRequest ? 'Đang gửi...' : 'Gửi yêu cầu đến quản lý'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
