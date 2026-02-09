'use client'

import { useState } from 'react'
import { Mail, MessageSquare, AlertCircle, Send, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { formatCurrency } from '@/lib/utils'

interface DebtReminderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  customer: {
    id: string
    name: string
    email?: string
    phone?: string
    debt: number
  }
  onSent: () => void
}

export function DebtReminderDialog({
  open,
  onOpenChange,
  customer,
  onSent,
}: DebtReminderDialogProps) {
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{
    success: boolean
    method: 'email' | 'sms' | 'none'
    message: string
  } | null>(null)

  const hasEmail = !!customer.email
  const hasPhone = !!customer.phone
  const hasContact = hasEmail || hasPhone

  const handleSend = async () => {
    setSending(true)
    setResult(null)

    try {
      const response = await fetch('/api/debt-reminder/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId: customer.id,
          message: message || undefined,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setResult({
          success: true,
          method: data.method,
          message: data.message,
        })
        setTimeout(() => {
          onSent()
          onOpenChange(false)
          setMessage('')
          setResult(null)
        }, 2000)
      } else {
        setResult({
          success: false,
          method: 'none',
          message: data.error || 'Gửi thất bại',
        })
      }
    } catch (error) {
      setResult({
        success: false,
        method: 'none',
        message: 'Lỗi kết nối',
      })
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Gửi thông báo nhắc nợ</DialogTitle>
          <DialogDescription>
            Gửi thông báo nhắc nợ cho khách hàng <strong>{customer.name}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Customer Info */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Số nợ:</span>
              <span className="font-semibold text-red-600">
                {formatCurrency(customer.debt)}
              </span>
            </div>

            {hasEmail && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Email:</span>
                <span>{customer.email}</span>
              </div>
            )}

            {hasPhone && (
              <div className="flex items-center gap-2 text-sm">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">SĐT:</span>
                <span>{customer.phone}</span>
              </div>
            )}

            {!hasContact && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Khách hàng không có email và số điện thoại
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Message Input */}
          {hasContact && (
            <div className="space-y-2">
              <Label htmlFor="message">
                Nội dung (tùy chọn)
              </Label>
              <Textarea
                id="message"
                placeholder="Nhập nội dung tùy chỉnh hoặc để trống để dùng mẫu mặc định..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                disabled={sending}
              />
              <p className="text-xs text-muted-foreground">
                {hasEmail && 'Ưu tiên gửi qua email. '}
                {!hasEmail && hasPhone && 'Sẽ gửi qua SMS (chức năng đang phát triển).'}
              </p>
            </div>
          )}

          {/* Result */}
          {result && (
            <Alert variant={result.success ? 'default' : 'destructive'}>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{result.message}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={sending}
          >
            Hủy
          </Button>
          {hasContact && (
            <Button
              onClick={handleSend}
              disabled={sending || !!result?.success}
            >
              {sending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang gửi...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Gửi thông báo
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
