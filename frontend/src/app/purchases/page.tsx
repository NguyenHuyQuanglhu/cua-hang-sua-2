'use client'

import { useState, useMemo, useTransition, useEffect, useCallback } from "react"
import Link from "next/link"
import {
  MoreHorizontal,
  PlusCircle,
  Search,
  ArrowUp,
  ArrowDown,
  File,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react"
import { DateRange } from "react-day-picker"
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from "date-fns"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { formatCurrency, cn } from "@/lib/utils"
import { deletePurchaseOrder, generatePurchaseOrdersExcel } from "./actions"
import { useToast } from "@/hooks/use-toast"
import { Calendar } from "@/components/ui/calendar"
import { useStore } from "@/contexts/store-context"
import { PurchaseOrder, Supplier } from "@/lib/types"
import { EditPurchaseDialog } from "./components/edit-purchase-dialog"

type SortKey = 'orderNumber' | 'importDate' | 'totalAmount' | 'itemCount' | 'notes' | 'supplier';

interface PurchaseOrderWithSupplier extends PurchaseOrder {
  supplierName?: string;
  itemCount?: number;
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export default function PurchasesPage() {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedPurchaseId, setSelectedPurchaseId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>('importDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [orderToDelete, setOrderToDelete] = useState<PurchaseOrderWithSupplier | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, startExportingTransition] = useTransition();
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  
  const [purchases, setPurchases] = useState<PurchaseOrderWithSupplier[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  });
  
  const { currentStore } = useStore();
  const { toast } = useToast();

  // Fetch purchase orders with server-side pagination
  const fetchPurchases = useCallback(async (page = 1, pageSize = 20) => {
    if (!currentStore?.id) return;
    
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('pageSize', pageSize.toString());
      if (searchTerm) {
        params.set('search', searchTerm);
      }
      if (dateRange?.from) {
        params.set('dateFrom', dateRange.from.toISOString());
      }
      if (dateRange?.to) {
        params.set('dateTo', dateRange.to.toISOString());
      }

      console.log('Fetching purchases with params:', params.toString());
      console.log('Store ID:', currentStore.id);
      
      const token = localStorage.getItem('auth_token');
      const headers: Record<string, string> = {
        'X-Store-Id': currentStore.id,
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`/api/purchases?${params.toString()}`, {
        headers,
      });
      
      console.log('Response status:', response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log('Purchases result:', result);
        setPurchases(result.data || []);
        if (result.pagination) {
          setPagination(result.pagination);
        }
      } else {
        const errorText = await response.text();
        console.error('Error response:', errorText);
      }
    } catch (error) {
      console.error('Error fetching purchases:', error);
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: "Không thể tải danh sách đơn nhập hàng",
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentStore?.id, dateRange, searchTerm, toast]);

  // Fetch suppliers
  const fetchSuppliers = useCallback(async () => {
    if (!currentStore?.id) return;
    
    try {
      const token = localStorage.getItem('auth_token');
      const headers: Record<string, string> = {
        'X-Store-Id': currentStore.id,
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch('/api/suppliers', {
        headers,
      });
      
      if (response.ok) {
        const result = await response.json();
        setSuppliers(result.suppliers || []);
      }
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    }
  }, [currentStore?.id]);

  useEffect(() => {
    fetchPurchases(pagination.page, pagination.pageSize);
    fetchSuppliers();
  }, [fetchPurchases, fetchSuppliers, pagination.page, pagination.pageSize]);

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPurchases(1, pagination.pageSize);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset to page 1 when date range changes
  useEffect(() => {
    fetchPurchases(1, pagination.pageSize);
  }, [dateRange]);

  const suppliersMap = useMemo(() => new Map(suppliers?.map(s => [s.id, s.name])), [suppliers]);

  // Client-side filtering is now minimal since server handles search
  const filteredPurchases = purchases;
  
  const setDatePreset = (preset: 'this_week' | 'this_month' | 'this_quarter' | 'this_year' | 'all') => {
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
      case 'this_quarter':
        setDateRange({ from: startOfQuarter(now), to: endOfQuarter(now) });
        break;
      case 'this_year':
        setDateRange({ from: startOfYear(now), to: endOfYear(now) });
        break;
    }
  }

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const sortedPurchases = useMemo(() => {
    let sortableItems = [...(filteredPurchases || [])];
    if (sortKey) {
      sortableItems.sort((a, b) => {
        let valA, valB;
        switch (sortKey) {
            case 'itemCount':
                valA = a.itemCount ?? a.items?.length ?? 0;
                valB = b.itemCount ?? b.items?.length ?? 0;
                break;
            case 'importDate':
                valA = new Date(a.importDate).getTime();
                valB = new Date(b.importDate).getTime();
                break;
            case 'notes':
                valA = a.notes || '';
                valB = b.notes || '';
                break;
            case 'supplier':
                valA = a.supplierName || suppliersMap.get(a.supplierId || '') || '';
                valB = b.supplierName || suppliersMap.get(b.supplierId || '') || '';
                break;
            default:
                valA = a[sortKey as keyof PurchaseOrderWithSupplier];
                valB = b[sortKey as keyof PurchaseOrderWithSupplier];
        }

        if (typeof valA === 'string' && typeof valB === 'string') {
            valA = valA.toLowerCase();
            valB = valB.toLowerCase();
        }

        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [filteredPurchases, sortKey, sortDirection, suppliersMap]);

  const handleDelete = async () => {
    if (!orderToDelete) return;
    setIsDeleting(true);
    const result = await deletePurchaseOrder(orderToDelete.id);
    if (result.success) {
      toast({
        title: "Thành công!",
        description: `Đã xóa đơn nhập hàng "${orderToDelete.orderNumber}".`,
      });
      fetchPurchases(pagination.page, pagination.pageSize);
    } else {
      toast({
        variant: "destructive",
        title: "Ôi! Đã có lỗi xảy ra.",
        description: result.error,
      });
    }
    setIsDeleting(false);
    setOrderToDelete(null);
  };

  // Pagination handlers
  const goToPage = (page: number) => {
    if (page >= 1 && page <= pagination.totalPages) {
      setPagination(prev => ({ ...prev, page }));
    }
  };

  const handlePageSizeChange = (newPageSize: string) => {
    const size = parseInt(newPageSize);
    setPagination(prev => ({ ...prev, pageSize: size, page: 1 }));
  };
  
  const handleExport = () => {
    if (!sortedPurchases || sortedPurchases.length === 0) {
      toast({
        variant: "destructive",
        title: "Không có dữ liệu",
        description: "Không có đơn nhập hàng nào để xuất.",
      });
      return;
    }
    startExportingTransition(async () => {
      const result = await generatePurchaseOrdersExcel(sortedPurchases, suppliers || []);
      if (result.success && result.data) {
        const link = document.createElement("a");
        link.href = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${result.data}`;
        link.download = "phieu_nhap_hang.xlsx";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast({ title: "Thành công", description: "Đã xuất danh sách đơn nhập hàng." });
      } else {
        toast({ variant: "destructive", title: "Lỗi", description: result.error });
      }
    });
  };

  const SortableHeader = ({ sortKey: key, children, className }: { sortKey: SortKey; children: React.ReactNode, className?: string; }) => (
    <TableHead className={className}>
      <Button variant="ghost" onClick={() => handleSort(key)} className="px-2 py-1 h-auto">
        {children}
        {sortKey === key && (
          sortDirection === 'asc' ? <ArrowUp className="h-4 w-4 ml-2" /> : <ArrowDown className="h-4 w-4 ml-2" />
        )}
      </Button>
    </TableHead>
  );

  return (
    <>
      {selectedPurchaseId && (
        <EditPurchaseDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          purchaseOrderId={selectedPurchaseId}
          onSuccess={() => {
            // Reset to page 1 to show updated purchase at top
            setPagination(prev => ({ ...prev, page: 1 }));
            fetchPurchases(1, pagination.pageSize);
            toast({
              title: "Thành công!",
              description: "Đã cập nhật đơn nhập hàng thành công.",
            });
          }}
        />
      )}
      
      <AlertDialog open={!!orderToDelete} onOpenChange={(open) => !open && setOrderToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bạn có chắc chắn không?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này không thể được hoàn tác. Thao tác này sẽ xóa vĩnh viễn đơn nhập hàng{' '}
              <strong>{orderToDelete?.orderNumber}</strong> và cập nhật lại tồn kho của các sản phẩm liên quan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? "Đang xóa..." : "Xóa"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>Đơn nhập hàng</CardTitle>
              <CardDescription>
                  Tạo và quản lý các đợt nhập hàng của bạn.
              </CardDescription>
              <Alert className="mt-3 bg-blue-50 border-blue-200">
                <AlertDescription className="text-sm text-blue-900">
                  <strong>2 cách nhập hàng:</strong> (1) Nhập theo đơn - nhập nhiều sản phẩm cùng lúc, (2) Nhập nhanh - nhập hàng cho sản phẩm tồn kho thấp.
                </AlertDescription>
              </Alert>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" className="h-8 gap-1" onClick={handleExport} disabled={isExporting}>
                  <File className="h-3.5 w-3.5" />
                  <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                    {isExporting ? "Đang xuất..." : "Xuất Excel"}
                  </span>
                </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" className="h-8 gap-1">
                    <PlusCircle className="h-3.5 w-3.5" />
                    <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                      Nhập hàng
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Chọn cách nhập hàng</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/purchases/new" className="cursor-pointer">
                      <div className="flex flex-col gap-1">
                        <div className="font-medium">Nhập theo đơn hàng</div>
                        <div className="text-xs text-muted-foreground">Nhập nhiều sản phẩm cùng lúc</div>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/purchases/quick-import" className="cursor-pointer">
                      <div className="flex flex-col gap-1">
                        <div className="font-medium">Nhập nhanh - Tồn kho thấp</div>
                        <div className="text-xs text-muted-foreground">Nhập hàng cho sản phẩm tồn kho dưới ngưỡng</div>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
           <div className="flex flex-wrap items-center gap-4 pt-4">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Tìm theo mã đơn, nhà cung cấp..."
                    className="w-full rounded-lg bg-background pl-8 md:w-64"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Popover>
                  <PopoverTrigger asChild>
                      <Button
                      variant={"outline"}
                      className={cn(
                          "w-[240px] justify-start text-left font-normal",
                          !dateRange && "text-muted-foreground"
                      )}
                      >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange?.from ? (dateRange.to ? <>{format(dateRange.from, "dd/MM/yyyy")} - {format(dateRange.to, "dd/MM/yyyy")}</> : format(dateRange.from, "dd/MM/yyyy")) : <span>Tất cả</span>}
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
                          <Button variant="ghost" size="sm" onClick={() => setDatePreset('this_quarter')}>Quý này</Button>
                          <Button variant="ghost" size="sm" onClick={() => setDatePreset('this_year')}>Năm nay</Button>
                          <Button variant="ghost" size="sm" onClick={() => setDatePreset('all')}>Tất cả</Button>
                      </div>
                  </PopoverContent>
              </Popover>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16 hidden md:table-cell">STT</TableHead>
                <SortableHeader sortKey="orderNumber">Mã đơn</SortableHeader>
                <SortableHeader sortKey="importDate">Ngày nhập</SortableHeader>
                <TableHead>Sản phẩm</TableHead>
                <SortableHeader sortKey="supplier">Nhà cung cấp</SortableHeader>
                <SortableHeader sortKey="itemCount" className="text-right">Số SP</SortableHeader>
                <SortableHeader sortKey="totalAmount" className="text-right">Tổng tiền</SortableHeader>
                <SortableHeader sortKey="notes">Ghi chú</SortableHeader>
                <TableHead>
                  <span className="sr-only">Hành động</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={10} className="text-center">Đang tải...</TableCell></TableRow>}
              {!isLoading && sortedPurchases?.map((order, index) => {
                  // Get product names for this order
                  const productNames = order.items?.map(item => item.productName).filter(Boolean).join(', ') || 'N/A';
                  const displayProducts = productNames.length > 50 ? productNames.substring(0, 50) + '...' : productNames;
                  
                  return (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium hidden md:table-cell">{(pagination.page - 1) * pagination.pageSize + index + 1}</TableCell>
                    <TableCell className="font-medium">
                        <Link href={`/purchases/${order.id}`} className="hover:underline">
                            {order.orderNumber}
                        </Link>
                    </TableCell>
                    <TableCell>
                      {new Date(order.importDate).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      <span className="text-sm" title={productNames}>
                        {displayProducts}
                      </span>
                    </TableCell>
                     <TableCell>
                      {order.supplierName || suppliersMap.get(order.supplierId || '') || 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">
                      {order.itemCount ?? order.items?.length ?? 0}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(order.totalAmount)}
                    </TableCell>
                    <TableCell>
                      {order.notes}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            aria-haspopup="true"
                            size="icon"
                            variant="ghost"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Chuyển đổi menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Hành động</DropdownMenuLabel>
                          <DropdownMenuItem asChild>
                            <Link href={`/purchases/${order.id}`}>Xem chi tiết</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            setSelectedPurchaseId(order.id);
                            setEditDialogOpen(true);
                          }}>
                            Sửa
                          </DropdownMenuItem>
                           <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onClick={() => setOrderToDelete(order)}>Xóa</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )})}
                {!isLoading && sortedPurchases?.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={10} className="text-center h-24">
                           Chưa có đơn nhập hàng nào.
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Hiển thị</span>
            <Select value={pagination.pageSize.toString()} onValueChange={handlePageSizeChange}>
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue placeholder={pagination.pageSize.toString()} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
            <span>trên <strong>{pagination.total}</strong> đơn nhập hàng</span>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Trang {pagination.page} / {pagination.totalPages || 1}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => goToPage(1)}
                disabled={pagination.page <= 1}
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => goToPage(pagination.page - 1)}
                disabled={pagination.page <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => goToPage(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => goToPage(pagination.totalPages)}
                disabled={pagination.page >= pagination.totalPages}
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardFooter>
      </Card>
    </>
  )
}
