'use client'

import { useState, useMemo, useEffect } from "react"
import Link from "next/link"
import { Search, ArrowUp, ArrowDown, File, Calendar as CalendarIcon } from "lucide-react"
import * as xlsx from 'xlsx';
import { DateRange } from "react-day-picker"
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, startOfWeek, endOfWeek, startOfQuarter, endOfQuarter } from "date-fns"

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
import { apiClient } from "@/lib/api-client"
import { Product, PurchaseOrder, Unit } from "@/lib/types"
import { formatCurrency, cn } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"

type PurchaseReportItem = {
  purchaseOrderId: string;
  orderNumber: string;
  importDate: string;
  productId: string;
  productName: string;
  quantity: number;
  cost: number;
  unitId: string;
  unitName: string;
  lineTotal: number;
};

type SortKey = 'productName' | 'orderNumber' | 'importDate' | 'quantity' | 'cost' | 'lineTotal';

export default function PurchaseReportPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>('importDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

  const { currentStore } = useStore();

  const [products, setProducts] = useState<Product[]>([]);
  const [purchases, setPurchases] = useState<PurchaseOrder[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [purchasesLoading, setPurchasesLoading] = useState(true);
  const [unitsLoading, setUnitsLoading] = useState(true);

  useEffect(() => {
    if (!currentStore) return;

    const fetchData = async () => {
      try {
        setProductsLoading(true);
        const productsData = await apiClient.getProducts();
        setProducts((productsData as any).data || productsData || []);
        setProductsLoading(false);

        setPurchasesLoading(true);
        const purchasesData = await apiClient.getPurchases();
        setPurchases((purchasesData as any).data || purchasesData || []);
        setPurchasesLoading(false);

        setUnitsLoading(true);
        const unitsData = await apiClient.getUnits();
        setUnits((unitsData as any).data || unitsData || []);
        setUnitsLoading(false);
      } catch (error) {
        console.error('Error fetching purchase report data:', error);
        setProductsLoading(false);
        setPurchasesLoading(false);
        setUnitsLoading(false);
      }
    };

    fetchData();
  }, [currentStore]);

  const productsMap = useMemo(() => new Map(products?.map(p => [p.id, p])), [products]);
  const unitsMap = useMemo(() => new Map(units?.map(u => [u.id, u])), [units]);

  const getUnitInfo = useMemo(() => (unitId: string) => {
    const unit = unitsMap.get(unitId);
    if (!unit) return { baseUnit: undefined, conversionFactor: 1, name: '' };

    if (unit.baseUnitId && unit.conversionFactor) {
      const baseUnit = unitsMap.get(unit.baseUnitId);
      return { baseUnit, conversionFactor: unit.conversionFactor, name: unit.name };
    }

    return { baseUnit: unit, conversionFactor: 1, name: unit.name };
  }, [unitsMap]);


  const purchaseReportData = useMemo((): PurchaseReportItem[] => {
    if (!purchases || !productsMap.size || !unitsMap.size) return [];

    const reportItems: PurchaseReportItem[] = [];

    const filteredPurchases = purchases.filter(purchase => {
      if (!dateRange || !dateRange.from) return true;
      const importDate = new Date(purchase.importDate);
      const toDate = dateRange.to || dateRange.from;
      return importDate >= dateRange.from && importDate <= toDate;
    });

    filteredPurchases.forEach(purchase => {
      purchase.items.forEach(item => {
        const product = productsMap.get(item.productId);
        if (!product) return;

        const importUnitInfo = getUnitInfo(item.unitId);
        const baseUnitForCost = importUnitInfo.baseUnit || unitsMap.get(item.unitId);
        const lineTotal = item.quantity * importUnitInfo.conversionFactor * item.cost;

        reportItems.push({
          purchaseOrderId: purchase.id,
          orderNumber: purchase.orderNumber,
          importDate: purchase.importDate,
          productId: item.productId,
          productName: product.name,
          quantity: item.quantity,
          cost: item.cost,
          unitId: item.unitId,
          unitName: importUnitInfo.name,
          lineTotal: lineTotal,
        });
      });
    });

    return reportItems;
  }, [purchases, productsMap, unitsMap, dateRange, getUnitInfo]);

  const filteredReportData = useMemo(() => {
    return purchaseReportData.filter(data =>
      data.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      data.orderNumber.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [purchaseReportData, searchTerm]);

  const sortedReportData = useMemo(() => {
    let sortableItems = [...filteredReportData];
    if (sortKey) {
      sortableItems.sort((a, b) => {
        const valA = a[sortKey];
        const valB = b[sortKey];

        if (typeof valA === 'string' && typeof valB === 'string') {
          return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortDirection === 'asc' ? valA - valB : valB - valA;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [filteredReportData, sortKey, sortDirection]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
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
    const dataToExport = sortedReportData.map((data, index) => ({
      'STT': index + 1,
      'Mã phiếu nhập': data.orderNumber,
      'Ngày nhập': format(new Date(data.importDate), 'dd/MM/yyyy'),
      'Tên sản phẩm': data.productName,
      'Số lượng': data.quantity,
      'Đơn vị': data.unitName,
      'Giá nhập': data.cost,
      'Thành tiền': data.lineTotal,
    }));

    const totalAmount = sortedReportData.reduce((sum, item) => sum + item.lineTotal, 0);
    const totalRowData = {
      'Tên sản phẩm': 'Tổng cộng',
      'Thành tiền': totalAmount,
    };

    const worksheet = xlsx.utils.json_to_sheet([...dataToExport, totalRowData]);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "BaoCaoNhapHang");

    worksheet['!cols'] = [{ wch: 5 }, { wch: 20 }, { wch: 15 }, { wch: 40 }, { wch: 10 }, { wch: 10 }, { wch: 15 }, { wch: 20 }];

    const numberFormat = '#,##0';
    dataToExport.forEach((_, index) => {
      const rowIndex = index + 2;
      ['G', 'H'].forEach(col => {
        const cell = worksheet[`${col}${rowIndex}`];
        if (cell) cell.z = numberFormat;
      });
    });

    const totalRowIndex = dataToExport.length + 2;
    worksheet[`H${totalRowIndex}`].z = numberFormat;
    worksheet[`H${totalRowIndex}`].s = { font: { bold: true } };
    worksheet[`D${totalRowIndex}`].s = { font: { bold: true } };

    xlsx.writeFile(workbook, "bao_cao_chi_tiet_nhap_hang.xlsx");
  };

  const isLoading = productsLoading || purchasesLoading || unitsLoading;
  const totalAmount = useMemo(() => sortedReportData.reduce((acc, curr) => acc + curr.lineTotal, 0), [sortedReportData]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Báo cáo Chi tiết Nhập hàng</CardTitle>
        <CardDescription>
          Danh sách chi tiết các sản phẩm đã nhập trong khoảng thời gian đã chọn.
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
              placeholder="Tìm sản phẩm, mã phiếu..."
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
              <TableHead className="w-16">STT</TableHead>
              <SortableHeader sortKey="orderNumber">Mã phiếu</SortableHeader>
              <SortableHeader sortKey="importDate">Ngày nhập</SortableHeader>
              <SortableHeader sortKey="productName">Tên sản phẩm</SortableHeader>
              <SortableHeader sortKey="quantity" className="text-right">Số lượng</SortableHeader>
              <TableHead className="text-center">Đơn vị</TableHead>
              <SortableHeader sortKey="cost" className="text-right">Giá nhập</SortableHeader>
              <SortableHeader sortKey="lineTotal" className="text-right">Thành tiền</SortableHeader>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={8} className="text-center h-24">Đang tải dữ liệu...</TableCell></TableRow>}
            {!isLoading && sortedReportData.map((data, index) => (
              <TableRow key={`${data.purchaseOrderId}-${data.productId}-${index}`}>
                <TableCell>{index + 1}</TableCell>
                <TableCell>
                  <Link href={`/purchases/${data.purchaseOrderId}`} className="hover:underline font-medium">
                    {data.orderNumber}
                  </Link>
                </TableCell>
                <TableCell>{format(new Date(data.importDate), 'dd/MM/yyyy')}</TableCell>
                <TableCell className="font-medium">{data.productName}</TableCell>
                <TableCell className="text-right">{data.quantity.toLocaleString()}</TableCell>
                <TableCell className="text-center">{data.unitName}</TableCell>
                <TableCell className="text-right">{formatCurrency(data.cost)}</TableCell>
                <TableCell className="text-right font-semibold text-primary">{formatCurrency(data.lineTotal)}</TableCell>
              </TableRow>
            ))}
            {!isLoading && sortedReportData.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center h-24">Không có dữ liệu nhập hàng trong khoảng thời gian đã chọn.</TableCell>
              </TableRow>
            )}
          </TableBody>
          <ShadcnTableFooter>
            <TableRow className="text-base font-bold">
              <TableCell colSpan={7}>Tổng cộng</TableCell>
              <TableCell className="text-right">{formatCurrency(totalAmount)}</TableCell>
            </TableRow>
          </ShadcnTableFooter>
        </Table>
      </CardContent>
      <CardFooter>
        <div className="text-xs text-muted-foreground">
          Hiển thị <strong>{sortedReportData.length}</strong> dòng chi tiết.
        </div>
      </CardFooter>
    </Card>
  );
}
