'use client'

import { useState, useMemo, useEffect, useTransition, useCallback } from "react"
import Link from "next/link"
import {
  File,
  MoreHorizontal,
  PlusCircle,
  Search,
  Calendar as CalendarIcon,
  ChevronDown,
  ArrowUp,
  ArrowDown,
  ChevronsUpDown,
  Check,
  Undo2,
} from "lucide-react"
import * as xlsx from 'xlsx';

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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from "date-fns"
import { DateRange } from "react-day-picker"
import { cn, formatCurrency } from "@/lib/utils"
import { useUserRole } from "@/hooks/use-user-role"
import { Input } from "@/components/ui/input"
import { Calendar } from "@/components/ui/calendar"
import { deleteSaleTransaction, updateSaleStatus, getSales } from "./actions"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { useStore } from "@/contexts/store-context"
import { StatusFilter } from "./components/StatusFilter"
import { StatusBadge } from "./components/StatusBadge"

type SaleStatus = 'all' | 'pending' | 'processed';
type SortKey = 'invoiceNumber' | 'customer' | 'projectName' | 'transactionDate' | 'status' | 'finalAmount';

interface Sale {
  id: string;
  invoiceNumber: string;
  customerId?: string;
  customerName?: string;
  projectName?: string;
  transactionDate: string;
  status: 'pending' | 'processed';
  finalAmount: number;
  itemCount: number;
  customerPayment?: number;
  previousDebt?: number;
  totalAmount?: number;
}

const normalizeSale = (raw: Record<string, unknown>): Sale => ({
  id: String(raw.id ?? ''),
  invoiceNumber: String(raw.invoiceNumber ?? ''),
  customerId: raw.customerId ? String(raw.customerId) : undefined,
  customerName: raw.customerName ? String(raw.customerName) : undefined,
  projectName: raw.projectName ? String(raw.projectName) : undefined,
  transactionDate: String(raw.transactionDate ?? new Date().toISOString()),
  status: raw.status === 'pending' ? 'pending' : 'processed',
  finalAmount: Number(raw.finalAmount ?? 0),
  itemCount: Number(raw.itemCount ?? 0),
  customerPayment: raw.customerPayment !== undefined ? Number(raw.customerPayment) : undefined,
  previousDebt: raw.previousDebt !== undefined ? Number(raw.previousDebt) : undefined,
  totalAmount: raw.totalAmount !== undefined ? Number(raw.totalAmount) : undefined,
});


export default function SalesPage() {
  const { currentStore } = useStore();
  const [sales, setSales] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  // Default to "all" (undefined) to show all sales - user can filter by date if needed
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [saleToDelete, setSaleToDelete] = useState<Sale | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<SaleStatus>('all');
  const [customerFilter, setCustomerFilter] = useState<string>('all');
  const [isUpdatingStatus, startStatusTransition] = useTransition();
  const [sortKey, setSortKey] = useState<SortKey>('transactionDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [customerPopoverOpen, setCustomerPopoverOpen] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusCounts, setStatusCounts] = useState({ pending: 0, processed: 0 });
  const { permissions, isLoading: isRoleLoading } = useUserRole();

  const { toast } = useToast();
  const router = useRouter();

  // Get unique customers from sales for filter
  const uniqueCustomers = useMemo(() => {
    const customerMap = new Map<string, string>();
    sales.forEach(sale => {
      if (sale.customerId && sale.customerName) {
        customerMap.set(sale.customerId, sale.customerName);
      }
    });
    return Array.from(customerMap.entries()).map(([id, name]) => ({ id, name }));
  }, [sales]);

  const fetchSales = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getSales({
        page,
        pageSize: 20,
        search: searchTerm || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        customerId: customerFilter !== 'all' ? customerFilter : undefined,
        dateFrom: dateRange?.from?.toISOString(),
        dateTo: dateRange?.to?.toISOString(),
      });

      if (result.success) {
        setSales((result.data || []).map(normalizeSale));
        setTotal(result.total || 0);
        setTotalPages(result.totalPages || 1);
        
        // Calculate status counts from the data
        const pending = (result.data || []).filter(s => s.status === 'pending').length;
        const processed = (result.data || []).filter(s => s.status === 'processed').length;
        setStatusCounts({ pending, processed });
      } else {
        toast({
          variant: "destructive",
          title: "Lỗi",
          description: result.error || "Không thể tải danh sách đơn hàng",
        });
      }
    } catch (error) {
      console.error('Error fetching sales:', error);
    } finally {
      setIsLoading(false);
    }
  }, [page, searchTerm, statusFilter, customerFilter, dateRange, toast]);

  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  // Reload sales when store changes - CLEAR old data first
  useEffect(() => {
    if (currentStore) {
      console.log('[Sales Page] Store changed to:', currentStore.name, currentStore.id);
      // Clear old sales immediately to prevent stale data
      setSales([]);
      setTotal(0);
      setPage(1);
      // Then fetch new sales
      fetchSales();
    }
  }, [currentStore?.id]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };
  
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

  const sortedSales = useMemo(() => {
    const sortableItems = [...sales];

    sortableItems.sort((a, b) => {
      let valA: string | number, valB: string | number;

      switch (sortKey) {
        case 'invoiceNumber':
          valA = a.invoiceNumber || '';
          valB = b.invoiceNumber || '';
          break;
        case 'customer':
          valA = (a.customerName || '').toLowerCase();
          valB = (b.customerName || '').toLowerCase();
          break;
        case 'projectName':
          valA = (a.projectName || '').toLowerCase();
          valB = (b.projectName || '').toLowerCase();
          break;
        case 'transactionDate':
          valA = new Date(a.transactionDate).getTime();
          valB = new Date(b.transactionDate).getTime();
          break;
        case 'finalAmount':
          valA = a.finalAmount;
          valB = b.finalAmount;
          break;
        case 'status':
          valA = a.status;
          valB = b.status;
          break;
        default:
          return 0;
      }
      
      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return sortableItems;
  }, [sales, sortKey, sortDirection]);

  const totalRevenue = useMemo(() => {
    return sortedSales.reduce((total, sale) => {
      // For debt payment transactions, use customerPayment or previousDebt instead of finalAmount
      const isDebtPayment = (sale.totalAmount === 0 || !sale.totalAmount) && (sale.previousDebt ?? 0) > 0;
      const amount = isDebtPayment ? (sale.customerPayment || sale.previousDebt || 0) : sale.finalAmount;
      return total + amount;
    }, 0);
  }, [sortedSales]);

  const handleAddSale = () => {
    router.push('/pos');
  };

  const handleDelete = async () => {
    if (!saleToDelete) return;
    setIsDeleting(true);
    const result = await deleteSaleTransaction(saleToDelete.id);
    if (result.success) {
      toast({
        title: "Thành công!",
        description: `Đã xóa đơn hàng ${saleToDelete.invoiceNumber}.`,
      });
      fetchSales();
    } else {
      toast({
        variant: "destructive",
        title: "Ôi! Đã có lỗi xảy ra.",
        description: result.error,
      });
    }
    setIsDeleting(false);
    setSaleToDelete(null);
  }
  
  const handleStatusChange = (sale: Sale, status: Sale['status']) => {
    // Validate: Only allow updating sales from current store
    if (!currentStore) {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: "Không xác định được cửa hàng hiện tại",
      });
      return;
    }

    console.log('[Sales Page] Changing status:', { 
      saleId: sale.id, 
      invoiceNumber: sale.invoiceNumber,
      status,
      currentStore: currentStore.name 
    });
    
    startStatusTransition(async () => {
      console.log('[Sales Page] Calling updateSaleStatus...');
      const result = await updateSaleStatus(sale.id, status);
      console.log('[Sales Page] Update result:', result);
      
      if (result.success) {
        toast({
          title: "Thành công!",
          description: "Trạng thái đơn hàng đã được cập nhật.",
        });
        fetchSales();
      } else {
        console.error('[Sales Page] Update failed:', result.error);
        
        // If sale not found, it's from another store - refresh data
        if (result.error?.includes('not found')) {
          console.warn('[Sales Page] Sale not found - refreshing data');
          toast({
            title: "Đang làm mới dữ liệu...",
            description: "Đơn hàng không thuộc cửa hàng hiện tại. Đang cập nhật...",
          });
          
          // Clear stale data and refetch
          setSales([]);
          setTotal(0);
          router.refresh(); // Refresh server data without full reload
          
          // Refetch after a short delay
          setTimeout(() => {
            fetchSales();
          }, 500);
          return;
        }
        
        toast({
          variant: "destructive",
          title: "Không thể cập nhật",
          description: result.error || "Đơn hàng này không thuộc cửa hàng hiện tại hoặc đã bị xóa",
        });
      }
    });
  };

  const handleExportExcel = () => {
    const dataToExport = sortedSales.map((sale, index) => {
      const isDebtPayment = (sale.totalAmount === 0 || !sale.totalAmount) && (sale.previousDebt ?? 0) > 0;
      const displayAmount = isDebtPayment ? (sale.customerPayment || sale.previousDebt || 0) : sale.finalAmount;
      const statusLabel = isDebtPayment ? 'Trả nợ' : (sale.status === 'pending' ? 'Chưa xử lý' : 'Đã xử lý');
      
      return {
        'STT': index + 1,
        'Mã đơn hàng': sale.invoiceNumber,
        'Khách hàng': sale.customerName || 'Khách lẻ',
        'Công trình': sale.projectName || '-',
        'Ngày': format(new Date(sale.transactionDate), 'dd/MM/yyyy'),
        'Trạng thái': statusLabel,
        'Tổng cộng': displayAmount,
      };
    });

    const totalRowData = {
      'STT': '',
      'Mã đơn hàng': 'Tổng cộng',
      'Khách hàng': '',
      'Công trình': '',
      'Ngày': '',
      'Trạng thái': '',
      'Tổng cộng': totalRevenue,
    };

    const worksheet = xlsx.utils.json_to_sheet([...dataToExport, totalRowData]);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "DanhSachDonHang");

    worksheet['!cols'] = [
      { wch: 5 },
      { wch: 20 },
      { wch: 30 },
      { wch: 24 },
      { wch: 15 },
      { wch: 15 },
      { wch: 20 },
    ];
    
    xlsx.writeFile(workbook, "danh_sach_don_hang.xlsx");
  };

  const SortableHeader = ({ sortKey: key, children, className }: { sortKey: SortKey; children: React.ReactNode, className?: string }) => (
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
      <AlertDialog open={!!saleToDelete} onOpenChange={(open) => !open && setSaleToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bạn có chắc chắn không?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này không thể được hoàn tác. Thao tác này sẽ xóa vĩnh viễn đơn hàng {' '}
              <strong>{saleToDelete?.invoiceNumber}</strong>.
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
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <StatusFilter
            selectedStatus={statusFilter}
            onStatusChange={setStatusFilter}
            counts={statusCounts}
          />
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="h-8 gap-1" onClick={handleExportExcel}>
              <File className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                Xuất Excel
              </span>
            </Button>
            {permissions?.sales?.includes('add') && (
              <Button size="sm" className="h-8 gap-1" onClick={handleAddSale} disabled={isLoading}>
                <PlusCircle className="h-3.5 w-3.5" />
                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                  {isLoading ? 'Đang tải...' : 'Tạo đơn hàng'}
                </span>
              </Button>
            )}
          </div>
        </div>
        <Card>
            <CardHeader>
              <CardTitle>Đơn hàng</CardTitle>
              <CardDescription>
                Danh sách tất cả các giao dịch bán hàng.
              </CardDescription>
               <div className="flex flex-wrap items-center gap-4 mt-4">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Tìm theo mã đơn, tên khách hàng..."
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
                <Popover open={customerPopoverOpen} onOpenChange={setCustomerPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={customerPopoverOpen}
                      className="w-[200px] justify-between"
                    >
                      {customerFilter !== 'all'
                        ? uniqueCustomers.find((c) => c.id === customerFilter)?.name
                        : "Lọc theo khách hàng"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[200px] p-0">
                    <Command>
                      <CommandInput placeholder="Tìm khách hàng..." />
                      <CommandList>
                        <CommandEmpty>Không tìm thấy khách hàng.</CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                              key="all"
                              value="all"
                              onSelect={() => {
                                setCustomerFilter("all");
                                setCustomerPopoverOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  customerFilter === "all" ? "opacity-100" : "opacity-0"
                                )}
                              />
                              Tất cả khách hàng
                            </CommandItem>
                          {uniqueCustomers.map((customer) => (
                            <CommandItem
                              key={customer.id}
                              value={customer.name}
                              onSelect={() => {
                                setCustomerFilter(customer.id);
                                setCustomerPopoverOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  customerFilter === customer.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {customer.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {customerFilter !== 'all' && (
                  <Button variant="ghost" onClick={() => setCustomerFilter('all')}>Xóa bộ lọc khách hàng</Button>
                )}
                 <div className="ml-auto text-lg font-semibold">
                    Doanh thu: <span className="text-primary">{formatCurrency(totalRevenue)}</span>
                 </div>
           </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">STT</TableHead>
                    <SortableHeader sortKey="invoiceNumber">Mã đơn hàng</SortableHeader>
                    <SortableHeader sortKey="customer">Khách hàng</SortableHeader>
                    <SortableHeader sortKey="projectName" className="hidden lg:table-cell">Công trình</SortableHeader>
                    <SortableHeader sortKey="transactionDate" className="hidden md:table-cell">Ngày</SortableHeader>
                    <SortableHeader sortKey="status">Trạng thái</SortableHeader>
                    <SortableHeader sortKey="finalAmount" className="text-right">Tổng cộng</SortableHeader>
                    <TableHead>
                      <span className="sr-only">Hành động</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TooltipProvider>
                    {isLoading && <TableRow><TableCell colSpan={8} className="text-center h-24">Đang tải...</TableCell></TableRow>}
                    {!isLoading && sortedSales.map((sale, index) => {
                      const isReturnOrder = sale.finalAmount < 0;
                      // Check if this is a debt payment transaction
                      const isDebtPayment = (sale.totalAmount === 0 || !sale.totalAmount) && (sale.previousDebt ?? 0) > 0;
                      // For debt payment, display the amount paid (customerPayment or previousDebt)
                      const displayAmount = isDebtPayment ? (sale.customerPayment || sale.previousDebt || 0) : sale.finalAmount;
                      
                      return (
                        <TableRow key={sale.id}>
                          <TableCell className="font-medium">{index + 1}</TableCell>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              {isReturnOrder && (
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Undo2 className="h-4 w-4 text-muted-foreground" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Đơn hàng trả</p>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                              {sale.invoiceNumber}
                            </div>
                          </TableCell>
                          <TableCell>{sale.customerName || 'Khách lẻ'}</TableCell>
                          <TableCell className="hidden lg:table-cell">{sale.projectName || '-'}</TableCell>
                          <TableCell className="hidden md:table-cell">
                            {new Date(sale.transactionDate).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="p-1 h-auto" disabled={isUpdatingStatus || isDebtPayment}>
                                  <StatusBadge status={sale.status} size="sm" isDebtPayment={isDebtPayment} />
                                  <ChevronDown className="h-3 w-3 ml-1" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start">
                                <DropdownMenuItem 
                                  onClick={() => handleStatusChange(sale, 'pending')}
                                  disabled={sale.status === 'pending' || isUpdatingStatus}
                                >
                                  Chưa xử lý
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleStatusChange(sale, 'processed')}
                                  disabled={sale.status === 'processed' || isUpdatingStatus}
                                >
                                  Đã xử lý
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(displayAmount)}
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
                                  <Link href={`/sales/${sale.id}`}>Xem chi tiết</Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => window.open(`/sales/${sale.id}?print=true`, '_blank')}>In hóa đơn</DropdownMenuItem>
                                {permissions?.sales?.includes('delete') && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="text-destructive" onClick={() => setSaleToDelete(sale)}>
                                      Xóa
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {!isLoading && !sortedSales.length && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center h-24">
                          Không có đơn hàng nào phù hợp.
                        </TableCell>
                      </TableRow>
                    )}
                  </TooltipProvider>
                </TableBody>
              </Table>
            </CardContent>
            <CardFooter className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground">
                Hiển thị <strong>{sortedSales.length}</strong> trên <strong>{total}</strong>{" "}
                đơn hàng (Trang {page}/{totalPages})
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1 || isLoading}
                >
                  Trang trước
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages || isLoading}
                >
                  Trang sau
                </Button>
              </div>
            </CardFooter>
          </Card>
        </div>
      </>
    )
  }
