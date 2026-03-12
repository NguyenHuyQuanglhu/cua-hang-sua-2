'use client'

import { useState, useEffect, useCallback, useTransition } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  Search,
  Calendar as CalendarIcon,
  ChevronDown,
  Eye,
  Package,
  Clock,
  CheckCircle,
  Truck,
  XCircle,
} from "lucide-react"
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns"
import { DateRange } from "react-day-picker"

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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { Calendar } from "@/components/ui/calendar"
import { useToast } from "@/hooks/use-toast"
import { formatCurrency, cn } from "@/lib/utils"
import {
  getOnlineStore,
  getOnlineOrders,
  updateOnlineOrderStatus,
  OnlineStore,
  OnlineOrder,
  OrderStatus,
} from "../../actions"
import { OrderDetailDialog } from "./components/order-detail-dialog"

const ORDER_STATUSES: { value: OrderStatus | 'all'; label: string; icon: React.ReactNode }[] = [
  { value: 'all', label: 'Tất cả', icon: null },
  { value: 'pending', label: 'Chờ xác nhận', icon: <Clock className="h-4 w-4" /> },
  { value: 'confirmed', label: 'Đã xác nhận', icon: <CheckCircle className="h-4 w-4" /> },
  { value: 'processing', label: 'Đang xử lý', icon: <Package className="h-4 w-4" /> },
  { value: 'shipped', label: 'Đang giao', icon: <Truck className="h-4 w-4" /> },
  { value: 'delivered', label: 'Đã giao', icon: <CheckCircle className="h-4 w-4 text-green-500" /> },
  { value: 'cancelled', label: 'Đã hủy', icon: <XCircle className="h-4 w-4 text-red-500" /> },
];

const getStatusBadgeVariant = (status: OrderStatus): "default" | "secondary" | "outline" | "destructive" => {
  switch (status) {
    case 'pending': return 'secondary';
    case 'confirmed': return 'default';
    case 'processing': return 'default';
    case 'shipped': return 'default';
    case 'delivered': return 'outline';
    case 'cancelled': return 'destructive';
    default: return 'outline';
  }
};

const getStatusLabel = (status: OrderStatus): string => {
  const found = ORDER_STATUSES.find(s => s.value === status);
  return found?.label || status;
};

const getPaymentStatusLabel = (status: string): string => {
  switch (status) {
    case 'pending': return 'Chờ thanh toán';
    case 'paid': return 'Đã thanh toán';
    case 'refunded': return 'Đã hoàn tiền';
    case 'failed': return 'Thất bại';
    default: return status;
  }
};

const getPaymentMethodLabel = (method: string): string => {
  switch (method) {
    case 'cod': return 'COD';
    case 'bank_transfer': return 'Chuyển khoản';
    default: return method;
  }
};

export default function OnlineOrdersPage() {
  const params = useParams();
  const storeId = params.storeId as string;
  const [store, setStore] = useState<OnlineStore | null>(null);
  const [orders, setOrders] = useState<OnlineOrder[]>([]);
  const [statistics, setStatistics] = useState<{ statusCounts: Record<string, number>; total: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfWeek(new Date(), { weekStartsOn: 1 }),
    to: endOfWeek(new Date(), { weekStartsOn: 1 }),
  });
  const [selectedOrder, setSelectedOrder] = useState<OnlineOrder | null>(null);
  const [isUpdating, startTransition] = useTransition();
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [storeResult, ordersResult] = await Promise.all([
        getOnlineStore(storeId),
        getOnlineOrders(storeId, {
          status: statusFilter !== 'all' ? statusFilter : undefined,
          search: searchTerm || undefined,
          startDate: dateRange?.from?.toISOString(),
          endDate: dateRange?.to?.toISOString(),
        }),
      ]);

      if (storeResult.success && storeResult.data) {
        setStore(storeResult.data);
      }

      if (ordersResult.success) {
        setOrders(ordersResult.data || []);
        setStatistics(ordersResult.statistics || null);
      } else {
        toast({
          variant: "destructive",
          title: "Lỗi",
          description: ordersResult.error || "Không thể tải danh sách đơn hàng",
        });
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [storeId, statusFilter, searchTerm, dateRange, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleStatusChange = (orderId: string, newStatus: OrderStatus) => {
    startTransition(async () => {
      const result = await updateOnlineOrderStatus(storeId, orderId, newStatus);
      if (result.success) {
        toast({
          title: "Thành công!",
          description: `Đã cập nhật trạng thái đơn hàng thành "${getStatusLabel(newStatus)}"`,
        });
        fetchData();
      } else {
        toast({
          variant: "destructive",
          title: "Lỗi",
          description: result.error,
        });
      }
    });
  };

  const setDatePreset = (preset: 'this_week' | 'this_month' | 'all') => {
    const now = new Date();
    if (preset === 'all') {
      setDateRange(undefined);
      return;
    }
    switch (preset) {
      case 'this_week':
        setDateRange({ from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) });
        break;
      case 'this_month':
        setDateRange({ from: startOfMonth(now), to: endOfMonth(now) });
        break;
    }
  };

  const filteredOrders = orders.filter(order =>
    order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.customerEmail.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalRevenue = filteredOrders.reduce((sum, order) => {
    if (order.status !== 'cancelled') {
      return sum + order.total;
    }
    return sum;
  }, 0);

  if (isLoading) {
    return <div className="p-6">Đang tải...</div>;
  }

  return (
    <>
      <OrderDetailDialog
        isOpen={!!selectedOrder}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedOrder(null);
            fetchData();
          }
        }}
        order={selectedOrder}
        onlineStoreId={storeId}
        onStatusChange={handleStatusChange}
      />

      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/online-stores">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{store?.storeName || 'Cửa hàng'}</h1>
            <p className="text-muted-foreground">Quản lý đơn hàng online</p>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Chờ xác nhận</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics?.statusCounts?.pending || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Đang xử lý</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(statistics?.statusCounts?.confirmed || 0) + (statistics?.statusCounts?.processing || 0)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Đang giao</CardTitle>
              <Truck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics?.statusCounts?.shipped || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Doanh thu</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(totalRevenue)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Orders Table */}
        <Card>
          <CardHeader>
            <CardTitle>Đơn hàng</CardTitle>
            <CardDescription>
              Tổng cộng {statistics?.total || 0} đơn hàng
            </CardDescription>
            <div className="flex flex-wrap items-center gap-4 mt-4">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Tìm theo mã đơn, tên, email..."
                  className="pl-8 md:w-64"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[240px] justify-start text-left font-normal",
                      !dateRange && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "dd/MM/yyyy")} - {format(dateRange.to, "dd/MM/yyyy")}
                        </>
                      ) : (
                        format(dateRange.from, "dd/MM/yyyy")
                      )
                    ) : (
                      <span>Tất cả</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    selected={dateRange}
                    onSelect={setDateRange}
                    initialFocus
                  />
                  <div className="p-2 border-t grid grid-cols-3 gap-1">
                    <Button variant="ghost" size="sm" onClick={() => setDatePreset('this_week')}>Tuần này</Button>
                    <Button variant="ghost" size="sm" onClick={() => setDatePreset('this_month')}>Tháng này</Button>
                    <Button variant="ghost" size="sm" onClick={() => setDatePreset('all')}>Tất cả</Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as OrderStatus | 'all')}>
              <TabsList className="mb-4">
                {ORDER_STATUSES.map((status) => (
                  <TabsTrigger key={status.value} value={status.value}>
                    {status.label}
                    {status.value !== 'all' && statistics?.statusCounts?.[status.value] !== undefined && (
                      <Badge variant="secondary" className="ml-2">
                        {statistics.statusCounts[status.value]}
                      </Badge>
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value={statusFilter}>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mã đơn</TableHead>
                      <TableHead>Khách hàng</TableHead>
                      <TableHead>Ngày đặt</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead>Thanh toán</TableHead>
                      <TableHead className="text-right">Tổng tiền</TableHead>
                      <TableHead>
                        <span className="sr-only">Hành động</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center h-24">
                          Không có đơn hàng nào
                        </TableCell>
                      </TableRow>
                    )}
                    {filteredOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">{order.orderNumber}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{order.customerName}</div>
                            <div className="text-sm text-muted-foreground">{order.customerPhone}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {new Date(order.createdAt).toLocaleDateString('vi-VN')}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="p-1 h-auto" disabled={isUpdating}>
                                <Badge variant={getStatusBadgeVariant(order.status)}>
                                  {getStatusLabel(order.status)}
                                  <ChevronDown className="h-3 w-3 ml-1" />
                                </Badge>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                              <DropdownMenuLabel>Cập nhật trạng thái</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              {ORDER_STATUSES.filter(s => s.value !== 'all').map((status) => (
                                <DropdownMenuItem
                                  key={status.value}
                                  onClick={() => handleStatusChange(order.id, status.value as OrderStatus)}
                                  disabled={order.status === status.value || isUpdating}
                                >
                                  {status.icon}
                                  <span className="ml-2">{status.label}</span>
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                        <TableCell>
                          <div>
                            <Badge variant={order.paymentStatus === 'paid' ? 'default' : 'secondary'}>
                              {getPaymentStatusLabel(order.paymentStatus)}
                            </Badge>
                            <div className="text-xs text-muted-foreground mt-1">
                              {getPaymentMethodLabel(order.paymentMethod)}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(order.total)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedOrder(order)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
