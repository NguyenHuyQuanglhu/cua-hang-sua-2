'use client'

import { useState, useMemo, useEffect } from "react"
import {
  Card,
  CardContent,
  CardDescription,
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
  TableFooter,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useStore } from "@/contexts/store-context"
import { Sale, PurchaseOrder, CashTransaction } from "@/lib/types"
import { formatCurrency, cn } from "@/lib/utils"
import { DateRange } from "react-day-picker"
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, startOfQuarter, endOfQuarter } from "date-fns"
import { Calendar as CalendarIcon, File, TrendingDown, TrendingUp } from "lucide-react"
import * as xlsx from 'xlsx';
import { fetchWithAuth } from "@/lib/fetch-with-auth"

type ReportScope = 'current' | 'all'

type StoreReportBucket = {
  storeId: string;
  storeName: string;
  sales: Sale[];
  purchases: PurchaseOrder[];
  cashTransactions: CashTransaction[];
}

type StoreComparisonRow = {
  storeId: string;
  storeName: string;
  revenue: number;
  purchaseCost: number;
  otherIncome: number;
  otherExpense: number;
  grossProfit: number;
  netIncome: number;
}

export default function IncomeStatementPage() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [reportScope, setReportScope] = useState<ReportScope>('current');
  const { currentStore, stores, user } = useStore();

  const [sales, setSales] = useState<Sale[]>([]);
  const [purchases, setPurchases] = useState<PurchaseOrder[]>([]);
  const [cashTransactions, setCashTransactions] = useState<CashTransaction[]>([]);
  const [storeBuckets, setStoreBuckets] = useState<StoreReportBucket[]>([]);
  const [salesLoading, setSalesLoading] = useState(true);
  const [purchasesLoading, setPurchasesLoading] = useState(true);
  const [cashTransactionsLoading, setCashTransactionsLoading] = useState(true);

  const normalizedRole = String(user?.role || '').toLowerCase();
  const activeStores = useMemo(() => stores.filter((store) => store.status !== 'inactive'), [stores]);
  const canViewAllStores =
    (normalizedRole === 'owner' || normalizedRole === 'company_manager' || normalizedRole === 'store_manager' || normalizedRole === 'admin')
    && activeStores.length > 1;

  useEffect(() => {
    if (!canViewAllStores && reportScope === 'all') {
      setReportScope('current');
    }
  }, [canViewAllStores, reportScope]);

  const extractDataArray = <T,>(payload: unknown): T[] => {
    if (Array.isArray(payload)) {
      return payload as T[];
    }

    if (payload && typeof payload === 'object' && Array.isArray((payload as { data?: unknown }).data)) {
      return (payload as { data: T[] }).data;
    }

    return [];
  };

  const extractTotalPages = (payload: unknown): number => {
    if (!payload || typeof payload !== 'object') {
      return 1;
    }

    const directTotalPages = Number((payload as { totalPages?: number }).totalPages || 0);
    const paginatedTotalPages = Number((payload as { pagination?: { totalPages?: number } }).pagination?.totalPages || 0);

    return Math.max(1, directTotalPages || paginatedTotalPages || 1);
  };

  const fetchPaginatedStoreData = async <T,>(endpoint: string, storeId: string): Promise<T[]> => {
    const collected: T[] = [];
    let page = 1;
    let totalPages = 1;

    do {
      const separator = endpoint.includes('?') ? '&' : '?';
      const response = await fetchWithAuth(`${endpoint}${separator}page=${page}&pageSize=500`, {
        headers: {
          'X-Store-Id': storeId,
        },
      });

      if (!response.ok) {
        throw new Error(`Không thể tải dữ liệu từ ${endpoint} cho cửa hàng ${storeId}`);
      }

      const payload = await response.json();
      collected.push(...extractDataArray<T>(payload));
      totalPages = extractTotalPages(payload);
      page += 1;
    } while (page <= totalPages);

    return collected;
  };

  useEffect(() => {
    if (!currentStore) return;

    const fetchData = async () => {
      try {
        setSalesLoading(true);
        setPurchasesLoading(true);
        setCashTransactionsLoading(true);

        const targetStores = canViewAllStores && reportScope === 'all'
          ? activeStores
          : [currentStore];

        if (targetStores.length === 0) {
          setSales([]);
          setPurchases([]);
          setCashTransactions([]);
          setStoreBuckets([]);
          return;
        }

        const perStoreData = await Promise.all(
          targetStores.map(async (store) => {
            const [storeSales, storePurchases, storeCashTransactions] = await Promise.all([
              fetchPaginatedStoreData<Sale>('/api/sales', store.id),
              fetchPaginatedStoreData<PurchaseOrder>('/api/purchases', store.id),
              fetchPaginatedStoreData<CashTransaction>('/api/cash-flow', store.id),
            ]);

            return {
              storeId: store.id,
              storeName: store.name,
              sales: storeSales,
              purchases: storePurchases,
              cashTransactions: storeCashTransactions,
            };
          })
        );

        setStoreBuckets(perStoreData);
        setSales(perStoreData.flatMap((entry) => entry.sales));
        setPurchases(perStoreData.flatMap((entry) => entry.purchases));
        setCashTransactions(perStoreData.flatMap((entry) => entry.cashTransactions));
      } catch (error) {
        console.error('Error fetching income statement data:', error);
        setSales([]);
        setPurchases([]);
        setCashTransactions([]);
        setStoreBuckets([]);
      } finally {
        setSalesLoading(false);
        setPurchasesLoading(false);
        setCashTransactionsLoading(false);
      }
    };

    fetchData();
  }, [activeStores, canViewAllStores, currentStore, reportScope]);

  const filteredData = useMemo(() => {
    const fromDate = dateRange?.from;
    const toDate = dateRange?.to;

    const filterByDate = (dateString: string) => {
        if (!fromDate || !toDate) return true;
        const date = new Date(dateString);
        return date >= fromDate && date <= toDate;
    };
    
    const filteredSales = sales?.filter(s => filterByDate(s.transactionDate)) || [];
    const filteredPurchases = purchases?.filter(p => filterByDate(p.importDate)) || [];
    const filteredCashThu = cashTransactions?.filter(t => t.type === 'thu' && filterByDate(t.transactionDate)) || [];
    const filteredCashChi = cashTransactions?.filter(t => t.type === 'chi' && filterByDate(t.transactionDate)) || [];

    return { filteredSales, filteredPurchases, filteredCashThu, filteredCashChi };

  }, [sales, purchases, cashTransactions, dateRange]);


  const totalRevenue = useMemo(() => filteredData.filteredSales.reduce((sum, s) => sum + s.finalAmount, 0), [filteredData.filteredSales]);
  const totalPurchaseCost = useMemo(() => filteredData.filteredPurchases.reduce((sum, p) => sum + p.totalAmount, 0), [filteredData.filteredPurchases]);
  const totalOtherIncome = useMemo(() => filteredData.filteredCashThu.reduce((sum, t) => sum + t.amount, 0), [filteredData.filteredCashThu]);
  const totalOtherExpense = useMemo(() => filteredData.filteredCashChi.reduce((sum, t) => sum + t.amount, 0), [filteredData.filteredCashChi]);
  
  const grossProfit = totalRevenue - totalPurchaseCost;
  const netIncome = grossProfit + totalOtherIncome - totalOtherExpense;

  const storeComparisonRows = useMemo<StoreComparisonRow[]>(() => {
    const fromDate = dateRange?.from;
    const toDate = dateRange?.to;

    const filterByDate = (dateString: string) => {
      if (!fromDate || !toDate) return true;
      const date = new Date(dateString);
      return date >= fromDate && date <= toDate;
    };

    return storeBuckets.map((bucket) => {
      const salesInRange = bucket.sales.filter((sale) => filterByDate(sale.transactionDate));
      const purchasesInRange = bucket.purchases.filter((purchase) => filterByDate(purchase.importDate));
      const cashThuInRange = bucket.cashTransactions.filter((transaction) => transaction.type === 'thu' && filterByDate(transaction.transactionDate));
      const cashChiInRange = bucket.cashTransactions.filter((transaction) => transaction.type === 'chi' && filterByDate(transaction.transactionDate));

      const revenue = salesInRange.reduce((sum, sale) => sum + Number(sale.finalAmount || 0), 0);
      const purchaseCost = purchasesInRange.reduce((sum, purchase) => sum + Number(purchase.totalAmount || 0), 0);
      const otherIncome = cashThuInRange.reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
      const otherExpense = cashChiInRange.reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
      const gross = revenue - purchaseCost;
      const net = gross + otherIncome - otherExpense;

      return {
        storeId: bucket.storeId,
        storeName: bucket.storeName,
        revenue,
        purchaseCost,
        otherIncome,
        otherExpense,
        grossProfit: gross,
        netIncome: net,
      };
    }).sort((a, b) => b.netIncome - a.netIncome);
  }, [dateRange, storeBuckets]);

  const comparisonTotals = useMemo(() => {
    return storeComparisonRows.reduce(
      (acc, row) => {
        acc.revenue += row.revenue;
        acc.purchaseCost += row.purchaseCost;
        acc.otherIncome += row.otherIncome;
        acc.otherExpense += row.otherExpense;
        acc.grossProfit += row.grossProfit;
        acc.netIncome += row.netIncome;
        return acc;
      },
      {
        revenue: 0,
        purchaseCost: 0,
        otherIncome: 0,
        otherExpense: 0,
        grossProfit: 0,
        netIncome: 0,
      }
    );
  }, [storeComparisonRows]);

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

  const handleExportExcel = () => {
    const data = [
      { Category: 'Doanh thu', Description: 'Tổng doanh thu bán hàng', Amount: totalRevenue },
      { Category: 'Chi phí', Description: 'Tổng chi phí nhập hàng', Amount: -totalPurchaseCost },
      { Category: 'Thu nhập khác', Description: 'Tổng thu từ sổ quỹ', Amount: totalOtherIncome },
      { Category: 'Chi phí khác', Description: 'Tổng chi từ sổ quỹ', Amount: -totalOtherExpense },
    ];

    const worksheet = xlsx.utils.json_to_sheet(data);
    const summary = [
        [],
        { A: 'Lợi nhuận gộp', B: grossProfit },
        { A: 'Lợi nhuận ròng', B: netIncome },
    ];
    xlsx.utils.sheet_add_json(worksheet, summary, { origin: -1, skipHeader: true });

    worksheet['!cols'] = [ {wch: 20}, {wch: 40}, {wch: 20} ];
    
    const numberFormat = '#,##0';
    data.forEach((_, index) => {
        worksheet[`C${index + 2}`].z = numberFormat;
    });
    worksheet[`B${data.length + 3}`].z = numberFormat;
    worksheet[`B${data.length + 4}`].z = numberFormat;
    
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "BaoCaoThuChi");

    xlsx.writeFile(workbook, "bao_cao_thu_chi.xlsx");
  };

  const isLoading = salesLoading || purchasesLoading || cashTransactionsLoading;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Báo cáo Kết quả Kinh doanh (Thu-Chi)</CardTitle>
        <CardDescription>
          Tổng hợp doanh thu và chi phí để tính toán lợi nhuận trong khoảng thời gian đã chọn.
        </CardDescription>
        <div className="flex flex-wrap items-center gap-4 pt-4">
            <Popover>
              <PopoverTrigger asChild>
                <Button id="date" variant={"outline"} className={cn("w-[300px] justify-start text-left font-normal", !dateRange && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (dateRange.to ? (<>{format(dateRange.from, "dd/MM/yyyy")} - {format(dateRange.to, "dd/MM/yyyy")}</>) : format(dateRange.from, "dd/MM/yyyy")) : (<span>Tất cả thời gian</span>)}
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
            {canViewAllStores && (
              <Select value={reportScope} onValueChange={(value) => setReportScope(value as ReportScope)}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Phạm vi báo cáo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current">Cửa hàng hiện tại</SelectItem>
                  <SelectItem value="all">Tất cả cửa hàng được gán</SelectItem>
                </SelectContent>
              </Select>
            )}
            <Button onClick={handleExportExcel} variant="outline" className="ml-auto">
              <File className="mr-2 h-4 w-4" />
              Xuất Excel
            </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
            <p>Đang tải dữ liệu...</p>
        ) : (
        <div className="space-y-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Hạng mục</TableHead>
                <TableHead>Diễn giải</TableHead>
                <TableHead className="text-right">Số tiền</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium flex items-center gap-2"><TrendingUp className="h-4 w-4 text-green-500" /> Doanh thu</TableCell>
                <TableCell>Tổng doanh thu từ bán hàng</TableCell>
                <TableCell className="text-right">{formatCurrency(totalRevenue)}</TableCell>
              </TableRow>
               <TableRow>
                <TableCell className="font-medium flex items-center gap-2"><TrendingDown className="h-4 w-4 text-red-500" /> Chi phí nhập hàng</TableCell>
                <TableCell>Tổng chi phí từ các đơn nhập hàng</TableCell>
                <TableCell className="text-right text-destructive">-{formatCurrency(totalPurchaseCost)}</TableCell>
              </TableRow>
               <TableRow className="bg-muted/50 font-semibold">
                <TableCell colSpan={2}>Lợi nhuận gộp</TableCell>
                <TableCell className="text-right">{formatCurrency(grossProfit)}</TableCell>
              </TableRow>
               <TableRow>
                <TableCell className="font-medium flex items-center gap-2"><TrendingUp className="h-4 w-4 text-green-500" /> Thu nhập khác</TableCell>
                <TableCell>Tổng thu từ các phiếu thu trong sổ quỹ</TableCell>
                <TableCell className="text-right">{formatCurrency(totalOtherIncome)}</TableCell>
              </TableRow>
               <TableRow>
                <TableCell className="font-medium flex items-center gap-2"><TrendingDown className="h-4 w-4 text-red-500" /> Chi phí khác</TableCell>
                <TableCell>Tổng chi từ các phiếu chi trong sổ quỹ</TableCell>
                <TableCell className="text-right text-destructive">-{formatCurrency(totalOtherExpense)}</TableCell>
              </TableRow>
            </TableBody>
            <TableFooter>
              <TableRow className="text-lg font-bold">
                <TableCell colSpan={2}>Lợi nhuận ròng (Sau Thu & Chi khác)</TableCell>
                <TableCell className={`text-right ${netIncome >= 0 ? 'text-primary' : 'text-destructive'}`}>
                  {formatCurrency(netIncome)}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>

          {reportScope === 'all' && storeComparisonRows.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">So sánh kết quả kinh doanh giữa các cửa hàng trong khoảng thời gian đã chọn.</p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">#</TableHead>
                    <TableHead>Cửa hàng</TableHead>
                    <TableHead className="text-right">Doanh thu</TableHead>
                    <TableHead className="text-right">Chi phí nhập</TableHead>
                    <TableHead className="text-right">Thu khác</TableHead>
                    <TableHead className="text-right">Chi khác</TableHead>
                    <TableHead className="text-right">Lợi nhuận gộp</TableHead>
                    <TableHead className="text-right">Lợi nhuận ròng</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {storeComparisonRows.map((row, index) => (
                    <TableRow key={row.storeId}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell className="font-medium">{row.storeName}</TableCell>
                      <TableCell className="text-right">{formatCurrency(row.revenue)}</TableCell>
                      <TableCell className="text-right text-destructive">-{formatCurrency(row.purchaseCost)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(row.otherIncome)}</TableCell>
                      <TableCell className="text-right text-destructive">-{formatCurrency(row.otherExpense)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(row.grossProfit)}</TableCell>
                      <TableCell className={`text-right font-semibold ${row.netIncome >= 0 ? 'text-primary' : 'text-destructive'}`}>
                        {formatCurrency(row.netIncome)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={2} className="font-semibold">Tổng cộng</TableCell>
                    <TableCell className="text-right">{formatCurrency(comparisonTotals.revenue)}</TableCell>
                    <TableCell className="text-right text-destructive">-{formatCurrency(comparisonTotals.purchaseCost)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(comparisonTotals.otherIncome)}</TableCell>
                    <TableCell className="text-right text-destructive">-{formatCurrency(comparisonTotals.otherExpense)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(comparisonTotals.grossProfit)}</TableCell>
                    <TableCell className={`text-right font-bold ${comparisonTotals.netIncome >= 0 ? 'text-primary' : 'text-destructive'}`}>
                      {formatCurrency(comparisonTotals.netIncome)}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          )}
        </div>
        )}
      </CardContent>
    </Card>
  )
}
