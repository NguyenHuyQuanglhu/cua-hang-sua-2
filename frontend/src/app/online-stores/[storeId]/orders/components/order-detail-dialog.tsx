'use client'

import { useState, useTransition } from "react"
import {
  Clock,
  CheckCircle,
  Package,
  Truck,
  XCircle,
  MapPin,
  Phone,
  Mail,
  User,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Separator } from "@/components/ui/separator"
import { formatCurrency } from "@/lib/utils"
import { OnlineOrder, OrderStatus } from "../../../actions"

const ORDER_STATUSES: { value: OrderStatus; label: string; icon: React.ReactNode }[] = [
  { value: 'pending', label: 'Chờ xác nhận', icon: <Clock className="h-4 w-4" /> },
  { value: 'confirmed', label: 'Đã xác nhận', icon: <CheckCircle className="h-4 w-4" /> },
  { value: 'processing', label: 'Đang xử lý', icon: <Package className="h-4 w-4" /> },
  { value: 'shipped', label: 'Đang giao', icon: <Truck className="h-4 w-4" /> },
  { value: 'delivered', label: 'Đã giao', icon: <CheckCircle className="h-4 w-4 text-green-500" /> },
  { value: 'cancelled', label: 'Đã hủy', icon: <XCircle className="h-4 w-4 text-red-500" /> },
];

const getStatusLabel = (status: OrderStatus): string => {
  const found = ORDER_STATUSES.find(s => s.value === status);
  return found?.label || status;
};

const getStatusBadgeVariant = (status: OrderStatus): "default" | "secondary" | "outline" | "destructive" => {
  switch (status) {
    case 'pending': return 'secondary';
    case 'confirmed': return 'default';
    case 'processing': return 'default';
    case 'shipped': return 'default';
    case 'delivered': return 'outline';
    case 'cancelled': return 'destructive';
    default: return 'outline';
  }
};

const getPaymentStatusLabel = (status: string): string => {
  switch (status) {
    case 'pending': return 'Chờ thanh toán';
    case 'paid': return 'Đã thanh toán';
    case 'refunded': return 'Đã hoàn tiền';
    case 'failed': return 'Thất bại';
    default: return status;
  }
};

const getPaymentMethodLabel = (method: string): string => {
  switch (method) {
    case 'cod': return 'Thanh toán khi nhận hàng (COD)';
    case 'bank_transfer': return 'Chuyển khoản ngân hàng';
    default: return method;
  }
};

interface OrderDetailDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  order: OnlineOrder | null;
  onlineStoreId: string;
  onStatusChange: (orderId: string, status: OrderStatus) => void;
}

export function OrderDetailDialog({
  isOpen,
  onOpenChange,
  order,
  onlineStoreId,
  onStatusChange,
}: OrderDetailDialogProps) {
  const [isUpdating, startTransition] = useTransition();

  if (!order) return null;

  const shippingAddress = typeof order.shippingAddress === 'string'
    ? JSON.parse(order.shippingAddress)
    : order.shippingAddress;

  const getNextStatus = (currentStatus: OrderStatus): OrderStatus | null => {
    const flow: OrderStatus[] = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];
    const currentIndex = flow.indexOf(currentStatus);
    if (currentIndex >= 0 && currentIndex < flow.length - 1) {
      return flow[currentIndex + 1];
    }
    return null;
  };

  const nextStatus = getNextStatus(order.status);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Đơn hàng {order.orderNumber}
            <Badge variant={getStatusBadgeVariant(order.status)}>
              {getStatusLabel(order.status)}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Đặt lúc {new Date(order.createdAt).toLocaleString('vi-VN')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Customer Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <User className="h-4 w-4" />
                Thông tin khách hàng
              </h4>
              <div className="text-sm space-y-1">
                <div className="font-medium">{order.customerName}</div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-3 w-3" />
                  {order.customerPhone}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-3 w-3" />
                  {order.customerEmail}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Địa chỉ giao hàng
              </h4>
              <div className="text-sm text-muted-foreground">
                {shippingAddress?.fullName && <div>{shippingAddress.fullName}</div>}
                {shippingAddress?.phone && <div>{shippingAddress.phone}</div>}
                <div>
                  {shippingAddress?.addressLine}, {shippingAddress?.ward}, {shippingAddress?.district}, {shippingAddress?.province}
                </div>
                {shippingAddress?.note && (
                  <div className="mt-1 italic">Ghi chú: {shippingAddress.note}</div>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Order Items */}
          <div>
            <h4 className="font-medium mb-3">Sản phẩm</h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sản phẩm</TableHead>
                  <TableHead className="text-center">SL</TableHead>
                  <TableHead className="text-right">Đơn giá</TableHead>
                  <TableHead className="text-right">Thành tiền</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.items?.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{item.productName}</div>
                        {item.productSku && (
                          <div className="text-sm text-muted-foreground">SKU: {item.productSku}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">{item.quantity}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(item.totalPrice)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <Separator />

          {/* Order Summary */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium">Thanh toán</h4>
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Phương thức:</span>
                  <span>{getPaymentMethodLabel(order.paymentMethod)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Trạng thái:</span>
                  <Badge variant={order.paymentStatus === 'paid' ? 'default' : 'secondary'}>
                    {getPaymentStatusLabel(order.paymentStatus)}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Tổng cộng</h4>
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tạm tính:</span>
                  <span>{formatCurrency(order.subtotal)}</span>
                </div>
                {(Number(order.discountAmount || 0) > 0) && (
                  <div className="flex justify-between text-green-600">
                    <span>Giảm giá:</span>
                    <span>-{formatCurrency(Number(order.discountAmount || 0))}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Phí vận chuyển:</span>
                  <span>{order.shippingFee > 0 ? formatCurrency(order.shippingFee) : 'Miễn phí'}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-medium text-lg">
                  <span>Tổng:</span>
                  <span className="text-primary">{formatCurrency(order.total)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          {(order.customerNote || order.note || order.internalNote) && (
            <>
              <Separator />
              <div className="space-y-2">
                {(order.customerNote || order.note) && (
                  <div>
                    <h4 className="font-medium text-sm">Ghi chú của khách:</h4>
                    <p className="text-sm text-muted-foreground">{order.customerNote || order.note}</p>
                  </div>
                )}
                {order.internalNote && (
                  <div>
                    <h4 className="font-medium text-sm">Ghi chú nội bộ:</h4>
                    <p className="text-sm text-muted-foreground">{order.internalNote}</p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Actions */}
          {order.status !== 'delivered' && order.status !== 'cancelled' && (
            <>
              <Separator />
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => onStatusChange(order.id, 'cancelled')}
                  disabled={isUpdating}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Hủy đơn
                </Button>
                {nextStatus && (
                  <Button
                    onClick={() => onStatusChange(order.id, nextStatus)}
                    disabled={isUpdating}
                  >
                    {ORDER_STATUSES.find(s => s.value === nextStatus)?.icon}
                    <span className="ml-2">
                      Chuyển sang "{getStatusLabel(nextStatus)}"
                    </span>
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
