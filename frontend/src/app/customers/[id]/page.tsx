'use client';

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { ChevronLeft, Phone, Mail, MapPin, Cake, User, Landmark, Trophy, Gem, Star, Shield, AlertTriangle } from "lucide-react"

import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"

import { formatCurrency } from "@/lib/utils"
import { apiClient } from "@/lib/api-client"
import { PredictRiskForm } from "./components/predict-risk-form"
import { getCustomer, getCustomerDebt, CustomerDebtHistory } from "../actions"

// Customer data interface
interface CustomerData {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  customerType?: string;
  gender?: string;
  birthday?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankBranch?: string;
  creditLimit: number;
  currentDebt?: number;
  calculatedDebt?: number;
  totalDebt?: number;
  loyaltyTier?: string;
  loyaltyPoints?: number;
  lifetimePoints?: number;
  totalSpent?: number;
  totalPaid?: number;
}

const getTierIcon = (tier: string | undefined) => {
  switch (tier) {
    case 'diamond': return <Gem className="h-4 w-4 text-blue-500" />;
    case 'gold': return <Trophy className="h-4 w-4 text-yellow-500" />;
    case 'silver': return <Star className="h-4 w-4 text-slate-500" />;
    case 'bronze': return <Shield className="h-4 w-4 text-orange-700" />;
    default: return null;
  }
}

const getTierName = (tier: string | undefined) => {
  switch (tier) {
    case 'diamond': return 'Kim Cương';
    case 'gold': return 'Vàng';
    case 'silver': return 'Bạc';
    case 'bronze': return 'Đồng';
    default: return 'Chưa có hạng';
  }
}

export default function CustomerDetailPage() {
  const params = useParams();
  const id = params.id as string;
  
  const [customer, setCustomer] = useState<CustomerData | null>(null);
  const [history, setHistory] = useState<CustomerDebtHistory[]>([]);
  const [tierHistory, setTierHistory] = useState<Array<{
    id: string;
    type: string;
    title: string;
    message: string;
    customerId: string;
    customerName: string;
    oldTier: string;
    newTier: string;
    lifetimePoints: number;
    createdAt: string;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const tierHistoryPromise = apiClient.getTierHistory(id, 50).catch(() => ({
          success: false,
          data: [],
          total: 0,
        }));

        const [customerResult, debtResult, tierHistoryResult] = await Promise.all([
          getCustomer(id, { includeDebt: true, includeLoyalty: true }),
          getCustomerDebt(id, true),
          tierHistoryPromise,
        ]);

        if (!customerResult.success || !customerResult.customer) {
          setError(true);
          return;
        }

        setCustomer(customerResult.customer as unknown as CustomerData);
        setHistory(debtResult.history || []);
        
        if (tierHistoryResult.success && tierHistoryResult.data) {
          setTierHistory(tierHistoryResult.data);
        }
      } catch (err) {
        console.error('Error fetching customer:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Đang tải...</div>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="grid gap-4 md:gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Không thể truy cập chi tiết khách hàng</CardTitle>
            <CardDescription>
              Dữ liệu khách hàng không tồn tại hoặc đã có lỗi khi tải dữ liệu.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/customers">Quay lại danh sách khách hàng</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Separate sales and payments from history
  const salesHistory = history.filter(h => h.type === 'sale').sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const paymentsHistory = history.filter(h => h.type === 'payment').sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Calculate total debt: prioritize calculatedDebt > currentDebt > totalDebt > history's last runningBalance
  const lastHistoryBalance = history.length > 0
    ? [...history].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]?.runningBalance ?? 0
    : 0;
  const totalDebt = customer.calculatedDebt ?? customer.currentDebt ?? customer.totalDebt ?? lastHistoryBalance ?? 0;
  const creditLimit = customer.creditLimit ?? 0;
  const isOverLimit = creditLimit > 0 && totalDebt > creditLimit;

  // Calculate loyalty points from history (total spent)
  const totalSpent = customer.totalSpent || salesHistory.reduce((sum, s) => sum + s.amount, 0);
  const totalPaid = customer.totalPaid || paymentsHistory.reduce((sum, p) => sum + p.amount, 0);
  // Points = 1 point per 10,000 VND spent (configurable)
  const calculatedLifetimePoints = Math.floor(totalSpent / 10000);
  const displayLifetimePoints = customer.lifetimePoints || calculatedLifetimePoints;
  const displayLoyaltyPoints = customer.loyaltyPoints || displayLifetimePoints;

  return (
    <div className="grid gap-4 md:gap-8">
       <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" className="h-7 w-7" asChild>
          <Link href="/customers">
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Quay lại</span>
          </Link>
        </Button>
        <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0">
          {customer.name}
        </h1>
        <Badge variant={customer.customerType === 'business' ? 'default' : 'secondary'}>
          {customer.customerType === 'business' ? 'Doanh nghiệp' : 'Cá nhân'}
        </Badge>
        <div className="hidden items-center gap-2 md:ml-auto md:flex">
          <PredictRiskForm customer={customer} sales={salesHistory} payments={paymentsHistory} />
        </div>
      </div>

      {/* Credit Limit Warning */}
      {isOverLimit && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Cảnh báo vượt hạn mức tín dụng</AlertTitle>
          <AlertDescription>
            Khách hàng đã vượt hạn mức tín dụng. Nợ hiện tại: {formatCurrency(totalDebt)}, Hạn mức: {formatCurrency(creditLimit)}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Tổng nợ</CardDescription>
            <CardTitle className={`text-4xl ${totalDebt > 0 ? 'text-destructive' : 'text-primary'}`}>
              {formatCurrency(totalDebt)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">
              Hạn mức tín dụng: {formatCurrency(creditLimit)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Còn lại: {formatCurrency(Math.max(0, creditLimit - totalDebt))}
            </div>
          </CardContent>
        </Card>
         <Card>
          <CardHeader className="pb-2">
            <CardDescription>Khách hàng thân thiết</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              {getTierIcon(customer.loyaltyTier)}
              {getTierName(customer.loyaltyTier)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">
              Điểm tích lũy: {displayLoyaltyPoints.toLocaleString()} điểm
            </div>
            <div className="text-xs text-muted-foreground">
              Tổng điểm: {displayLifetimePoints.toLocaleString()} điểm
            </div>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Thông tin khách hàng</CardTitle>
            <CardDescription>
                Chi tiết liên hệ và thông tin cá nhân.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span>{customer.email || 'Chưa có'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{customer.phone || 'Chưa có'}</span>
            </div>
            <div className="flex items-center gap-2 col-span-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{customer.address ? String(customer.address) : 'Chưa có'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Cake className="h-4 w-4 text-muted-foreground" />
              <span>{customer.birthday ? new Date(String(customer.birthday)).toLocaleDateString('vi-VN') : 'Chưa có'}</span>
            </div>
             <div className="flex items-center gap-2">
               <User className="h-4 w-4 text-muted-foreground" />
              <span className="capitalize">{customer.gender === 'male' ? 'Nam' : customer.gender === 'female' ? 'Nữ' : 'Khác'}</span>
            </div>
             <div className="flex items-center gap-2 mt-2 pt-2 border-t col-span-2">
               <Landmark className="h-4 w-4 text-muted-foreground" />
              <span>{customer.bankName ? `${customer.bankName} - ${customer.bankAccountNumber}` : 'Chưa có thông tin ngân hàng'}</span>
            </div>
            {customer.bankBranch && (
              <div className="flex items-center gap-2 col-span-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>Chi nhánh: {String(customer.bankBranch)}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>


      {/* Debt History */}
      <Card>
        <CardHeader>
          <CardTitle>Lịch sử công nợ</CardTitle>
          <CardDescription>Tất cả giao dịch mua hàng và thanh toán của khách hàng.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">ID</TableHead>
                <TableHead>Ngày</TableHead>
                <TableHead>Loại</TableHead>
                <TableHead>Mô tả</TableHead>
                <TableHead className="text-right">Số tiền</TableHead>
                <TableHead className="text-right">Số dư</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.length > 0 ? (
                [...history].reverse().map(item => (
                  <TableRow key={`${item.type}-${item.id}`}>
                    <TableCell className="font-medium">{item.id.slice(-6).toUpperCase()}</TableCell>
                    <TableCell>{new Date(item.date).toLocaleDateString('vi-VN')}</TableCell>
                    <TableCell>
                      <Badge variant={item.type === 'sale' ? 'destructive' : 'default'}>
                        {item.type === 'sale' ? 'Mua hàng' : 'Thanh toán'}
                      </Badge>
                    </TableCell>
                    <TableCell>{item.description}</TableCell>
                    <TableCell className={`text-right ${item.type === 'sale' ? 'text-destructive' : 'text-green-600'}`}>
                      {item.type === 'sale' ? '+' : '-'}{formatCurrency(Math.abs(item.amount))}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(item.runningBalance ?? 0)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center h-24">Không có lịch sử công nợ.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle>Lịch sử thanh toán</CardTitle>
          <CardDescription>Hồ sơ tất cả các khoản thanh toán của khách hàng.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">ID</TableHead>
                <TableHead>Ngày</TableHead>
                <TableHead>Ghi chú</TableHead>
                <TableHead className="text-right">Số tiền</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paymentsHistory.length > 0 ? (
                paymentsHistory.map(payment => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium">{payment.id.slice(-6).toUpperCase()}</TableCell>
                    <TableCell>{new Date(payment.date).toLocaleDateString('vi-VN')}</TableCell>
                    <TableCell>{payment.description}</TableCell>
                    <TableCell className="text-right text-green-600">{formatCurrency(Math.abs(payment.amount))}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center h-24">Không tìm thấy thanh toán nào.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Tier Upgrade History */}
      <Card>
        <CardHeader>
          <CardTitle>Lịch sử lên hạng</CardTitle>
          <CardDescription>Các lần khách hàng được nâng cấp hạng thành viên.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">Ngày</TableHead>
                <TableHead>Từ hạng</TableHead>
                <TableHead>Lên hạng</TableHead>
                <TableHead className="text-right">Điểm tích lũy</TableHead>
                <TableHead>Ghi chú</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tierHistory.length > 0 ? (
                tierHistory.map(tier => {
                  const getTierBadge = (tierName: string) => {
                    switch (tierName) {
                      case 'diamond': return <Badge className="bg-blue-600">Kim Cương</Badge>;
                      case 'gold': return <Badge className="bg-yellow-600">Vàng</Badge>;
                      case 'silver': return <Badge className="bg-slate-600">Bạc</Badge>;
                      case 'bronze': return <Badge className="bg-orange-700">Đồng</Badge>;
                      default: return <Badge>{tierName}</Badge>;
                    }
                  };
                  
                  return (
                    <TableRow key={tier.id}>
                      <TableCell className="font-medium">{new Date(tier.createdAt).toLocaleDateString('vi-VN')}</TableCell>
                      <TableCell>{getTierBadge(tier.oldTier)}</TableCell>
                      <TableCell>{getTierBadge(tier.newTier)}</TableCell>
                      <TableCell className="text-right">{tier.lifetimePoints.toLocaleString()} điểm</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{tier.message}</TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24">Khách hàng chưa được lên hạng.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
