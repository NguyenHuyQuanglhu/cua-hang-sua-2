'use client'

import { useState, useEffect } from 'react'
import { PlusCircle, Copy, Tag } from 'lucide-react'
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
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { apiClient } from '@/lib/api-client'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'
import { CreateVoucherDialog } from './components/create-voucher-dialog'

interface Voucher {
  id: string
  code: string
  name: string
  description?: string
  discountType: string
  discountValue: number
  maxDiscountAmount?: number
  minPurchaseAmount?: number
  startDate: string
  endDate: string
  usageCount: number
  usageLimit?: number
  usagePerCustomer: number
  status: string
}

export default function VouchersPage() {
  const [vouchers, setVouchers] = useState<Voucher[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchVouchers()
  }, [])

  const fetchVouchers = async () => {
    setIsLoading(true)
    try {
      const response = await apiClient.request<{ data?: Voucher[] }>('/vouchers', { method: 'GET' })
      setVouchers(response.data || [])
    } catch (error) {
      console.error('Error fetching vouchers:', error)
      toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: 'Không thể tải danh sách voucher',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    toast({
      title: 'Đã sao chép',
      description: `Mã ${code} đã được sao chép`,
    })
  }

  const getDiscountText = (voucher: Voucher) => {
    if (voucher.discountType === 'percentage') {
      return `${voucher.discountValue}%`
    }
    return formatCurrency(voucher.discountValue)
  }

  return (
    <div className="space-y-6">
      <CreateVoucherDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={fetchVouchers}
      />
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Mã giảm giá</h1>
          <p className="text-muted-foreground">
            Quản lý voucher và mã giảm giá
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Tạo voucher
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Đang hoạt động</CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {vouchers.filter((v) => v.status === 'active').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Đã sử dụng</CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {vouchers.reduce((sum, v) => sum + v.usageCount, 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hết hạn</CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {vouchers.filter((v) => v.status === 'expired').length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Danh sách voucher</CardTitle>
          <CardDescription>
            Quản lý tất cả mã giảm giá của cửa hàng
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mã voucher</TableHead>
                <TableHead>Tên</TableHead>
                <TableHead>Giảm giá</TableHead>
                <TableHead>Điều kiện</TableHead>
                <TableHead>Thời gian</TableHead>
                <TableHead>Lượt dùng</TableHead>
                <TableHead>Trạng thái</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">
                    Đang tải...
                  </TableCell>
                </TableRow>
              ) : vouchers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">
                    Chưa có voucher nào
                  </TableCell>
                </TableRow>
              ) : (
                vouchers.map((voucher) => (
                  <TableRow key={voucher.id}>
                    <TableCell className="font-mono font-bold">
                      <div className="flex items-center gap-2">
                        {voucher.code}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => copyCode(voucher.code)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>{voucher.name}</TableCell>
                    <TableCell className="font-semibold text-green-600">
                      {getDiscountText(voucher)}
                    </TableCell>
                    <TableCell>
                      {voucher.minPurchaseAmount && (
                        <div className="text-sm">
                          Đơn tối thiểu: {formatCurrency(voucher.minPurchaseAmount)}
                        </div>
                      )}
                      {voucher.maxDiscountAmount && (
                        <div className="text-sm text-muted-foreground">
                          Giảm tối đa: {formatCurrency(voucher.maxDiscountAmount)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{format(new Date(voucher.startDate), 'dd/MM/yyyy')}</div>
                        <div className="text-muted-foreground">
                          {format(new Date(voucher.endDate), 'dd/MM/yyyy')}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {voucher.usageCount}
                      {voucher.usageLimit && ` / ${voucher.usageLimit}`}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          voucher.status === 'active' ? 'default' : 'secondary'
                        }
                      >
                        {voucher.status === 'active' ? 'Hoạt động' : 'Hết hạn'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
