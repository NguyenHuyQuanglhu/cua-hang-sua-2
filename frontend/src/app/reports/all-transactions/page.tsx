'use client'

import * as React from "react"
import { useState, useMemo, useEffect } from "react"
import Link from "next/link"
import { Search, ArrowUp, ArrowDown, File, Calendar as CalendarIcon, TrendingUp, TrendingDown, DollarSign, Package } from "lucide-react"
import * as xlsx from 'xlsx';
import { DateRange } from "react-day-picker"
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfYear, endOfYear, startOfQuarter, endOfQuarter } from "date-fns"
import { apiClient } from "@/lib/api-client"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useStore } from "@/contexts/store-context"
import { Sale, Payment, Purchase } from "@/lib/types"
import { formatCurrency, cn } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type TransactionType = 'sale' | 'purchase' | 'customer_payment' | 'supplier_payment';

interface UnifiedTransaction {
  id: string;
  date: Date;
  type: TransactionType;
  partnerName: string; // Customer or Supplier name
  partnerId: string;
  reference: string; // Invoice number or payment note
  amount: number;
  notes?: string;
  originalData: Sale | Payment | Purchase | any;
}

type SortKey = 'date' | 'type' | 'partnerName' | 'amount';

export default function AllTransactionsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [typeFilter, setTypeFilter] = useState<TransactionType | 'all'>('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

  const { currentStore } = useStore();

  const [sales, setSales] = useState<Sale[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [customerPayments, setCustomerPayments] = useState<Payment[]>([]);
  const [supplierPayments, setSupplierPayments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!currentStore) return;

    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        const [salesData, purchasesData, paymentsData, supplierPaymentsData] = await Promise.all([
          apiClient.getSales(),
          apiClient.getPurchases(),
          apiClient.getPayments(),
          apiClient.getSupplierPayments(),
        ]);

        setSales(Array.isArray(salesData) ? salesData : (salesData as any).data || []);
        setPurchases(Array.isArray(purchasesData) ? purchasesData : (purchasesData as any).data || []);
        setCustomerPayments(Array.isArray(paymentsData) ? paymentsData : (paymentsData as any).data || []);
        setSupplierPayments(Array.isArray(supplierPaymentsData) ? supplierPaymentsData : (supplierPaymentsData as any).data || []);
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching transactions:', error);
        setIsLoading(false);
      }
    };

    fetchData();
  }, [currentStore]);

  const unifiedTransactions = useMemo((): UnifiedTransaction[] => {
    const transactions: UnifiedTransaction[] = [];

    // Add sales
    sales.forEach(sale => {
      transactions.push({
        id: `sale-${sale.id}`,
        date: new Date(sale.transactionDate),
        type: 'sale',
        partnerName: (sale as any).customerName || 'Khách lẻ',
        partnerId: sale.customerId || '',
        reference: sale.invoiceNumber || '',
        amount: sale.finalAmount || 0,
        notes: (sale as any).notes,
        originalData: sale,
      });
    });

    // Add purchases
    purchases.forEach(purchase => {
      // Map field names from backend (camelCase) to expected format
      const purchaseDate = (purchase as any).importDate || purchase.purchaseDate;
      const invoiceNumber = (purchase as any).orderNumber || purchase.invoiceNumber;
      const supplierName = purchase.supplierName || 'Không rõ';
      
      // Use paidAmount if available, otherwise use totalAmount
      const displayAmount = purchase.paidAmount !== undefined ? purchase.paidAmount : purchase.totalAmount || 0;
      
      transactions.push({
        id: `purchase-${purchase.id}`,
        date: new Date(purchaseDate),
        type: 'purchase',
        partnerName: supplierName,
        partnerId: purchase.supplierId || '',
        reference: invoiceNumber || '',
        amount: displayAmount,
        notes: purchase.notes,
        originalData: purchase,
      });
    });

    // Add customer payments
    customerPayments.forEach(payment => {
      transactions.push({
        id: `customer-payment-${payment.id}`,
        date: new Date(payment.paymentDate),
        type: 'customer_payment',
        partnerName: (payment as any).customerName || 'Không rõ',
        partnerId: payment.customerId || '',
        reference: payment.notes || 'Thanh toán công nợ',
        amount: payment.amount || 0,
        notes: payment.notes,
        originalData: payment,
      });
    });

    // Add supplier payments
    supplierPayments.forEach(payment => {
      transactions.push({
        id: `supplier-payment-${payment.id}`,
        date: new Date(payment.paymentDate),
        type: 'supplier_payment',
        partnerName: payment.supplierName || 'Không rõ',
        partnerId: payment.supplierId || '',
        reference: payment.notes || 'Thanh toán công nợ NCC',
        amount: payment.amount || 0,
        notes: payment.notes,
        originalData: payment,
      });
    });

    return transactions;
  }, [sales, purchases, customerPayments, supplierPayments]);

  const filteredTransactions = useMemo(() => {
    let filtered = unifiedTransactions;

    // Filter by date range
    if (dateRange?.from) {
      const fromDate = dateRange.from;
      const toDate = dateRange.to || fromDate;
      filtered = filtered.filter(tx => tx.date >= fromDate && tx.date <= toDate);
    }

    // Filter by type
    if (typeFilter !== 'all') {
      filtered = filtered.filter(tx => tx.type === typeFilter);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(tx =>
        tx.partnerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.reference.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  }, [unifiedTransactions, dateRange, typeFilter, searchTerm]);

  const sortedTransactions = useMemo(() => {
    let sorted = [...filteredTransactions];
    sorted.sort((a, b) => {
      let valA: any = a[sortKey];
      let valB: any = b[sortKey];

      if (sortKey === 'date') {
        valA = a.date.getTime();
        valB = b.date.getTime();
      }

      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortDirection === 'asc' ? valA - valB : valB - valA;
    });
    return sorted;
  }, [filteredTransactions, sortKey, sortDirection]);

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
  };

  const SortableHeader = ({ sortKey: key, children, className }: { sortKey: SortKey; children: React.ReactNode; className?: string }) => (
    <TableHead className={className}>
      <Button variant="ghost" onClick={() => handleSort(key)} className="px-2 py-1 h-auto">
        {children}
        {sortKey === key && (
          sortDirection === 'asc' ? <ArrowUp className="h-4 w-4 ml-2" /> : <ArrowDown className="h-4 w-4 ml-2" />
        )}
      </Button>
    </TableHead>
  );

  const getTransactionTypeLabel = (type: TransactionType) => {
    switch (type) {
      case 'sale': return 'Bán hàng';
      case 'purchase': return 'Nhập hàng';
      case 'customer_payment': return 'Thu tiền KH';
      case 'supplier_payment': return 'Trả tiền NCC';
    }
  };

  const getTransactionTypeIcon = (type: TransactionType) => {
    switch (type) {
      case 'sale': return <TrendingUp className="h-4 w-4" />;
      case 'purchase': return <Package className="h-4 w-4" />;
      case 'customer_payment': return <DollarSign className="h-4 w-4" />;
      case 'supplier_payment': return <TrendingDown className="h-4 w-4" />;
    }
  };

  const getTransactionTypeVariant = (type: TransactionType): "default" | "secondary" | "destructive" | "outline" => {
    switch (type) {
      case 'sale': return 'default';
      case 'purchase': return 'secondary';
      case 'customer_payment': return 'outline';
      case 'supplier_payment': return 'destructive';
    }
  };

  const summary = useMemo(() => {
    return sortedTransactions.reduce((acc, tx) => {
      switch (tx.type) {
        case 'sale':
          acc.totalSales += tx.amount;
          
          const saleData = tx.originalData as any;
          const saleCustomerId = saleData.customerId || null;
          
          // Khách lẻ (không có customerId) không sinh ra phiếu 'customer_payment'.
          // Đối với khách lẻ, ta cộng thẳng vào doanh thu.
          // Đối với khách có tài khoản, tiền mặt thu được ĐÃ sinh ra phiếu 'customer_payment'
          // nên nếu cộng ở đây sẽ bị double count (nhân đôi số tiền thu được).
          if (!saleCustomerId) {
            acc.totalRevenue += tx.amount; 
          }
          break;
        case 'purchase':
          acc.totalPurchases += tx.amount;
          // Tính tổng tiền nhập hàng (để tính nợ NCC) - Khắc phục lỗi double tính thanh toán
          const purchase = tx.originalData as any;
          const totalAmount = purchase.totalAmount || 0;
          const paidAmount = purchase.paidAmount || 0;
          const supplierId = purchase.supplierId || null;
          
          acc.totalPurchaseAmount += totalAmount;
          
          // Nếu có NCC, paidAmount đã tự động tạo thành 1 phiếu supplier_payment.
          // Để tránh trừ 2 lần (double-count), ta chỉ cộng paidAmount nếu KHÔNG có NCC.
          if (!supplierId) {
            acc.totalPurchasePaid += paidAmount;
          }
          break;
        case 'customer_payment':
          acc.totalCustomerPayments += tx.amount;
          acc.totalRevenue += tx.amount; // Tổng thu từ thanh toán công nợ
          break;
        case 'supplier_payment':
          acc.totalSupplierPayments += tx.amount;
          break;
      }
      return acc;
    }, {
      totalSales: 0,
      totalPurchases: 0,
      totalCustomerPayments: 0,
      totalSupplierPayments: 0,
      totalRevenue: 0, // Tổng thu = bán hàng + thanh toán công nợ
      totalPurchaseAmount: 0, // Tổng tiền nhập hàng
      totalPurchasePaid: 0, // Tổng tiền đã trả NCC khi nhập
    });
  }, [sortedTransactions]);

  const handleExportExcel = () => {
    const dataToExport = sortedTransactions.map((tx, index) => ({
      'STT': index + 1,
      'Ngày': format(tx.date, 'dd/MM/yyyy'),
      'Loại giao dịch': getTransactionTypeLabel(tx.type),
      'Đối tác': tx.partnerName,
      'Tham chiếu': tx.reference,
      'Số tiền': tx.amount,
      'Ghi chú': tx.notes || '',
    }));

    const worksheet = xlsx.utils.json_to_sheet(dataToExport);
    worksheet['!cols'] = [
      { wch: 5 },
      { wch: 12 },
      { wch: 15 },
      { wch: 30 },
      { wch: 25 },
      { wch: 15 },
      { wch: 30 },
    ];

    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "TatCaGiaoDich");
    xlsx.writeFile(workbook, "tat_ca_giao_dich.xlsx");
  };

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Doanh thu bán hàng</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(summary.totalSales)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Đã thanh toán NCC</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{formatCurrency(summary.totalPurchases)}</div>
            <p className="text-xs text-muted-foreground mt-1">Số tiền đã trả cho nhà cung cấp</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Thu từ khách hàng</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{formatCurrency(summary.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground mt-1">Bán hàng + Thanh toán công nợ</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Trả nhà cung cấp</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(summary.totalPurchaseAmount - summary.totalPurchasePaid - summary.totalSupplierPayments)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Công nợ còn phải trả</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Table */}
      <Card>
        <CardHeader>
          <CardTitle>Tất Cả Giao Dịch</CardTitle>
          <CardDescription>
            Xem tổng hợp tất cả các giao dịch: bán hàng, nhập hàng, thanh toán khách hàng và nhà cung cấp.
          </CardDescription>
          <div className="flex flex-wrap items-center gap-4 pt-4">
            <Popover>
              <PopoverTrigger asChild>
                <Button id="date" variant={"outline"} className={cn("w-[300px] justify-start text-left font-normal", !dateRange && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (dateRange.to ? (<>{format(dateRange.from, "dd/MM/yyyy")} - {format(dateRange.to, "dd/MM/yyyy")}</>) : format(dateRange.from, "dd/MM/yyyy")) : (<span>Chọn kỳ báo cáo</span>)}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={setDateRange} numberOfMonths={2} />
                <div className="p-2 border-t grid grid-cols-3 gap-1">
                  <Button variant="ghost" size="sm" onClick={() => setDatePreset('this_week')}>Tuần này</Button>
                  <Button variant="ghost" size="sm" onClick={() => setDatePreset('this_month')}>Tháng này</Button>
                  <Button variant="ghost" size="sm" onClick={() => setDatePreset('this_quarter')}>Quý này</Button>
                  <Button variant="ghost" size="sm" onClick={() => setDatePreset('this_year')}>Năm nay</Button>
                  <Button variant="ghost" size="sm" onClick={() => setDatePreset('all')}>Tất cả</Button>
                </div>
              </PopoverContent>
            </Popover>

            <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as TransactionType | 'all')}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Lọc theo loại" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="sale">Bán hàng</SelectItem>
                <SelectItem value="purchase">Nhập hàng</SelectItem>
                <SelectItem value="customer_payment">Thu tiền KH</SelectItem>
                <SelectItem value="supplier_payment">Trả tiền NCC</SelectItem>
              </SelectContent>
            </Select>

            <div className="relative ml-auto">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Tìm đối tác hoặc tham chiếu..."
                className="w-full rounded-lg bg-background pl-8 md:w-80"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button onClick={handleExportExcel} variant="outline">
              <File className="mr-2 h-4 w-4" />
              Xuất Excel
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">STT</TableHead>
                <SortableHeader sortKey="date">Ngày</SortableHeader>
                <SortableHeader sortKey="type">Loại giao dịch</SortableHeader>
                <SortableHeader sortKey="partnerName">Đối tác</SortableHeader>
                <TableHead>Tham chiếu</TableHead>
                <SortableHeader sortKey="amount" className="text-right">Số tiền</SortableHeader>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={6} className="text-center h-24">Đang tải dữ liệu...</TableCell></TableRow>}
              {!isLoading && sortedTransactions.map((tx, index) => (
                <TableRow key={tx.id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{format(tx.date, 'dd/MM/yyyy HH:mm')}</TableCell>
                  <TableCell>
                    <Badge variant={getTransactionTypeVariant(tx.type)} className="flex items-center gap-1 w-fit">
                      {getTransactionTypeIcon(tx.type)}
                      {getTransactionTypeLabel(tx.type)}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{tx.partnerName}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{tx.reference}</TableCell>
                  <TableCell className={cn(
                    "text-right font-semibold",
                    tx.type === 'sale' || tx.type === 'customer_payment' ? 'text-green-600' : 'text-red-600'
                  )}>
                    {formatCurrency(tx.amount)}
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && sortedTransactions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center h-24">Không có giao dịch nào trong kỳ.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter>
          <div className="text-xs text-muted-foreground">
            Hiển thị <strong>{sortedTransactions.length}</strong> giao dịch.
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
