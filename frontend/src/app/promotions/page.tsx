'use client'

import { useState, useEffect } from 'react'
import { PlusCircle, Edit, Trash2, Tag, Gift, Percent } from 'lucide-react'
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
import { CreatePromotionDialog } from './components/create-promotion-dialog'

interface Promotion {
  id: string
  name: string
  description?: string
  type: string
  status: string
  startDate: string
  endDate: string
  discountType?: string
  discountValue?: number
  maxDiscountAmount?: number
  buyQuantity?: number
  getQuantity?: number
  usageCount: number
  usageLimit?: number
}

export default function PromotionsPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchPromotions()
  }, [])

  const fetchPromotions = async () => {
    setIsLoading(true)
    try {
      const response = await apiClient.request<{ data?: Promotion[] }>('/promotions', { method: 'GET' })
      setPromotions(response.data || [])
    } catch (error) {
      console.error('Error fetching promotions:', error)
      toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: 'Không thể tải danh sách khuyến mãi',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'percentage':
      case 'fixed_amount':
        return <Percent className="h-4 w-4" />
      case 'buy_x_get_y':
        return <Gift className="h-4 w-4" />
      case 'voucher':
        return <Tag className="h-4 w-4" />
      default:
        return <Gift className="h-4 w-4" />
    }
  }

  const getTypeText = (type: string) => {
    switch (type) {
      case 'percentage':
        return 'Giảm %'
      case 'fixed_amount':
        return 'Giảm tiền'
      case 'buy_x_get_y':
        return 'Mua X tặng Y'
      case 'bundle':
        return 'Combo'
      case 'voucher':
        return 'Voucher'
      default:
        return type
    }
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'default'
      case 'inactive':
        return 'secondary'
      case 'expired':
        return 'destructive'
      case 'scheduled':
        return 'outline'
      default:
        return 'secondary'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'Đang chạy'
      case 'inactive':
        return 'Tạm dừng'
      case 'expired':
        return 'Hết hạn'
      case 'scheduled':
        return 'Đã lên lịch'
      default:
        return status
    }
  }

  const getDiscountText = (promo: Promotion) => {
    if (promo.type === 'buy_x_get_y') {
      return `Mua ${promo.buyQuantity} tặng ${promo.getQuantity}`
    }
    if (promo.discountType === 'percentage') {
      return `${promo.discountValue}%`
    }
    if (promo.discountType === 'fixed') {
      return formatCurrency(promo.discountValue || 0)
    }
    return '-'
  }

  return (
    <div className="space-y-6">
      <CreatePromotionDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={fetchPromotions}
      />
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Khuyến mãi</h1>
          <p className="text-muted-foreground">
            Quản lý chương trình khuyến mãi và giảm giá
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Tạo khuyến mãi
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Đang chạy</CardTitle>
            <Gift className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {promotions.filter((p) => p.status === 'active').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Đã lên lịch</CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {promotions.filter((p) => p.status === 'scheduled').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng lượt dùng</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {promotions.reduce((sum, p) => sum + p.usageCount, 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hết hạn</CardTitle>
            <Trash2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {promotions.filter((p) => p.status === 'expired').length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Danh sách khuyến mãi</CardTitle>
          <CardDescription>
            Quản lý tất cả chương trình khuyến mãi của cửa hàng
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tên chương trình</TableHead>
                <TableHead>Loại</TableHead>
                <TableHead>Giảm giá</TableHead>
                <TableHead>Thời gian</TableHead>
                <TableHead>Lượt dùng</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="text-right">Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">
                    Đang tải...
                  </TableCell>
                </TableRow>
              ) : promotions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">
                    Chưa có khuyến mãi nào
                  </TableCell>
                </TableRow>
              ) : (
                promotions.map((promo) => (
                  <TableRow key={promo.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(promo.type)}
                        <div>
                          <div>{promo.name}</div>
                          {promo.description && (
                            <div className="text-xs text-muted-foreground">
                              {promo.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{getTypeText(promo.type)}</Badge>
                    </TableCell>
                    <TableCell>{getDiscountText(promo)}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{format(new Date(promo.startDate), 'dd/MM/yyyy')}</div>
                        <div className="text-muted-foreground">
                          {format(new Date(promo.endDate), 'dd/MM/yyyy')}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {promo.usageCount}
                      {promo.usageLimit && ` / ${promo.usageLimit}`}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(promo.status)}>
                        {getStatusText(promo.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon">
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
