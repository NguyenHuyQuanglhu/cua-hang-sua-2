'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarIcon, TrendingUp, Users, DollarSign, ShoppingCart } from 'lucide-react'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { DateRange } from 'react-day-picker'
import { useStore } from '@/contexts/store-context'
import { apiClient } from '@/lib/api-client'
import { formatCurrency, cn } from '@/lib/utils'

interface TrendData {
  date?: string
  year?: number
  week?: number
  month?: number
  transactionCount: number
  totalSales: number
  totalRevenue: number
  totalDiscounts: number
  averageTransactionValue: number
  uniqueCustomers: number
}

export default function SalesTrendsPage() {
  const { currentStore } = useStore()
  const [isLoading, setIsLoading] = useState(true)
  const [data, setData] = useState<TrendData[]>([])
  const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month'>('day')
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  })

  useEffect(() => {
    if (currentStore?.id) {
      fetchData()
    }
  }, [currentStore, dateRange, groupBy])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const response = await apiClient.getSalesTrendsReport({
        dateFrom: dateRange?.from?.toISOString().split('T')[0],
        dateTo: dateRange?.to?.toISOString().split('T')[0],
        groupBy,
      })
      setData((response as any).data || [])
    } catch (error) {
      console.error('Error fetching sales trends:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const totals = data.reduce(
    (acc, item) => ({
      transactionCount: acc.transactionCount + item.transactionCount,
      totalRevenue: acc.totalRevenue + item.totalRevenue,
      totalDiscounts: acc.totalDiscounts + item.totalDiscounts,
      uniqueCustomers: Math.max(acc.uniqueCustomers, item.uniqueCustomers),
    }),
    { transactionCount: 0, totalRevenue: 0, totalDiscounts: 0, uniqueCustomers: 0 }
  )

  const avgTransactionValue = totals.transactionCount > 0 ? totals.totalRevenue / totals.transactionCount : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Xu hướng bán hàng</h1>
          <p className="text-muted-foreground">Phân tích xu hướng doanh số theo thời gian</p>
        </div>
        <div className="flex gap-2">
          <Select value={groupBy} onValueChange={(v: any) => setGroupBy(v)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Theo ngày</SelectItem>
              <SelectItem value="week">Theo tuần</SelectItem>
              <SelectItem value="month">Theo tháng</SelectItem>
            </SelectContent>
          </Select>
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

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng đơn hàng</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.transactionCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng doanh thu</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totals.totalRevenue)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Giá trị TB/đơn</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(avgTransactionValue)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Khách hàng</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.uniqueCustomers}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Biểu đồ xu hướng</CardTitle>
          <CardDescription>Doanh thu và số đơn hàng theo {groupBy === 'day' ? 'ngày' : groupBy === 'week' ? 'tuần' : 'tháng'}</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-64">Đang tải...</div>
          ) : data.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-muted-foreground">Chưa có dữ liệu</div>
          ) : (
            <div className="space-y-4">
              {data.map((item, index) => {
                const label = item.date
                  ? format(new Date(item.date), 'dd/MM/yyyy')
                  : item.week
                  ? `Tuần ${item.week}/${item.year}`
                  : `Tháng ${item.month}/${item.year}`
                const maxRevenue = Math.max(...data.map((d) => d.totalRevenue))
                const width = maxRevenue > 0 ? (item.totalRevenue / maxRevenue) * 100 : 0

                return (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{label}</span>
                      <span className="text-muted-foreground">{item.transactionCount} đơn</span>
                    </div>
                    <div className="relative h-8 bg-secondary rounded-full overflow-hidden">
                      <div className="absolute inset-y-0 left-0 bg-primary rounded-full flex items-center justify-end px-3" style={{ width: `${width}%` }}>
                        <span className="text-xs font-medium text-primary-foreground">{formatCurrency(item.totalRevenue)}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
