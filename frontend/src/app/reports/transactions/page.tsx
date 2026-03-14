
'use client'

import * as React from "react"
import { useState, useMemo, useEffect } from "react"
import Link from "next/link"
import { Search, ArrowUp, ArrowDown, File, Calendar as CalendarIcon, ChevronDown, ChevronRight, Undo2 } from "lucide-react"
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
  TableFooter as ShadcnTableFooter
} from "@/components/ui/table"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useStore } from "@/contexts/store-context"
import { Customer, Sale, Payment } from "@/lib/types"
import { formatCurrency, cn } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Badge } from "@/components/ui/badge"


export type CustomerTransactionHistoryInfo = {
  customerId: string;
  customerName: string;
  customerPhone?: string;
  openingBalance: number;
  incurredAmount: number;
  paidAmount: number;
  closingBalance: number;
  transactionsDuring: (Sale | Payment)[];
}

type SortKey = 'customerName' | 'openingBalance' | 'incurredAmount' | 'paidAmount' | 'closingBalance';
const WALK_IN_CUSTOMER_ID = 'walk-in-customer';

export default function TransactionHistoryPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>('closingBalance');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

  const { currentStore } = useStore();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [customersLoading, setCustomersLoading] = useState(true);
  const [salesLoading, setSalesLoading] = useState(true);
  const [paymentsLoading, setPaymentsLoading] = useState(true);

  useEffect(() => {
    if (!currentStore) return;

    const fetchData = async () => {
      try {
        setCustomersLoading(true);
        const customersData = await apiClient.getCustomers();
        // Handle both array and { data: array } response
        setCustomers(Array.isArray(customersData) ? customersData : (customersData as any).data || []);
        setCustomersLoading(false);

        setSalesLoading(true);
        const salesData = await apiClient.getSales();
        setSales(Array.isArray(salesData) ? salesData : (salesData as any).data || []);
        setSalesLoading(false);

        setPaymentsLoading(true);
        const paymentsData = await apiClient.getPayments();
        setPayments(Array.isArray(paymentsData) ? paymentsData : (paymentsData as any).data || []);
        setPaymentsLoading(false);
      } catch (error) {
        console.error('Error fetching transaction history data:', error);
        setCustomersLoading(false);
        setSalesLoading(false);
        setPaymentsLoading(false);
      }
    };

    fetchData();
  }, [currentStore]);

  const transactionHistoryData = useMemo((): CustomerTransactionHistoryInfo[] => {
    if (!customers || !sales || !payments || !dateRange?.from) return [];

    const fromDate = dateRange.from;
    const toDate = dateRange.to || fromDate;

    // Get all unique customer IDs from sales and payments
    const customerIdsInTransactions = new Set<string>();
    sales.forEach(s => {
      if (s.customerId) customerIdsInTransactions.add(s.customerId);
    });
    payments.forEach(p => {
      if (p.customerId) customerIdsInTransactions.add(p.customerId);
    });

    // Create customer entities including walk-in
    const allCustomerEntities: Customer[] = [
        ...customers,
    ];
    
    // Add walk-in customer if there are sales without customerId or with walk-in ID
    const hasWalkInSales = sales.some(s => !s.customerId || s.customerId === WALK_IN_CUSTOMER_ID);
    if (hasWalkInSales) {
      allCustomerEntities.push({ 
        id: WALK_IN_CUSTOMER_ID, 
        name: 'Khách lẻ',
        phone: '',
        email: '',
        address: '',
        customerType: 'personal',
        creditLimit: 0,
        createdAt: '',
        updatedAt: '',
      } as Customer);
    }

    return allCustomerEntities.map(customer => {
      // Match sales and payments for this customer
      // For walk-in customer, match sales without customerId or with walk-in ID
      const matchSale = (s: Sale) => {
        if (customer.id === WALK_IN_CUSTOMER_ID) {
          return !s.customerId || s.customerId === WALK_IN_CUSTOMER_ID;
        }
        return s.customerId === customer.id;
      };
      
      const matchPayment = (p: Payment) => p.customerId === customer.id;

      // Opening Balance
      const salesBefore = sales.filter(s => matchSale(s) && new Date(s.transactionDate) < fromDate);
      const paymentsBefore = payments.filter(p => matchPayment(p) && new Date(p.paymentDate) < fromDate);
      const openingBalance = salesBefore.reduce((sum, s) => sum + (s.finalAmount || 0), 0) - paymentsBefore.reduce((sum, p) => sum + p.amount, 0);

      // Transactions during the period
      const salesDuring = sales.filter(s => matchSale(s) && new Date(s.transactionDate) >= fromDate && new Date(s.transactionDate) <= toDate);
      const paymentsDuring = payments.filter(p => matchPayment(p) && new Date(p.paymentDate) >= fromDate && new Date(p.paymentDate) <= toDate);
      
      const incurredAmount = salesDuring.reduce((sum, s) => sum + (s.finalAmount || 0), 0);
      const paidAmount = paymentsDuring.reduce((sum, p) => sum + p.amount, 0);

      const closingBalance = openingBalance + incurredAmount - paidAmount;
      
      const transactionsDuring = [...salesDuring, ...paymentsDuring].sort((a, b) => {
          const dateA = new Date('transactionDate' in a ? a.transactionDate : a.paymentDate);
          const dateB = new Date('transactionDate' in b ? b.transactionDate : b.paymentDate);
          return dateB.getTime() - dateA.getTime();
      });

      return {
        customerId: customer.id,
        customerName: customer.name,
        customerPhone: customer.phone,
        openingBalance,
        incurredAmount,
        paidAmount,
        closingBalance,
        transactionsDuring,
      };
    }).filter(data => 
        data.openingBalance !== 0 || 
        data.incurredAmount !== 0 || 
        data.paidAmount !== 0 || 
        data.closingBalance !== 0
    );
  }, [customers, sales, payments, dateRange]);

  const filteredData = useMemo(() => {
    return transactionHistoryData.filter(data => 
        data.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (data.customerPhone && data.customerPhone.includes(searchTerm))
    );
  }, [transactionHistoryData, searchTerm]);

  const sortedData = useMemo(() => {
    let sortableItems = [...filteredData];
    sortableItems.sort((a, b) => {
        const valA = a[sortKey];
        const valB = b[sortKey];
        if (typeof valA === 'string' && typeof valB === 'string') {
          return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        return sortDirection === 'asc' ? valA - valB : valB - valA;
      });
    return sortableItems;
  }, [filteredData, sortKey, sortDirection]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const toggleRow = (customerId: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(customerId)) {
        newSet.delete(customerId);
      } else {
        newSet.add(customerId);
      }
      return newSet;
    });
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

  const totalRow = useMemo(() => {
    return sortedData.reduce((acc, curr) => ({
      openingBalance: acc.openingBalance + curr.openingBalance,
      incurredAmount: acc.incurredAmount + curr.incurredAmount,
      paidAmount: acc.paidAmount + curr.paidAmount,
      closingBalance: acc.closingBalance + curr.closingBalance,
    }), { openingBalance: 0, incurredAmount: 0, paidAmount: 0, closingBalance: 0 });
  }, [sortedData]);

  const handleExportExcel = () => {
    const dataToExport = sortedData.map((data, index) => ({
      'STT': index + 1,
      'Khách hàng': data.customerName,
      'Nợ đầu kỳ': data.openingBalance,
      'Phát sinh': data.incurredAmount,
      'Thanh toán': data.paidAmount,
      'Nợ cuối kỳ': data.closingBalance,
    }));

    const worksheet = xlsx.utils.json_to_sheet([...dataToExport, {
        'Khách hàng': 'Tổng cộng',
        'Nợ đầu kỳ': totalRow.openingBalance,
        'Phát sinh': totalRow.incurredAmount,
        'Thanh toán': totalRow.paidAmount,
        'Nợ cuối kỳ': totalRow.closingBalance,
    }]);

    worksheet['!cols'] = [ {wch: 5}, {wch: 30}, {wch: 20}, {wch: 20}, {wch: 20}, {wch: 20} ];
    const numberFormat = '#,##0';
    dataToExport.forEach((_, index) => {
       const rowIndex = index + 2;
       ['C', 'D', 'E', 'F'].forEach(col => {
           const cell = worksheet[`${col}${rowIndex}`];
           if(cell) cell.z = numberFormat;
       });
   });

   const totalRowIndex = dataToExport.length + 2;
    ['C', 'D', 'E', 'F'].forEach(col => {
      const cell = worksheet[`${col}${totalRowIndex}`];
      if(cell) {
        cell.z = numberFormat;
        cell.s = { font: { bold: true } };
      }
    });

    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "LichSuGiaoDich");
    xlsx.writeFile(workbook, "bao_cao_lich_su_giao_dich.xlsx");
  };

  const isLoading = customersLoading || salesLoading || paymentsLoading;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Báo cáo Lịch sử Giao dịch</CardTitle>
        <CardDescription>
          Phân tích chi tiết công nợ và các giao dịch của khách hàng trong một khoảng thời gian.
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
            <div className="relative ml-auto">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Tìm khách hàng..."
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
              <TableHead className="w-12"></TableHead>
              <SortableHeader sortKey="customerName">Khách hàng</SortableHeader>
              <SortableHeader sortKey="openingBalance" className="text-right">Nợ đầu kỳ</SortableHeader>
              <SortableHeader sortKey="incurredAmount" className="text-right">Phát sinh</SortableHeader>
              <SortableHeader sortKey="paidAmount" className="text-right">Thanh toán</SortableHeader>
              <SortableHeader sortKey="closingBalance" className="text-right">Nợ cuối kỳ</SortableHeader>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={6} className="text-center h-24">Đang tải dữ liệu...</TableCell></TableRow>}
            {!isLoading && sortedData.map((data) => {
              const isExpanded = expandedRows.has(data.customerId);
              return (
                <React.Fragment key={data.customerId}>
                  <TableRow className="cursor-pointer" onClick={() => toggleRow(data.customerId)}>
                    <TableCell>
                      {data.transactionsDuring.length > 0 && (
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </Button>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      {data.customerId === WALK_IN_CUSTOMER_ID ? (
                        <span>{data.customerName}</span>
                      ) : (
                        <Link href={`/customers/${data.customerId}`} className="hover:underline" onClick={e => e.stopPropagation()}>
                          {data.customerName}
                        </Link>
                      )}
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(data.openingBalance)}</TableCell>
                    <TableCell className="text-right text-blue-600">{formatCurrency(data.incurredAmount)}</TableCell>
                    <TableCell className="text-right text-green-600">{formatCurrency(data.paidAmount)}</TableCell>
                    <TableCell className={`text-right font-semibold ${data.closingBalance > 0 ? 'text-destructive' : ''}`}>{formatCurrency(data.closingBalance)}</TableCell>
                  </TableRow>
                  {isExpanded && data.transactionsDuring.length > 0 && (
                     <TableRow className="bg-muted/50 hover:bg-muted/50">
                        <TableCell colSpan={6}>
                          <div className="p-4">
                            <h4 className="font-semibold mb-2">Chi tiết giao dịch trong kỳ</h4>
                             <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-16">STT</TableHead>
                                  <TableHead>Ngày</TableHead>
                                  <TableHead>Loại giao dịch</TableHead>
                                  <TableHead>Ghi chú / Mã HĐ</TableHead>
                                  <TableHead className="text-right">Số tiền</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                <TooltipProvider>
                                {data.transactionsDuring.map((tx, index) => {
                                  const isSale = 'invoiceNumber' in tx;
                                  const isReturnOrder = isSale && tx.finalAmount < 0;
                                  return (
                                  <TableRow key={tx.id}>
                                    <TableCell>{index + 1}</TableCell>
                                    <TableCell>{format(new Date(isSale ? tx.transactionDate : tx.paymentDate), 'dd/MM/yyyy')}</TableCell>
                                    <TableCell>
                                        <Badge variant={isSale ? 'outline' : 'secondary'}>
                                            {isSale ? 'Bán hàng' : 'Thanh toán'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {isSale ? (
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
                                                <Link href={`/sales/${tx.id}`} className="hover:underline">{tx.invoiceNumber}</Link>
                                            </div>
                                        ) : tx.notes}
                                    </TableCell>
                                    <TableCell className={`text-right font-medium ${isSale ? 'text-blue-600' : 'text-green-600'}`}>
                                        {formatCurrency(isSale ? tx.finalAmount : tx.amount)}
                                    </TableCell>
                                  </TableRow>
                                )})}
                                </TooltipProvider>
                              </TableBody>
                            </Table>
                          </div>
                        </TableCell>
                      </TableRow>
                  )}
                </React.Fragment>
              )
            })}
            {!isLoading && sortedData.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-24">Không có dữ liệu giao dịch trong kỳ.</TableCell>
              </TableRow>
            )}
          </TableBody>
          <ShadcnTableFooter>
            <TableRow className="text-base font-bold">
              <TableCell colSpan={2}>Tổng cộng</TableCell>
              <TableCell className="text-right">{formatCurrency(totalRow.openingBalance)}</TableCell>
              <TableCell className="text-right">{formatCurrency(totalRow.incurredAmount)}</TableCell>
              <TableCell className="text-right">{formatCurrency(totalRow.paidAmount)}</TableCell>
              <TableCell className={`text-right ${totalRow.closingBalance > 0 ? 'text-destructive' : ''}`}>{formatCurrency(totalRow.closingBalance)}</TableCell>
            </TableRow>
          </ShadcnTableFooter>
        </Table>
      </CardContent>
       <CardFooter>
          <div className="text-xs text-muted-foreground">
            Hiển thị <strong>{sortedData.length}</strong> khách hàng có giao dịch trong kỳ.
          </div>
        </CardFooter>
    </Card>
  );
}
