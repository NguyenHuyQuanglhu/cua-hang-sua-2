'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarIcon, DollarSign, ShoppingCart, TrendingUp, FileDown } from 'lucide-react'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { DateRange } from 'react-day-picker'
import { useStore } from '@/contexts/store-context'
import { apiClient } from '@/lib/api-client'
import { formatCurrency, cn } from '@/lib/utils'

interface SaleDetail {
  id: string
  invoiceNumber: string
  transactionDate: string
  totalAmount: number
  vatAmount: number
  discount: number
  finalAmount: number
  status: string
  customerName?: string
}

interface SalesSummary {
  totalOrders: number
  totalRevenue: number
  totalVat: number
  totalDiscount: number
  netRevenue: number
}

interface DailySummary {
  date: string
  totalSales: number
  totalRevenue: number
  totalVat: number
  totalDiscount: number
  netRevenue: number
}

export default function SalesReportPage() {
  const { currentStore } = useStore()
  const [isLoading, setIsLoading] = useState(true)
  const [summary, setSummary] = useState<SalesSummary | null>(null)
  const [dailySummary, setDailySummary] = useState<DailySummary[]>([])
  const [details, setDetails] = useState<SaleDetail[]>([])
  const [showDetails, setShowDetails] = useState(false)
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  })

  useEffect(() => {
    if (currentStore?.id) {
      fetchData()
    }
  }, [currentStore, dateRange])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const response = await apiClient.getSalesReport({
        dateFrom: dateRange?.from?.toISOString().split('T')[0],
        dateTo: dateRange?.to?.toISOString().split('T')[0],
        includeDetails: showDetails,
      })

      const data = response as any
      setSummary(data.summary)
      setDailySummary(data.dailySummary || [])
      if (showDetails) {
        setDetails(data.details || [])
      }
    } catch (error) {
      console.error('Error fetching sales report:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Báo cáo doanh thu</h1>
          <p className="text-muted-foreground">Chi tiết doanh thu và đơn hàng</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowDetails(!showDetails)}>
            {showDetails ? 'Ẩn chi tiết' : 'Xem chi tiết'}
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn('justify-start text-left font-normal', !dateRange && 'text-muted-foreground')}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, 'dd/MM/yyyy')} - {format(dateRange.to, 'dd/MM/yyyy')}
                    </>
                  ) : (
                    format(dateRange.from, 'dd/MM/yyyy')
                  )
                ) : (
                  <span>Chọn khoảng thời gian</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar mode="range" selected={dateRange} onSelect={setDateRange} numberOfMonths={2} />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">Đang tải...</div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tổng đơn hàng</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary?.totalOrders || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tổng doanh thu</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(summary?.totalRevenue || 0)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tổng giảm giá</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(summary?.totalDiscount || 0)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Doanh thu thuần</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(summary?.netRevenue || 0)}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Doanh thu theo ngày</CardTitle>
              <CardDescription>Tổng hợp doanh thu từng ngày trong khoảng thời gian đã chọn</CardDescription>
            </CardHeader>
            <CardContent>
              {dailySummary.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">Chưa có dữ liệu</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ngày</TableHead>
                      <TableHead className="text-right">Số đơn</TableHead>
                      <TableHead className="text-right">Doanh thu</TableHead>
                      <TableHead className="text-right">Giảm giá</TableHead>
                      <TableHead className="text-right">Doanh thu thuần</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dailySummary.map((day) => (
                      <TableRow key={day.date}>
                        <TableCell>{format(new Date(day.date), 'dd/MM/yyyy')}</TableCell>
                        <TableCell className="text-right">{day.totalSales}</TableCell>
                        <TableCell className="text-right">{formatCurrency(day.totalRevenue)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(day.totalDiscount)}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(day.netRevenue)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {showDetails && details.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Chi tiết đơn hàng</CardTitle>
                <CardDescription>Danh sách tất cả đơn hàng trong khoảng thời gian đã chọn</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mã đơn</TableHead>
                      <TableHead>Ngày</TableHead>
                      <TableHead>Khách hàng</TableHead>
                      <TableHead className="text-right">Tổng tiền</TableHead>
                      <TableHead className="text-right">Giảm giá</TableHead>
                      <TableHead className="text-right">Thành tiền</TableHead>
                      <TableHead>Trạng thái</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {details.map((sale) => (
                      <TableRow key={sale.id}>
                        <TableCell className="font-medium">{sale.invoiceNumber}</TableCell>
                        <TableCell>{format(new Date(sale.transactionDate), 'dd/MM/yyyy HH:mm')}</TableCell>
                        <TableCell>{sale.customerName || 'Khách lẻ'}</TableCell>
                        <TableCell className="text-right">{formatCurrency(sale.totalAmount)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(sale.discount)}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(sale.finalAmount)}</TableCell>
                        <TableCell>
                          <span className={cn('px-2 py-1 rounded text-xs', sale.status === 'printed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800')}>
                            {sale.status === 'printed' ? 'Đã in' : 'Chờ xử lý'}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
