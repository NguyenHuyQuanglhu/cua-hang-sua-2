'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useStorefront } from '../layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { ShoppingBag, CreditCard, Banknote, Loader2 } from 'lucide-react';

interface ShippingAddress {
  fullName: string;
  phone: string;
  province: string;
  district: string;
  ward: string;
  addressLine: string;
  note?: string;
}

type PaymentMethod = 'cod' | 'bank_transfer';

const paymentMethods = [
  { id: 'cod', name: 'Thanh toán khi nhận hàng (COD)', icon: Banknote },
  { id: 'bank_transfer', name: 'Chuyển khoản ngân hàng', icon: CreditCard },
];

export default function CheckoutPage() {
  const router = useRouter();
  const { store, cart, customer, refreshCart } = useStorefront();
  const { toast } = useToast();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shippingFee, setShippingFee] = useState<number | null>(null);
  const [isCalculatingShipping, setIsCalculatingShipping] = useState(false);
  
  // Form state
  const [customerInfo, setCustomerInfo] = useState({
    email: customer?.email || '',
    name: customer ? `${customer.firstName} ${customer.lastName}` : '',
    phone: customer?.phone || '',
  });
  
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress>({
    fullName: customer ? `${customer.firstName} ${customer.lastName}` : '',
    phone: customer?.phone || '',
    province: '',
    district: '',
    ward: '',
    addressLine: '',
    note: '',
  });
  
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod');
  const [customerNote, setCustomerNote] = useState('');

  // Update form when customer data loads
  useEffect(() => {
    if (customer) {
      setCustomerInfo({
        email: customer.email,
        name: `${customer.firstName} ${customer.lastName}`,
        phone: customer.phone || '',
      });
      setShippingAddress(prev => ({
        ...prev,
        fullName: `${customer.firstName} ${customer.lastName}`,
        phone: customer.phone || '',
      }));
    }
  }, [customer]);

  // Redirect if cart is empty
  useEffect(() => {
    if (cart && cart.items.length === 0) {
      router.push(`/store/${store?.slug}/cart`);
    }
  }, [cart, store?.slug, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!store?.slug || !cart || cart.items.length === 0) return;

    // Validate required fields
    if (!customerInfo.email || !customerInfo.name || !customerInfo.phone) {
      toast({
        title: 'Lỗi',
        description: 'Vui lòng điền đầy đủ thông tin khách hàng',
        variant: 'destructive',
      });
      return;
    }

    if (!shippingAddress.fullName || !shippingAddress.phone || 
        !shippingAddress.province || !shippingAddress.district || 
        !shippingAddress.ward || !shippingAddress.addressLine) {
      toast({
        title: 'Lỗi',
        description: 'Vui lòng điền đầy đủ địa chỉ giao hàng',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/storefront/${store.slug}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerEmail: customerInfo.email,
          customerName: customerInfo.name,
          customerPhone: customerInfo.phone,
          shippingAddress,
          paymentMethod,
          customerNote,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        await refreshCart();
        router.push(`/store/${store.slug}/order-confirmation/${data.order.orderNumber}`);
      } else {
        toast({
          title: 'Lỗi',
          description: data.error || 'Không thể đặt hàng',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast({
        title: 'Lỗi',
        description: 'Đã xảy ra lỗi khi đặt hàng',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Empty cart state
  if (!cart || cart.items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto text-center">
          <ShoppingBag className="h-16 w-16 mx-auto text-gray-300 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Giỏ hàng trống</h1>
          <p className="text-gray-500 mb-6">
            Bạn cần thêm sản phẩm vào giỏ hàng trước khi thanh toán
          </p>
          <Link href={`/store/${store?.slug}/products`}>
            <Button style={{ backgroundColor: store?.primaryColor }} className="text-white">
              Tiếp tục mua sắm
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const total = cart.subtotal - cart.discountAmount + (shippingFee || 0);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8">Thanh toán</h1>

      <form onSubmit={handleSubmit}>
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Checkout Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer Information */}
            <Card>
              <CardHeader>
                <CardTitle>Thông tin khách hàng</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={customerInfo.email}
                      onChange={(e) => setCustomerInfo(prev => ({ ...prev, email: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name">Họ tên *</Label>
                    <Input
                      id="name"
                      value={customerInfo.name}
                      onChange={(e) => setCustomerInfo(prev => ({ ...prev, name: e.target.value }))}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Số điện thoại *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={customerInfo.phone}
                    onChange={(e) => setCustomerInfo(prev => ({ ...prev, phone: e.target.value }))}
                    required
                  />
                </div>
              </CardContent>
            </Card>

            {/* Shipping Address */}
            <Card>
              <CardHeader>
                <CardTitle>Địa chỉ giao hàng</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Họ tên người nhận *</Label>
                    <Input
                      id="fullName"
                      value={shippingAddress.fullName}
                      onChange={(e) => setShippingAddress(prev => ({ ...prev, fullName: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="shippingPhone">Số điện thoại *</Label>
                    <Input
                      id="shippingPhone"
                      type="tel"
                      value={shippingAddress.phone}
                      onChange={(e) => setShippingAddress(prev => ({ ...prev, phone: e.target.value }))}
                      required
                    />
                  </div>
                </div>
                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="province">Tỉnh/Thành phố *</Label>
                    <Input
                      id="province"
                      value={shippingAddress.province}
                      onChange={(e) => setShippingAddress(prev => ({ ...prev, province: e.target.value }))}
                      placeholder="VD: Hồ Chí Minh"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="district">Quận/Huyện *</Label>
                    <Input
                      id="district"
                      value={shippingAddress.district}
                      onChange={(e) => setShippingAddress(prev => ({ ...prev, district: e.target.value }))}
                      placeholder="VD: Quận 1"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ward">Phường/Xã *</Label>
                    <Input
                      id="ward"
                      value={shippingAddress.ward}
                      onChange={(e) => setShippingAddress(prev => ({ ...prev, ward: e.target.value }))}
                      placeholder="VD: Phường Bến Nghé"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="addressLine">Địa chỉ chi tiết *</Label>
                  <Input
                    id="addressLine"
                    value={shippingAddress.addressLine}
                    onChange={(e) => setShippingAddress(prev => ({ ...prev, addressLine: e.target.value }))}
                    placeholder="Số nhà, tên đường..."
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="addressNote">Ghi chú địa chỉ</Label>
                  <Input
                    id="addressNote"
                    value={shippingAddress.note || ''}
                    onChange={(e) => setShippingAddress(prev => ({ ...prev, note: e.target.value }))}
                    placeholder="VD: Gần chợ, cổng màu xanh..."
                  />
                </div>
              </CardContent>
            </Card>

            {/* Payment Method */}
            <Card>
              <CardHeader>
                <CardTitle>Phương thức thanh toán</CardTitle>
              </CardHeader>
              <CardContent>
                <RadioGroup
                  value={paymentMethod}
                  onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}
                  className="space-y-3"
                >
                  {paymentMethods.map((method) => (
                    <div
                      key={method.id}
                      className={`flex items-center space-x-3 border rounded-lg p-4 cursor-pointer transition-colors ${
                        paymentMethod === method.id 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      style={paymentMethod === method.id ? { borderColor: store?.primaryColor, backgroundColor: `${store?.primaryColor}10` } : {}}
                      onClick={() => setPaymentMethod(method.id as PaymentMethod)}
                    >
                      <RadioGroupItem value={method.id} id={method.id} />
                      <method.icon className="h-5 w-5 text-gray-600" />
                      <Label htmlFor={method.id} className="flex-1 cursor-pointer">
                        {method.name}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </CardContent>
            </Card>

            {/* Order Note */}
            <Card>
              <CardHeader>
                <CardTitle>Ghi chú đơn hàng</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={customerNote}
                  onChange={(e) => setCustomerNote(e.target.value)}
                  placeholder="Ghi chú cho đơn hàng (không bắt buộc)"
                  rows={3}
                />
              </CardContent>
            </Card>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle>Đơn hàng của bạn</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Cart Items */}
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {cart.items.map((item) => (
                    <div key={item.id} className="flex gap-3">
                      <div className="w-16 h-16 flex-shrink-0 bg-gray-100 rounded overflow-hidden">
                        {item.images?.[0] ? (
                          <Image
                            src={item.images[0]}
                            alt={item.productName}
                            width={64}
                            height={64}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                            Ảnh
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium line-clamp-2">{item.productName}</p>
                        <p className="text-sm text-gray-500">x{item.quantity}</p>
                      </div>
                      <p className="text-sm font-medium">
                        {formatCurrency(item.totalPrice)}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Tạm tính</span>
                    <span>{formatCurrency(cart.subtotal)} {store?.currency}</span>
                  </div>
                  
                  {cart.discountAmount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Giảm giá</span>
                      <span>-{formatCurrency(cart.discountAmount)} {store?.currency}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Phí vận chuyển</span>
                    <span>
                      {shippingFee !== null 
                        ? `${formatCurrency(shippingFee)} ${store?.currency}`
                        : 'Tính sau'
                      }
                    </span>
                  </div>
                  
                  <div className="border-t pt-2">
                    <div className="flex justify-between font-semibold text-lg">
                      <span>Tổng cộng</span>
                      <span style={{ color: store?.primaryColor }}>
                        {formatCurrency(total)} {store?.currency}
                      </span>
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full text-white"
                  size="lg"
                  style={{ backgroundColor: store?.primaryColor }}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Đang xử lý...
                    </>
                  ) : (
                    'Đặt hàng'
                  )}
                </Button>

                <p className="text-xs text-gray-500 text-center">
                  Bằng việc đặt hàng, bạn đồng ý với điều khoản sử dụng của chúng tôi
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
