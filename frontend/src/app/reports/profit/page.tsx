'use client'

import { useState, useMemo, useEffect, useCallback } from "react"
import { Search, ArrowUp, ArrowDown, File, FileText, Calendar as CalendarIcon } from "lucide-react"
import * as xlsx from 'xlsx';
import { exportToPDF, formatCurrencyForExport } from "@/lib/export-utils"
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter as ShadcnTableFooter
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useStore } from "@/contexts/store-context"
import { formatCurrency, cn } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"

interface ProfitReportItem {
  productId: string;
  productName: string;
  barcode?: string;
  categoryName?: string;
  unitName?: string;
  totalQuantity: number;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  profitMargin: number;
}

interface ProfitReportResponse {
  success: boolean;
  data: ProfitReportItem[];
  totals: {
    totalQuantity: number;
    totalRevenue: number;
    totalCost: number;
    totalProfit: number;
    totalProducts: number;
    profitMargin: number;
  };
}

type SortKey = 'productName' | 'totalQuantity' | 'totalRevenue' | 'totalCost' | 'totalProfit';

export default function ProfitReportPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>('totalProfit');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [isLoading, setIsLoading] = useState(true);
  const [reportData, setReportData] = useState<ProfitReportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { currentStore } = useStore();

  const fetchReport = useCallback(async () => {
    if (!currentStore?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      const params: Record<string, string> = {};
      if (dateRange?.from) {
        params.dateFrom = dateRange.from.toISOString();
      }
      if (dateRange?.to) {
        params.dateTo = dateRange.to.toISOString();
      }
      params.groupBy = 'product';

      // Get token from localStorage
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      
      const searchParams = new URLSearchParams(params);
      const response = await fetch(`/api/reports/profit?${searchParams.toString()}`, {
        headers: {
          'Content-Type': 'application/json',
          'X-Store-Id': currentStore.id,
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch report');
      }

      const data = await response.json();
      
      // Transform data to match expected format
      const transformedData: ProfitReportResponse = {
        success: true,
        data: data.data?.map((item: Record<string, unknown>) => ({
          productId: item.productId as string,
          productName: item.productName as string,
          totalQuantity: Number(item.totalQuantity) || 0,
          totalRevenue: Number(item.totalRevenue) || 0,
          totalCost: Number(item.totalCost) || 0,
          totalProfit: Number(item.profit) || 0,
          profitMargin: item.totalRevenue ? (Number(item.profit) / Number(item.totalRevenue) * 100) : 0,
        })) || [],
        totals: data.totals || {
          totalQuantity: 0,
          totalRevenue: 0,
          totalCost: 0,
          totalProfit: 0,
          totalProducts: data.total || 0,
          profitMargin: 0,
        },
      };

      setReportData(transformedData);
    } catch (err) {
      console.error('Error fetching profit report:', err);
      setError(err instanceof Error ? err.message : 'Đã xảy ra lỗi khi tải báo cáo');
    } finally {
      setIsLoading(false);
    }
  }, [currentStore?.id, dateRange]);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      fetchReport();
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [fetchReport]);

  const sortedData = useMemo(() => {
    if (!reportData?.data) return [];
    
    let sortableItems = [...reportData.data];
    sortableItems.sort((a, b) => {
      const valA = a[sortKey];
      const valB = b[sortKey];
      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortDirection === 'asc' ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
    });
    return sortableItems;
  }, [reportData, sortKey, sortDirection]);

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
      case 'this_week': setDateRange({ from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) }); break;
      case 'this_month': setDateRange({ from: startOfMonth(now), to: endOfMonth(now) }); break;
      case 'this_quarter': setDateRange({ from: startOfQuarter(now), to: endOfQuarter(now) }); break;
      case 'this_year': setDateRange({ from: startOfYear(now), to: endOfYear(now) }); break;
    }
  }

  const handleExportExcel = () => {
    const dataToExport = sortedData.map((data, index) => ({
      'STT': index + 1,
      'Sản phẩm': data.productName,
      'SL bán': data.totalQuantity,
      'Doanh thu': data.totalRevenue,
      'Giá vốn': data.totalCost,
      'Lợi nhuận': data.totalProfit,
    }));

    const worksheet = xlsx.utils.json_to_sheet(dataToExport);
    worksheet['!cols'] = [{ wch: 5 }, { wch: 40 }, { wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 20 }];
    const numberFormat = '#,##0';
    dataToExport.forEach((_, index) => {
      const rowIndex = index + 2;
      ['C', 'D', 'E', 'F'].forEach(col => {
        const cell = worksheet[`${col}${rowIndex}`];
        if (cell) cell.z = numberFormat;
      });
    });

    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "BaoCaoLoiNhuan");
    xlsx.writeFile(workbook, "bao_cao_loi_nhuan.xlsx");
  };

  const handleExportPDF = () => {
    const headers = ["STT", "Sản phẩm", "SL bán", "Doanh thu", "Giá vốn", "Lợi nhuận"];
    const data = sortedData.map((item, index) => [
      index + 1,
      item.productName,
      item.totalQuantity.toLocaleString(),
      formatCurrencyForExport(item.totalRevenue),
      formatCurrencyForExport(item.totalCost),
      formatCurrencyForExport(item.totalProfit),
    ]);

    const dateRangeStr = dateRange?.from 
      ? `${format(dateRange.from, "dd/MM/yyyy")} - ${dateRange.to ? format(dateRange.to, "dd/MM/yyyy") : format(dateRange.from, "dd/MM/yyyy")}`
      : 'Tất cả thời gian';

    exportToPDF(
      'BÁO CÁO LỢI NHUẬN THEO SẢN PHẨM',
      headers,
      data,
      'bao_cao_loi_nhuan',
      {
        orientation: 'portrait',
        dateRange: dateRangeStr,
        totals: [
          '',
          'Tổng cộng',
          '',
          formatCurrencyForExport(totalRow.totalRevenue),
          formatCurrencyForExport(totalRow.totalCost),
          formatCurrencyForExport(totalRow.totalProfit),
        ],
        columnAligns: ['center', 'left', 'right', 'right', 'right', 'right'],
      }
    );
  };

  const totalRow = reportData?.totals || { totalRevenue: 0, totalCost: 0, totalProfit: 0, profitMargin: 0 };

  const SortableHeader = ({ sortKey: key, children, className }: { sortKey: SortKey; children: React.ReactNode; className?: string }) => (
    <TableHead className={className}>
      <Button variant="ghost" onClick={() => handleSort(key)} className="px-2 py-1 h-auto">
        {children}
        {sortKey === key && (sortDirection === 'asc' ? <ArrowUp className="h-4 w-4 ml-2" /> : <ArrowDown className="h-4 w-4 ml-2" />)}
      </Button>
    </TableHead>
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>Báo cáo Lợi nhuận theo Sản phẩm</CardTitle>
            <CardDescription>
              Phân tích doanh thu, giá vốn và lợi nhuận của từng sản phẩm.
            </CardDescription>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Tổng lợi nhuận</p>
            <p className={`text-2xl font-bold ${totalRow.totalProfit >= 0 ? 'text-primary' : 'text-destructive'}`}>
              {formatCurrency(totalRow.totalProfit)}
            </p>
            <p className="text-xs text-muted-foreground">
              Biên lợi nhuận: {totalRow.profitMargin.toFixed(1)}%
            </p>
          </div>
        </div>
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
          <div className="relative ml-auto">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Tìm sản phẩm..."
              className="w-full rounded-lg bg-background pl-8 md:w-80"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button onClick={handleExportPDF} variant="outline">
            <FileText className="mr-2 h-4 w-4" />
            Xuất PDF
          </Button>
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
              <TableHead className="w-16">STT</TableHead>
              <SortableHeader sortKey="productName">Sản phẩm</SortableHeader>
              <SortableHeader sortKey="totalQuantity" className="text-right">SL bán</SortableHeader>
              <SortableHeader sortKey="totalRevenue" className="text-right">Doanh thu</SortableHeader>
              <SortableHeader sortKey="totalCost" className="text-right">Giá vốn</SortableHeader>
              <SortableHeader sortKey="totalProfit" className="text-right">Lợi nhuận</SortableHeader>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={6} className="text-center h-24">Đang tải và tính toán dữ liệu...</TableCell></TableRow>}
            {error && <TableRow><TableCell colSpan={6} className="text-center h-24 text-destructive">{error}</TableCell></TableRow>}
            {!isLoading && !error && sortedData.map((item, index) => (
              <TableRow key={item.productId}>
                <TableCell>{index + 1}</TableCell>
                <TableCell className="font-medium">{item.productName}</TableCell>
                <TableCell className="text-right">{item.totalQuantity.toLocaleString()}</TableCell>
                <TableCell className="text-right text-blue-600">{formatCurrency(item.totalRevenue)}</TableCell>
                <TableCell className="text-right text-orange-600">{formatCurrency(item.totalCost)}</TableCell>
                <TableCell className={`text-right font-semibold ${item.totalProfit >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                  {formatCurrency(item.totalProfit)}
                </TableCell>
              </TableRow>
            ))}
            {!isLoading && !error && sortedData.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center h-24">Không có dữ liệu.</TableCell></TableRow>
            )}
          </TableBody>
          <ShadcnTableFooter>
            <TableRow className="text-base font-bold">
              <TableCell colSpan={3}>Tổng cộng</TableCell>
              <TableCell className="text-right">{formatCurrency(totalRow.totalRevenue)}</TableCell>
              <TableCell className="text-right">{formatCurrency(totalRow.totalCost)}</TableCell>
              <TableCell className={`text-right ${totalRow.totalProfit >= 0 ? 'text-primary' : 'text-destructive'}`}>{formatCurrency(totalRow.totalProfit)}</TableCell>
            </TableRow>
          </ShadcnTableFooter>
        </Table>
      </CardContent>
      <CardFooter>
        <div className="text-xs text-muted-foreground">
          Hiển thị <strong>{sortedData.length}</strong> sản phẩm.
        </div>
      </CardFooter>
    </Card>
  );
}
