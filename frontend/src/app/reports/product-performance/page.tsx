'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarIcon, TrendingUp, Package, DollarSign } from 'lucide-react'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { DateRange } from 'react-day-picker'
import { useStore } from '@/contexts/store-context'
import { apiClient } from '@/lib/api-client'
import { formatCurrency, cn } from '@/lib/utils'

interface ProductPerformance {
  productId: string
  productName: string
  sku: string
  categoryName: string
  costPrice: number
  sellingPrice: number
  timesSold: number
  totalQuantitySold: number
  totalRevenue: number
  totalCost: number
  totalProfit: number
  averageSellingPrice: number
  profitMarginPercentage: number
  currentStock: number
  lowStockThreshold: number
  lastSaleDate: string
}

export default function ProductPerformancePage() {
  const { currentStore } = useStore()
  const [isLoading, setIsLoading] = useState(true)
  const [data, setData] = useState<ProductPerformance[]>([])
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
      const response = await apiClient.getProductPerformanceReport({
        dateFrom: dateRange?.from?.toISOString().split('T')[0],
        dateTo: dateRange?.to?.toISOString().split('T')[0],
        limit: 50,
      })
      setData((response as any).data || [])
    } catch (error) {
      console.error('Error fetching product performance:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const totals = data.reduce(
    (acc, item) => ({
      totalQuantitySold: acc.totalQuantitySold + item.totalQuantitySold,
      totalRevenue: acc.totalRevenue + item.totalRevenue,
      totalProfit: acc.totalProfit + item.totalProfit,
    }),
    { totalQuantitySold: 0, totalRevenue: 0, totalProfit: 0 }
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Hiệu suất sản phẩm</h1>
          <p className="text-muted-foreground">Phân tích hiệu suất bán hàng của từng sản phẩm</p>
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

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng số lượng bán</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.totalQuantitySold}</div>
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
            <CardTitle className="text-sm font-medium">Tổng lợi nhuận</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totals.totalProfit)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top sản phẩm</CardTitle>
          <CardDescription>50 sản phẩm có doanh thu cao nhất</CardDescription>
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
                  <TableHead>Sản phẩm</TableHead>
                  <TableHead>Danh mục</TableHead>
                  <TableHead className="text-right">SL bán</TableHead>
                  <TableHead className="text-right">Doanh thu</TableHead>
                  <TableHead className="text-right">Lợi nhuận</TableHead>
                  <TableHead className="text-right">Tỷ suất LN</TableHead>
                  <TableHead className="text-right">Tồn kho</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((item) => (
                  <TableRow key={item.productId}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{item.productName}</div>
                        <div className="text-xs text-muted-foreground">{item.sku}</div>
                      </div>
                    </TableCell>
                    <TableCell>{item.categoryName || '-'}</TableCell>
                    <TableCell className="text-right">{item.totalQuantitySold}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.totalRevenue)}</TableCell>
                    <TableCell className="text-right">
                      <span className={item.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}>{formatCurrency(item.totalProfit)}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={item.profitMarginPercentage >= 0 ? 'text-green-600' : 'text-red-600'}>{item.profitMarginPercentage.toFixed(1)}%</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={item.currentStock <= item.lowStockThreshold ? 'text-amber-600 font-medium' : ''}>{item.currentStock}</span>
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
