'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarIcon, Users, DollarSign, ShoppingCart, TrendingUp } from 'lucide-react'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { DateRange } from 'react-day-picker'
import { useStore } from '@/contexts/store-context'
import { apiClient } from '@/lib/api-client'
import { formatCurrency, cn } from '@/lib/utils'

interface CustomerAnalytics {
  customerId: string
  fullName: string
  phone: string
  email: string
  customerType: string
  loyaltyTier: string
  totalDebt: number
  totalPaid: number
  totalPurchases: number
  totalSpent: number
  averageOrderValue: number
  lastPurchaseDate: string
  firstPurchaseDate: string
  daysSinceLastPurchase: number
  customerLifetimeValue: number
}

export default function CustomerAnalyticsPage() {
  const { currentStore } = useStore()
  const [isLoading, setIsLoading] = useState(true)
  const [data, setData] = useState<CustomerAnalytics[]>([])
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
      const response = await apiClient.getCustomerAnalyticsReport({
        dateFrom: dateRange?.from?.toISOString().split('T')[0],
        dateTo: dateRange?.to?.toISOString().split('T')[0],
        limit: 50,
      })
      setData((response as any).data || [])
    } catch (error) {
      console.error('Error fetching customer analytics:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const totals = data.reduce(
    (acc, item) => ({
      totalCustomers: acc.totalCustomers + 1,
      totalPurchases: acc.totalPurchases + item.totalPurchases,
      totalSpent: acc.totalSpent + item.totalSpent,
      totalCLV: acc.totalCLV + item.customerLifetimeValue,
    }),
    { totalCustomers: 0, totalPurchases: 0, totalSpent: 0, totalCLV: 0 }
  )

  const avgOrderValue = totals.totalPurchases > 0 ? totals.totalSpent / totals.totalPurchases : 0
  const avgCLV = totals.totalCustomers > 0 ? totals.totalCLV / totals.totalCustomers : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Phân tích khách hàng</h1>
          <p className="text-muted-foreground">Phân tích hành vi và giá trị khách hàng</p>
        </div>
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

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng khách hàng</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.totalCustomers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng chi tiêu</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totals.totalSpent)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Giá trị TB/đơn</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(avgOrderValue)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CLV trung bình</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(avgCLV)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top khách hàng</CardTitle>
          <CardDescription>50 khách hàng có giá trị cao nhất</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-64">Đang tải...</div>
          ) : data.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-muted-foreground">Chưa có dữ liệu</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Khách hàng</TableHead>
                  <TableHead>Loại</TableHead>
                  <TableHead className="text-right">Số đơn</TableHead>
                  <TableHead className="text-right">Tổng chi</TableHead>
                  <TableHead className="text-right">TB/đơn</TableHead>
                  <TableHead className="text-right">CLV</TableHead>
                  <TableHead className="text-right">Lần mua cuối</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((item) => (
                  <TableRow key={item.customerId}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{item.fullName}</div>
                        <div className="text-xs text-muted-foreground">{item.phone}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs">
                        <div>{item.customerType || 'Thường'}</div>
                        {item.loyaltyTier && <div className="text-muted-foreground">{item.loyaltyTier}</div>}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{item.totalPurchases}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.totalSpent)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.averageOrderValue)}</TableCell>
                    <TableCell className="text-right">
                      <span className={item.customerLifetimeValue >= 0 ? 'text-green-600' : 'text-red-600'}>{formatCurrency(item.customerLifetimeValue)}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="text-xs">
                        {item.lastPurchaseDate ? (
                          <>
                            <div>{format(new Date(item.lastPurchaseDate), 'dd/MM/yyyy')}</div>
                            <div className="text-muted-foreground">{item.daysSinceLastPurchase} ngày trước</div>
                          </>
                        ) : (
                          '-'
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
