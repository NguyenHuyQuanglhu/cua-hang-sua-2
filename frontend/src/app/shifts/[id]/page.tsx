'use client'

import { useEffect, useState } from 'react'
import { notFound, useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ChevronLeft,
  Clock,
  User,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Scale,
  Hash,
  Pencil,
  Calculator,
  Wallet,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatCurrency } from '@/lib/utils'
import { getShift, getShiftSales } from '../actions'
import type { Shift } from '@/lib/repositories/shift-repository'

interface Sale {
  id: string;
  invoiceNumber: string;
  customerId?: string;
  customerName?: string;
  transactionDate: string;
  finalAmount: number;
}

export default function ShiftDetailPage() {
  const params = useParams();
  const shiftId = params.id as string;

  const [shift, setShift] = useState<Shift | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      setError(null);

      try {
        const [shiftResult, salesResult] = await Promise.all([
          getShift(shiftId),
          getShiftSales(shiftId),
        ]);

        if (!shiftResult.success || !shiftResult.shift) {
          setError(shiftResult.error || 'Không tìm thấy ca làm việc');
          return;
        }

        setShift(shiftResult.shift as unknown as Shift);
        setSales((salesResult.data || []).map((item) => ({
          id: String(item.id ?? ''),
          invoiceNumber: String(item.invoiceNumber ?? ''),
          customerId: item.customerId ? String(item.customerId) : undefined,
          customerName: item.customerName ? String(item.customerName) : undefined,
          transactionDate: String(item.transactionDate ?? new Date().toISOString()),
          finalAmount: Number(item.finalAmount ?? 0),
        })));
      } catch (err) {
        setError('Đã xảy ra lỗi khi tải dữ liệu');
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [shiftId]);

  if (isLoading) {
    return <p>Đang tải...</p>;
  }

  if (error || !shift) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Lỗi</CardTitle>
          <CardDescription>{error || 'Không tìm thấy ca làm việc'}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild><Link href="/shifts">Quay lại</Link></Button>
        </CardContent>
      </Card>
    );
  }

  // Calculate expected cash in drawer
  // Formula: Starting Cash + Cash Sales + Cash Payments
  const expectedCashInDrawer = shift.totalCashInDrawer ?? 
    (shift.startingCash + (shift.cashSales || 0) + (shift.cashPayments || 0));
  
  // Cash difference = Actual Ending Cash - Expected Cash
  const cashDifference = shift.cashDifference ?? 
    (shift.endingCash !== undefined ? shift.endingCash - expectedCashInDrawer : 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" className="h-7 w-7" asChild>
          <Link href="/shifts">
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Quay lại</span>
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">
            Chi tiết Ca làm việc
          </h1>
          <p className="text-sm text-muted-foreground">
              Ca của {shift.userName} - Ngày {new Date(shift.startTime).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}
          </p>
        </div>
         <div className="ml-auto">
          <Button asChild>
            <Link href={`/shifts/${shift.id}/edit`}>
              <Pencil className="mr-2 h-4 w-4" />
              Sửa ca
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Báo cáo cuối ca</CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <div className="flex items-center gap-3 rounded-lg border p-3">
            <User className="h-6 w-6 text-muted-foreground" />
            <div>
              <p className="text-muted-foreground">Nhân viên</p>
              <p className="font-semibold">{shift.userName}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border p-3">
            <Clock className="h-6 w-6 text-muted-foreground" />
            <div>
              <p className="text-muted-foreground">Thời gian</p>
              <p className="font-semibold">
                {new Date(shift.startTime).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })} - 
                {shift.endTime ? new Date(shift.endTime).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : 'Đang hoạt động'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border p-3">
            <DollarSign className="h-6 w-6 text-green-500" />
            <div>
              <p className="text-muted-foreground">Tiền đầu ca</p>
              <p className="font-semibold">{formatCurrency(shift.startingCash)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border p-3">
            <TrendingUp className="h-6 w-6 text-primary" />
            <div>
              <p className="text-muted-foreground">Doanh thu bán hàng</p>
              <p className="font-semibold">{formatCurrency(shift.totalRevenue || 0)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border p-3">
            <TrendingDown className="h-6 w-6 text-yellow-500" />
            <div>
              <p className="text-muted-foreground">Tiền mặt thu trong ca</p>
              <p className="font-semibold">{formatCurrency(shift.cashSales || 0)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border p-3">
            <Wallet className="h-6 w-6 text-orange-500" />
            <div>
              <p className="text-muted-foreground">Thanh toán công nợ</p>
              <p className="font-semibold">{formatCurrency(shift.cashPayments || 0)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border p-3">
            <Calculator className="h-6 w-6 text-indigo-500" />
            <div>
              <p className="text-muted-foreground">Tiền mặt dự kiến</p>
              <p className="font-semibold">{formatCurrency(expectedCashInDrawer)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border p-3">
            <DollarSign className="h-6 w-6 text-blue-500" />
            <div>
              <p className="text-muted-foreground">Tiền cuối ca (Thực tế)</p>
              <p className="font-semibold">{formatCurrency(shift.endingCash || 0)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border p-3">
            <Scale className="h-6 w-6 text-muted-foreground" />
            <div>
              <p className="text-muted-foreground">Chênh lệch tiền mặt</p>
              <p className={`font-semibold ${cashDifference !== 0 ? (cashDifference > 0 ? 'text-green-600' : 'text-destructive') : ''}`}>
                {cashDifference > 0 ? '+' : ''}{formatCurrency(cashDifference)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border p-3">
            <Hash className="h-6 w-6 text-muted-foreground" />
            <div>
              <p className="text-muted-foreground">Số đơn hàng</p>
              <p className="font-semibold">{shift.salesCount}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cash Calculation Summary Card */}
      {shift.status === 'closed' && (
        <Card>
          <CardHeader>
            <CardTitle>Chi tiết tính toán tiền mặt</CardTitle>
            <CardDescription>
              Công thức: Tiền đầu ca + Tiền mặt thu trong ca + Thanh toán công nợ = Tiền mặt dự kiến
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-2 border-b">
                <span>Tiền đầu ca</span>
                <span className="font-medium">{formatCurrency(shift.startingCash)}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span>+ Tiền mặt thu trong ca</span>
                <span className="font-medium">{formatCurrency(shift.cashSales || 0)}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span>+ Thanh toán công nợ</span>
                <span className="font-medium">{formatCurrency(shift.cashPayments || 0)}</span>
              </div>
              <div className="flex justify-between py-2 border-b font-semibold">
                <span>= Tiền mặt dự kiến trong két</span>
                <span>{formatCurrency(expectedCashInDrawer)}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span>Tiền cuối ca (Thực tế)</span>
                <span className="font-medium">{formatCurrency(shift.endingCash || 0)}</span>
              </div>
              <div className={`flex justify-between py-2 font-semibold ${cashDifference !== 0 ? (cashDifference > 0 ? 'text-green-600' : 'text-destructive') : ''}`}>
                <span>Chênh lệch</span>
                <span>{cashDifference > 0 ? '+' : ''}{formatCurrency(cashDifference)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Các giao dịch trong ca</CardTitle>
          <CardDescription>
            Danh sách tất cả các đơn hàng được thực hiện trong ca làm việc này.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mã đơn hàng</TableHead>
                <TableHead>Khách hàng</TableHead>
                <TableHead>Thời gian</TableHead>
                <TableHead className="text-right">Tổng tiền</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sales.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    Không có đơn hàng nào trong ca này.
                  </TableCell>
                </TableRow>
              )}
              {sales.map((sale) => (
                <TableRow key={sale.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/sales/${sale.id}`}
                      className="hover:underline"
                    >
                      {sale.invoiceNumber}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {sale.customerName || 'Khách lẻ'}
                  </TableCell>
                  <TableCell>
                    {new Date(sale.transactionDate).toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(sale.finalAmount)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
