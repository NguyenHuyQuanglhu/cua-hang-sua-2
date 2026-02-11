'use client'

import { useState } from 'react'
import { Mail, MessageSquare, Copy, Check } from 'lucide-react'
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from '@/hooks/use-toast'
import type { CustomerDebtInfo } from '../page'
import { formatCurrency } from '@/lib/utils'
import { Separator } from '@/components/ui/separator'

interface DebtReminderDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  customer?: CustomerDebtInfo;
}

export function DebtReminderDialog({ isOpen, onOpenChange, customer }: DebtReminderDialogProps) {
  const { toast } = useToast();
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedSMS, setCopiedSMS] = useState(false);

  if (!customer) return null;

  const debtAmount = formatCurrency(customer.finalDebt);
  
  // Email template
  const emailSubject = `Thông báo công nợ - ${customer.customerName}`;
  const emailBody = `Kính gửi ${customer.customerName},

Chúng tôi xin thông báo về công nợ hiện tại của quý khách:

- Tổng phát sinh: ${formatCurrency(customer.totalSales)}
- Đã thanh toán: ${formatCurrency(customer.totalPayments)}
- Còn nợ: ${debtAmount}

Quý khách vui lòng thanh toán số tiền còn nợ trong thời gian sớm nhất.

Trân trọng,
Cửa hàng`;

  // SMS template
  const smsMessage = `[Nhắc nợ] Kính gửi ${customer.customerName}, quý khách còn nợ ${debtAmount}. Vui lòng thanh toán sớm. Xin cảm ơn!`;

  const handleSendEmail = () => {
    if (!customer.customerEmail) {
      toast({
        variant: "destructive",
        title: "Không có email",
        description: "Khách hàng chưa có địa chỉ email trong hệ thống.",
      });
      return;
    }

    // Open default email client
    const mailtoLink = `mailto:${customer.customerEmail}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
    window.location.href = mailtoLink;

    toast({
      title: "Đã mở ứng dụng email",
      description: "Vui lòng gửi email từ ứng dụng email của bạn.",
    });
  };

  const handleSendSMS = () => {
    if (!customer.customerPhone) {
      toast({
        variant: "destructive",
        title: "Không có số điện thoại",
        description: "Khách hàng chưa có số điện thoại trong hệ thống.",
      });
      return;
    }

    // Open SMS app (works on mobile)
    const smsLink = `sms:${customer.customerPhone}?body=${encodeURIComponent(smsMessage)}`;
    window.location.href = smsLink;

    toast({
      title: "Đã mở ứng dụng tin nhắn",
      description: "Vui lòng gửi tin nhắn từ ứng dụng của bạn.",
    });
  };

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(`${emailSubject}\n\n${emailBody}`);
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
      toast({
        title: "Đã sao chép",
        description: "Nội dung email đã được sao chép vào clipboard.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: "Không thể sao chép nội dung.",
      });
    }
  };

  const handleCopySMS = async () => {
    try {
      await navigator.clipboard.writeText(smsMessage);
      setCopiedSMS(true);
      setTimeout(() => setCopiedSMS(false), 2000);
      toast({
        title: "Đã sao chép",
        description: "Nội dung tin nhắn đã được sao chép vào clipboard.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: "Không thể sao chép nội dung.",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nhắc nợ khách hàng</DialogTitle>
          <DialogDescription>
            Gửi thông báo nhắc nợ đến khách hàng{' '}
            <span className="font-semibold">{customer.customerName}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Customer Info */}
          <div className="rounded-lg border p-4 bg-muted/50">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Tên khách hàng</p>
                <p className="font-medium">{customer.customerName}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Số nợ hiện tại</p>
                <p className="font-bold text-destructive text-lg">{debtAmount}</p>
              </div>
              {customer.customerEmail && (
                <div>
                  <p className="text-muted-foreground">Email</p>
                  <p className="font-medium">{customer.customerEmail}</p>
                </div>
              )}
              {customer.customerPhone && (
                <div>
                  <p className="text-muted-foreground">Số điện thoại</p>
                  <p className="font-medium">{customer.customerPhone}</p>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Email Option */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Gửi qua Email</h3>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyEmail}
                  disabled={!customer.customerEmail}
                >
                  {copiedEmail ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
                <Button
                  onClick={handleSendEmail}
                  disabled={!customer.customerEmail}
                  size="sm"
                >
                  Gửi Email
                </Button>
              </div>
            </div>
            <div className="rounded-lg border p-3 bg-muted/30 text-sm">
              <p className="font-medium mb-2">Tiêu đề: {emailSubject}</p>
              <pre className="whitespace-pre-wrap font-sans text-xs text-muted-foreground">
                {emailBody}
              </pre>
            </div>
          </div>

          <Separator />

          {/* SMS Option */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Gửi qua SMS</h3>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopySMS}
                  disabled={!customer.customerPhone}
                >
                  {copiedSMS ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
                <Button
                  onClick={handleSendSMS}
                  disabled={!customer.customerPhone}
                  size="sm"
                >
                  Gửi SMS
                </Button>
              </div>
            </div>
            <div className="rounded-lg border p-3 bg-muted/30 text-sm">
              <pre className="whitespace-pre-wrap font-sans">
                {smsMessage}
              </pre>
            </div>
          </div>

          <div className="text-xs text-muted-foreground">
            <p>💡 Mẹo: Bạn có thể sao chép nội dung và gửi qua ứng dụng khác như Zalo, Messenger, v.v.</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
