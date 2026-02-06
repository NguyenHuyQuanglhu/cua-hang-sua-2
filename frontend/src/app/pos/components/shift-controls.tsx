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
  const [isClosing, setIsClosing] = useState(false)
  const [additionalCash, setAdditionalCash] = useState(0)
  const [elapsedTime, setElapsedTime] = useState('')
  const { toast } = useToast()
  const router = useRouter()
  
  // Calculate elapsed time from shift start
  useEffect(() => {
    if (!activeShift?.startTime) return;
    
    const updateElapsedTime = () => {
      try {
        const startTime = new Date(activeShift.startTime).getTime()
        if (isNaN(startTime)) {
          setElapsedTime('00:00:00')
          return
        }
        
        const now = Date.now()
        const diff = Math.max(0, now - startTime)
        
        const hours = Math.floor(diff / (1000 * 60 * 60))
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
        const seconds = Math.floor((diff % (1000 * 60)) / 1000)
        
        setElapsedTime(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`)
      } catch (error) {
        console.error('Error calculating elapsed time:', error)
        setElapsedTime('00:00:00')
      }
    }
    
    updateElapsedTime()
    const interval = setInterval(updateElapsedTime, 1000)
    
    return () => clearInterval(interval)
  }, [activeShift?.startTime])
  
  // Tự động tính tiền mặt cuối ca
  const calculatedEndingCash = activeShift.startingCash + (activeShift.cashSales || 0) - (activeShift.cashPayments || 0) + additionalCash

  const handleCloseShift = async () => {
    setIsClosing(true)
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
        description: result.error,
      })
    }
    setIsClosing(false)
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
        </div>
        <div className="flex items-center gap-2">
          <CircleDollarSign className="h-4 w-4" />
          <span>Tiền đầu ca: {formatCurrency(activeShift.startingCash)}</span>
        </div>
        <Button
          size="sm"
          variant="destructive"
          onClick={() => setIsCloseShiftDialogOpen(true)}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Đóng ca
        </Button>
      </div>

      <Dialog
        open={isCloseShiftDialogOpen}
        onOpenChange={setIsCloseShiftDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Đóng và Bàn giao ca</DialogTitle>
            <DialogDescription>
              Kiểm tra lại doanh thu và số tiền mặt trong ngăn kéo trước khi
              đóng ca.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
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
          <DialogFooter>
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
    </>
  )
}
