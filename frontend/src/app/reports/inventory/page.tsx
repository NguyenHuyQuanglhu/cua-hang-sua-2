'use client'

import { useState, useMemo, useEffect, useCallback } from "react"
import { Search, ArrowUp, ArrowDown, File, FileText, Calendar as CalendarIcon, Wrench } from "lucide-react"
import * as xlsx from 'xlsx';
import { exportToPDF, formatCurrencyForExport } from "@/lib/export-utils"
import { DateRange } from "react-day-picker"
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from "date-fns"
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
import { cn } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { InventoryAdjustmentForm } from "./components/adjustment-form";

interface InventoryReportItem {
  productId: string;
  productName: string;
  barcode?: string;
  categoryName?: string;
  unitName?: string;
  openingStock: number;
  importStock: number;
  exportStock: number;
  closingStock: number;
  averageCost: number;
  stockValue: number;
  lowStockThreshold: number;
  isLowStock: boolean;
}

interface InventoryReportResponse {
  success: boolean;
  data: InventoryReportItem[];
  totals: {
    totalProducts: number;
    totalOpeningStock: number;
    totalImportStock: number;
    totalExportStock: number;
    totalClosingStock: number;
    totalStockValue: number;
  };
  lowStockCount: number;
}

type SortKey = 'productName' | 'openingStock' | 'importStock' | 'exportStock' | 'closingStock';

export default function InventoryReportPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>('productName');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [productToAdjust, setProductToAdjust] = useState<InventoryReportItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reportData, setReportData] = useState<InventoryReportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { currentStore } = useStore();

  const fetchReport = useCallback(async () => {
    if (!currentStore?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      const params: any = {};
      if (dateRange?.from) {
        params.dateFrom = dateRange.from.toISOString();
      }
      if (dateRange?.to) {
        params.dateTo = dateRange.to.toISOString();
      }
      if (searchTerm) {
        params.search = searchTerm;
      }

      const data = await apiClient.getInventoryReport(params) as InventoryReportResponse;
      setReportData(data);
    } catch (err) {
      console.error('Error fetching inventory report:', err);
      setError('Đã xảy ra lỗi khi tải báo cáo');
    } finally {
      setIsLoading(false);
    }
  }, [currentStore?.id, dateRange, searchTerm]);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      fetchReport();
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [fetchReport]);

  const sortedReportData = useMemo(() => {
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

  const formatStock = (quantity: number, unitName?: string) => {
    if (quantity === 0) return "0";
    // Don't show negative inventory - show 0 instead
    const displayQuantity = Math.max(0, quantity);
    const formatted = displayQuantity.toLocaleString(undefined, { maximumFractionDigits: 2 });
    return unitName ? `${formatted} ${unitName}` : formatted;
  }

  const handleExportExcel = () => {
    const dataToExport = sortedReportData.map((data, index) => ({
      'STT': index + 1,
      'Sản phẩm': data.productName,
      'ĐVT': data.unitName || '',
      'Tồn đầu kỳ': data.openingStock,
      'Nhập trong kỳ': data.importStock,
      'Xuất trong kỳ': data.exportStock,
      'Tồn cuối kỳ': data.closingStock,
    }));

    const worksheet = xlsx.utils.json_to_sheet(dataToExport);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "BaoCaoTonKho");

    worksheet['!cols'] = [{ wch: 5 }, { wch: 40 }, { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
    const numberFormat = '#,##0';
    dataToExport.forEach((_, index) => {
      const rowIndex = index + 2;
      ['D', 'E', 'F', 'G'].forEach(col => {
        const cell = worksheet[`${col}${rowIndex}`];
        if (cell) cell.z = numberFormat;
      });
    });

    xlsx.writeFile(workbook, "bao_cao_ton_kho.xlsx");
  };

  const handleExportPDF = () => {
    const headers = ["STT", "Sản phẩm", "ĐVT", "Tồn đầu kỳ", "Nhập trong kỳ", "Xuất trong kỳ", "Tồn cuối kỳ"];
    const data = sortedReportData.map((item, index) => [
      index + 1,
      item.productName,
      item.unitName || '',
      item.openingStock.toLocaleString(),
      item.importStock.toLocaleString(),
      item.exportStock.toLocaleString(),
      item.closingStock.toLocaleString(),
    ]);

    const dateRangeStr = dateRange?.from 
      ? `${format(dateRange.from, "dd/MM/yyyy")} - ${dateRange.to ? format(dateRange.to, "dd/MM/yyyy") : format(dateRange.from, "dd/MM/yyyy")}`
      : 'Tất cả thời gian';

    const totals = reportData?.totals;
    exportToPDF(
      'BÁO CÁO NHẬP - XUẤT - TỒN',
      headers,
      data,
      'bao_cao_ton_kho',
      {
        orientation: 'landscape',
        dateRange: dateRangeStr,
        totals: totals ? [
          '',
          'Tổng cộng',
          '',
          totals.totalOpeningStock.toLocaleString(),
          totals.totalImportStock.toLocaleString(),
          totals.totalExportStock.toLocaleString(),
          totals.totalClosingStock.toLocaleString(),
        ] : undefined,
        columnAligns: ['center', 'left', 'center', 'right', 'right', 'right', 'right'],
      }
    );
  };
  
  const handleOpenAdjustment = (item: InventoryReportItem) => {
    setProductToAdjust(item);
  };

  return (
    <>
      {productToAdjust && (
        <InventoryAdjustmentForm
          isOpen={!!productToAdjust}
          onOpenChange={() => setProductToAdjust(null)}
          productInfo={{
            productId: productToAdjust.productId,
            productName: productToAdjust.productName,
            closingStock: productToAdjust.closingStock,
            mainUnit: undefined, // We'll let the form fetch units
            baseUnit: undefined, // We'll let the form fetch units
          }}
        />
      )}
      <Card>
        <CardHeader>
          <CardTitle>Báo cáo Nhập - Xuất - Tồn</CardTitle>
          <CardDescription>
            Xem lại lịch sử nhập, xuất và tồn kho của sản phẩm trong một khoảng thời gian.
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
                <TableHead>ĐVT</TableHead>
                <SortableHeader sortKey="openingStock" className="text-right">Tồn đầu kỳ</SortableHeader>
                <SortableHeader sortKey="importStock" className="text-right">Nhập trong kỳ</SortableHeader>
                <SortableHeader sortKey="exportStock" className="text-right">Xuất trong kỳ</SortableHeader>
                <SortableHeader sortKey="closingStock" className="text-right">Tồn cuối kỳ</SortableHeader>
                <TableHead className="text-center">Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={8} className="text-center h-24">Đang tải dữ liệu...</TableCell></TableRow>}
              {error && <TableRow><TableCell colSpan={8} className="text-center h-24 text-destructive">{error}</TableCell></TableRow>}
              {!isLoading && !error && sortedReportData.map((data, index) => (
                <TableRow key={data.productId} className={data.isLowStock ? 'bg-destructive/10' : ''}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell className="font-medium">{data.productName}</TableCell>
                  <TableCell>{data.unitName}</TableCell>
                  <TableCell className="text-right">{formatStock(data.openingStock, data.unitName)}</TableCell>
                  <TableCell className="text-right text-green-600">
                    {data.importStock > 0 ? `+${formatStock(data.importStock, data.unitName)}` : '0'}
                  </TableCell>
                  <TableCell className="text-right text-red-600">
                    {data.exportStock > 0 ? `-${formatStock(data.exportStock, data.unitName)}` : '0'}
                  </TableCell>
                  <TableCell className="text-right font-semibold">{formatStock(data.closingStock, data.unitName)}</TableCell>
                  <TableCell className="text-center">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenAdjustment(data)}>
                      <Wrench className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && !error && sortedReportData.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center h-24">Không có dữ liệu tồn kho.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter>
          <div className="text-xs text-muted-foreground">
            Hiển thị <strong>{sortedReportData.length}</strong> sản phẩm.
            {reportData?.lowStockCount ? (
              <span className="text-destructive ml-2">
                ({reportData.lowStockCount} sản phẩm sắp hết hàng)
              </span>
            ) : null}
          </div>
        </CardFooter>
      </Card>
    </>
  );
}
