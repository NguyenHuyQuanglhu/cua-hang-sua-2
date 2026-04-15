'use client'

import { useState, useMemo, useEffect, useCallback } from "react"
import { apiClient } from "@/lib/api-client"
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useStore } from "@/contexts/store-context"
import { formatCurrency, cn } from "@/lib/utils"
import { DateRange } from "react-day-picker"
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, startOfQuarter, endOfQuarter } from "date-fns"
import { Calendar as CalendarIcon, File, FileText, Undo2 } from "lucide-react"
import * as xlsx from 'xlsx';
import { exportToPDF, formatCurrencyForExport, formatDateForExport } from "@/lib/export-utils"
import { RevenueChart } from "./components/revenue-chart"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"

export type RevenueChartPoint = {
  label: string;
  revenue: number;
  salesCount: number;
}

interface SalesSummary {
  date: string;
  totalSales: number;
  totalRevenue: number;
  totalVat: number;
  totalDiscount: number;
  netRevenue: number;
}

interface SaleDetail {
  id: string;
  invoiceNumber: string;
  customerName: string;
  transactionDate: string;
  totalAmount: number;
  vatAmount: number;
  discount: number;
  finalAmount: number;
  status: string;
}

interface SalesReportResponse {
  success: boolean;
  summary: {
    totalOrders: number;
    totalRevenue: number;
    totalVat: number;
    totalDiscount: number;
    netRevenue: number;
  };
  dailySummary: SalesSummary[];
  totals: {
    totalSales: number;
    totalRevenue: number;
    totalVat: number;
    totalDiscount: number;
    netRevenue: number;
  };
  details?: SaleDetail[];
}

export default function RevenueReportPage() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [isLoading, setIsLoading] = useState(true);
  const [reportData, setReportData] = useState<SalesReportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { currentStore } = useStore();
  const { toast } = useToast();

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
      params.includeDetails = true;

      const data = await apiClient.getSalesReport(params);
      setReportData(data as SalesReportResponse);
    } catch (err) {
      console.error('Error fetching sales report:', err);
      setError('Đã xảy ra lỗi khi tải báo cáo');
    } finally {
      setIsLoading(false);
    }
  }, [currentStore?.id, dateRange]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const isSingleMonthSelected = useMemo(() => {
    const from = dateRange?.from;
    const to = dateRange?.to || dateRange?.from;
    if (!from || !to) {
      return false;
    }

    return from.getFullYear() === to.getFullYear() && from.getMonth() === to.getMonth();
  }, [dateRange]);

  const chartData = useMemo((): RevenueChartPoint[] => {
    if (!reportData?.dailySummary) return [];

    const sortedDailySummary = [...reportData.dailySummary].sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    if (isSingleMonthSelected) {
      return sortedDailySummary.map((summary) => ({
        label: format(new Date(summary.date), "dd/MM"),
        revenue: summary.netRevenue,
        salesCount: summary.totalSales,
      }));
    }

    const groupedByMonth = new Map<string, { revenue: number; salesCount: number }>();

    sortedDailySummary.forEach((summary) => {
      const key = format(new Date(summary.date), "yyyy-MM");
      const current = groupedByMonth.get(key) || { revenue: 0, salesCount: 0 };
      current.revenue += summary.netRevenue;
      current.salesCount += summary.totalSales;
      groupedByMonth.set(key, current);
    });

    return Array.from(groupedByMonth.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([monthKey, values]) => {
        const [year, month] = monthKey.split("-");
        return {
          label: `Tháng ${Number(month)}/${year}`,
          revenue: values.revenue,
          salesCount: values.salesCount,
        };
      });
  }, [isSingleMonthSelected, reportData]);

  const chartTitle = isSingleMonthSelected ? 'Biểu đồ doanh thu theo ngày' : 'Biểu đồ doanh thu theo tháng';

  const filteredSales = useMemo(() => {
    return reportData?.details || [];
  }, [reportData]);

  const totalRevenue = reportData?.totals?.netRevenue || 0;
  const totalSalesCount = reportData?.totals?.totalSales || 0;

  const setDatePreset = (preset: 'this_week' | 'this_month' | 'this_quarter' | 'this_year') => {
    const now = new Date();
    let nextRange: DateRange | undefined;
    let presetLabel = '';

    switch (preset) {
      case 'this_week':
        nextRange = { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) };
        presetLabel = 'Tuần này';
        break;
      case 'this_month':
        nextRange = { from: startOfMonth(now), to: endOfMonth(now) };
        presetLabel = 'Tháng này';
        break;
      case 'this_quarter':
        nextRange = { from: startOfQuarter(now), to: endOfQuarter(now) };
        presetLabel = 'Quý này';
        break;
      case 'this_year':
        nextRange = { from: startOfYear(now), to: endOfYear(now) };
        presetLabel = 'Năm này';
        break;
    }

    if (nextRange?.from && nextRange?.to) {
      setDateRange(nextRange);
      toast({
        title: 'Đã chọn ngày thành công',
        description: `${presetLabel}: ${format(nextRange.from, "dd/MM/yyyy")} - ${format(nextRange.to, "dd/MM/yyyy")}`,
      });
    }
  }

  const handleExportExcel = () => {
    const header = ["STT", "Mã đơn hàng", "Khách hàng", "Ngày", "Doanh thu"];
    const body = filteredSales.map((sale, index) => [
      index + 1,
      sale.invoiceNumber,
      sale.customerName,
      format(new Date(sale.transactionDate), "dd/MM/yyyy"),
      sale.finalAmount,
    ]);

    const totalRow = ["", "Tổng cộng", "", "", totalRevenue];

    const worksheet = xlsx.utils.aoa_to_sheet([header, ...body, totalRow]);
    
    worksheet['!cols'] = [
      { wch: 5 }, { wch: 20 }, { wch: 30 }, { wch: 15 }, { wch: 20 }
    ];

    const numberFormat = '#,##0';
    body.forEach((_, index) => {
      const rowIndex = index + 2;
      const cell = worksheet[`E${rowIndex}`];
      if (cell) cell.z = numberFormat;
    });
    
    const totalRowIndex = body.length + 2;
    if (worksheet[`E${totalRowIndex}`]) worksheet[`E${totalRowIndex}`].z = numberFormat;

    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "BaoCaoDoanhThuChiTiet");

    xlsx.writeFile(workbook, "bao_cao_doanh_thu_chi_tiet.xlsx");
  };

  const handleExportPDF = () => {
    const headers = ["STT", "Mã đơn hàng", "Khách hàng", "Ngày", "Doanh thu"];
    const data = filteredSales.map((sale, index) => [
      index + 1,
      sale.invoiceNumber,
      sale.customerName,
      formatDateForExport(sale.transactionDate),
      formatCurrencyForExport(sale.finalAmount),
    ]);

    const dateRangeStr = dateRange?.from 
      ? `${format(dateRange.from, "dd/MM/yyyy")} - ${dateRange.to ? format(dateRange.to, "dd/MM/yyyy") : format(dateRange.from, "dd/MM/yyyy")}`
      : 'Tất cả thời gian';

    exportToPDF(
      'BÁO CÁO DOANH THU CHI TIẾT',
      headers,
      data,
      'bao_cao_doanh_thu_chi_tiet',
      {
        orientation: 'portrait',
        dateRange: dateRangeStr,
        totals: ['', 'Tổng cộng', '', '', formatCurrencyForExport(totalRevenue)],
        columnAligns: ['center', 'left', 'left', 'center', 'right'],
      }
    );
  };

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Báo cáo Doanh thu Chi tiết</CardTitle>
          <CardDescription>
            Phân tích chi tiết doanh thu theo từng đơn hàng trong khoảng thời gian đã chọn.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="date"
                  variant={"outline"}
                  className={cn(
                    "w-[300px] justify-start text-left font-normal",
                    !dateRange && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "dd/MM/yyyy")} -{" "}
                        {format(dateRange.to, "dd/MM/yyyy")}
                      </>
                    ) : (
                      format(dateRange.from, "dd/MM/yyyy")
                    )
                  ) : (
                    <span>Chọn ngày</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                />
                <div className="p-2 border-t flex justify-around">
                  <Button variant="ghost" size="sm" onClick={() => setDatePreset('this_week')}>Tuần này</Button>
                  <Button variant="ghost" size="sm" onClick={() => setDatePreset('this_month')}>Tháng này</Button>
                  <Button variant="ghost" size="sm" onClick={() => setDatePreset('this_quarter')}>Quý này</Button>
                  <Button variant="ghost" size="sm" onClick={() => setDatePreset('this_year')}>Năm nay</Button>
                </div>
              </PopoverContent>
            </Popover>
            <Button onClick={handleExportPDF} variant="outline" className="ml-auto">
              <FileText className="mr-2 h-4 w-4" />
              Xuất PDF
            </Button>
            <Button onClick={handleExportExcel} variant="outline">
              <File className="mr-2 h-4 w-4" />
              Xuất Excel
            </Button>
          </div>
           
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-2">{chartTitle}</h3>
            <RevenueChart data={chartData} />
          </div>

          <h3 className="text-lg font-semibold mb-2">Chi tiết các đơn hàng</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">STT</TableHead>
                <TableHead>Mã đơn hàng</TableHead>
                <TableHead>Khách hàng</TableHead>
                <TableHead>Ngày bán</TableHead>
                <TableHead className="text-right">Doanh thu</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TooltipProvider>
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      Đang tải dữ liệu...
                    </TableCell>
                  </TableRow>
                )}
                {error && (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-destructive">
                      {error}
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading && !error && filteredSales.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      Không có dữ liệu trong khoảng thời gian này.
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading && !error && filteredSales.map((sale, index) => {
                  const isReturnOrder = sale.finalAmount < 0;
                  return (
                    <TableRow key={sale.id}>
                      <TableCell>{index + 1}</TableCell>
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
                          <Link href={`/sales/${sale.id}`} className="hover:underline">
                            {sale.invoiceNumber}
                          </Link>
                        </div>
                      </TableCell>
                      <TableCell>{sale.customerName}</TableCell>
                      <TableCell>
                        {format(new Date(sale.transactionDate), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell className={`text-right font-semibold ${isReturnOrder ? 'text-destructive' : 'text-primary'}`}>
                        {formatCurrency(sale.finalAmount)}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TooltipProvider>
            </TableBody>
            <TableFooter>
              <TableRow className="text-base font-bold">
                <TableCell colSpan={4}>Tổng cộng ({totalSalesCount} đơn)</TableCell>
                <TableCell className="text-right">{formatCurrency(totalRevenue)}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
