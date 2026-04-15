'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useStorefront } from '../../layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { CheckCircle, Copy, Package, CreditCard, Banknote, Wallet } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface OrderDetails {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  customerEmail: string;
  customerName: string;
  customerPhone: string;
  shippingAddress: {
    fullName: string;
    phone: string;
    province: string;
    district: string;
    ward: string;
    addressLine: string;
    note?: string;
  };
  subtotal: number;
  shippingFee: number;
  discountAmount: number;
  total: number;
  createdAt: string;
  items: Array<{
    productName: string;
    productSku?: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
}

// Bank account info for bank transfer
const bankInfo = {
  bankName: 'Vietcombank',
  accountNumber: '1234567890',
  accountName: 'CONG TY TNHH ABC',
  branch: 'Chi nhánh Hồ Chí Minh',
};

export default function OrderConfirmationPage() {
  const params = useParams();
  const { store } = useStorefront();
  const { toast } = useToast();
  
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const orderNumber = params.orderNumber as string;

  useEffect(() => {
    if (!store?.slug || !orderNumber) return;

    const fetchOrder = async () => {
      try {
        const res = await fetch(`/api/storefront/${store.slug}/orders/${orderNumber}`);
        if (res.ok) {
          const data = await res.json();
          setOrder(data.order);
        } else {
          // Fallback to basic info if order not found
          setOrder({
            id: '',
            orderNumber,
            status: 'pending',
            paymentStatus: 'pending',
            paymentMethod: 'cod',
            customerEmail: '',
            customerName: '',
            customerPhone: '',
            shippingAddress: {
              fullName: '',
              phone: '',
              province: '',
              district: '',
              ward: '',
              addressLine: '',
            },
            subtotal: 0,
            shippingFee: 0,
            discountAmount: 0,
            total: 0,
            createdAt: new Date().toISOString(),
            items: [],
          });
        }
      } catch (error) {
        console.error('Error fetching order:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrder();
  }, [store?.slug, orderNumber]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Đã sao chép',
      description: `${label} đã được sao chép vào clipboard`,
    });
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'bank_transfer':
        return CreditCard;
      default:
        return Banknote;
    }
  };

  const getPaymentMethodName = (method: string) => {
    switch (method) {
      case 'cod':
        return 'Thanh toán khi nhận hàng (COD)';
      case 'bank_transfer':
        return 'Chuyển khoản ngân hàng';
      default:
        return method;
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-16 w-16 bg-gray-200 rounded-full mx-auto" />
            <div className="h-8 bg-gray-200 rounded w-3/4 mx-auto" />
            <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 md:py-16">
      <div className="max-w-2xl mx-auto">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div 
            className="h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: `${store?.secondaryColor || '#10B981'}20` }}
          >
            <CheckCircle 
              className="h-10 w-10" 
              style={{ color: store?.secondaryColor || '#10B981' }}
            />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            Đặt hàng thành công!
          </h1>
          <p className="text-gray-600">
            Cảm ơn bạn đã đặt hàng. Chúng tôi sẽ liên hệ với bạn sớm nhất.
          </p>
        </div>

        {/* Order Number */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Mã đơn hàng</p>
                <p className="text-xl font-bold" style={{ color: store?.primaryColor }}>
                  {orderNumber}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(orderNumber, 'Mã đơn hàng')}
              >
                <Copy className="h-4 w-4 mr-1" />
                Sao chép
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Payment Instructions for Bank Transfer */}
        {order?.paymentMethod === 'bank_transfer' && (
          <Card className="mb-6 border-yellow-200 bg-yellow-50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Thông tin chuyển khoản
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">
                Vui lòng chuyển khoản theo thông tin bên dưới. Đơn hàng sẽ được xử lý sau khi chúng tôi xác nhận thanh toán.
              </p>
              
              <div className="bg-white rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Ngân hàng</span>
                  <span className="font-medium">{bankInfo.bankName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Số tài khoản</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{bankInfo.accountNumber}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => copyToClipboard(bankInfo.accountNumber, 'Số tài khoản')}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Chủ tài khoản</span>
                  <span className="font-medium">{bankInfo.accountName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Chi nhánh</span>
                  <span className="font-medium">{bankInfo.branch}</span>
                </div>
                <div className="border-t pt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Nội dung chuyển khoản</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-blue-600">{orderNumber}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => copyToClipboard(orderNumber, 'Nội dung chuyển khoản')}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-xs text-yellow-700">
                ⚠️ Vui lòng ghi đúng nội dung chuyển khoản để đơn hàng được xử lý nhanh chóng.
              </p>
            </CardContent>
          </Card>
        )}

        {/* COD Instructions */}
        {order?.paymentMethod === 'cod' && (
          <Card className="mb-6 border-green-200 bg-green-50">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <Banknote className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-medium text-green-800">Thanh toán khi nhận hàng</p>
                  <p className="text-sm text-green-700 mt-1">
                    Bạn sẽ thanh toán cho nhân viên giao hàng khi nhận được đơn hàng.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* What's Next */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="h-5 w-5" />
              Tiếp theo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <span 
                  className="flex-shrink-0 h-6 w-6 rounded-full flex items-center justify-center text-white text-xs font-medium"
                  style={{ backgroundColor: store?.primaryColor }}
                >
                  1
                </span>
                <span>Chúng tôi sẽ xác nhận đơn hàng qua email hoặc điện thoại</span>
              </li>
              <li className="flex items-start gap-3">
                <span 
                  className="flex-shrink-0 h-6 w-6 rounded-full flex items-center justify-center text-white text-xs font-medium"
                  style={{ backgroundColor: store?.primaryColor }}
                >
                  2
                </span>
                <span>Đơn hàng sẽ được đóng gói và giao cho đơn vị vận chuyển</span>
              </li>
              <li className="flex items-start gap-3">
                <span 
                  className="flex-shrink-0 h-6 w-6 rounded-full flex items-center justify-center text-white text-xs font-medium"
                  style={{ backgroundColor: store?.primaryColor }}
                >
                  3
                </span>
                <span>Bạn sẽ nhận được thông báo khi đơn hàng được giao</span>
              </li>
            </ol>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Link href={`/store/${store?.slug}/products`} className="flex-1">
            <Button variant="outline" className="w-full">
              Tiếp tục mua sắm
            </Button>
          </Link>
          <Link href={`/store/${store?.slug}/account/orders`} className="flex-1">
            <Button 
              className="w-full text-white"
              style={{ backgroundColor: store?.primaryColor }}
            >
              Xem đơn hàng của tôi
            </Button>
          </Link>
        </div>

        {/* Contact */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>
            Có thắc mắc? Liên hệ với chúng tôi qua{' '}
            {store?.contactEmail && (
              <a 
                href={`mailto:${store.contactEmail}`}
                className="text-blue-600 hover:underline"
              >
                {store.contactEmail}
              </a>
            )}
            {store?.contactPhone && (
              <>
                {' hoặc '}
                <a 
                  href={`tel:${store.contactPhone}`}
                  className="text-blue-600 hover:underline"
                >
                  {store.contactPhone}
                </a>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
