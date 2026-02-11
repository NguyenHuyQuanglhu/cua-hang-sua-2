'use client'

import { useState, useMemo, useEffect, useCallback } from "react"
import Link from "next/link"
import { Search, ArrowUp, ArrowDown, File, FileText, Mail, MessageSquare, DollarSign } from "lucide-react"
import * as xlsx from 'xlsx';
import { exportToPDF, formatCurrencyForExport } from "@/lib/export-utils"
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
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useStore } from "@/contexts/store-context"
import { formatCurrency } from "@/lib/utils"
import { DebtReminderDialog } from "./components/debt-reminder-dialog"
import { RefundDialog } from "./components/refund-dialog"

export type CustomerDebtInfo = {
  customerId: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  totalSales: number;
  totalPayments: number;
  finalDebt: number;
}

interface DebtReportItem {
  customerId: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  creditLimit: number;
  totalSales: number;
  totalPayments: number;
  currentDebt: number;
  lastTransactionDate?: string;
  lastPaymentDate?: string;
  isOverCredit: boolean;
}

interface DebtReportResponse {
  success: boolean;
  data: DebtReportItem[];
  totals: {
    totalCustomers: number;
    totalSales: number;
    totalPayments: number;
    totalDebt: number;
  };
  overCreditCount: number;
}

type SortKey = 'name' | 'phone' | 'totalSales' | 'totalPayments' | 'totalDebt';

const formatPhoneNumber = (phone?: string) => {
  if (!phone) return 'N/A';
  const cleaned = phone.replace(/\s/g, '');
  if (cleaned.length === 10) {
    return `${cleaned.substring(0, 4)} ${cleaned.substring(4, 7)} ${cleaned.substring(7, 10)}`;
  }
  if (cleaned.length === 9) {
    return `${cleaned.substring(0, 3)} ${cleaned.substring(3, 6)} ${cleaned.substring(6, 9)}`;
  }
  return phone;
};

export default function DebtReportPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>('totalDebt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [isReminderDialogOpen, setIsReminderDialogOpen] = useState(false);
  const [selectedCustomerForReminder, setSelectedCustomerForReminder] = useState<CustomerDebtInfo | undefined>(undefined);
  const [isRefundDialogOpen, setIsRefundDialogOpen] = useState(false);
  const [selectedCustomerForRefund, setSelectedCustomerForRefund] = useState<{
    customerId: string;
    customerName: string;
    customerPhone?: string;
    excessAmount: number;
  } | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [reportData, setReportData] = useState<DebtReportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { currentStore } = useStore();

  const fetchReport = useCallback(async () => {
    if (!currentStore?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (searchTerm) {
        params.set('search', searchTerm);
      }

      const data = await apiClient.getDebtReport({ hasDebtOnly: false });
      setReportData(data);
    } catch (err) {
      console.error('Error fetching debt report:', err);
      setError('Đã xảy ra lỗi khi tải báo cáo');
    } finally {
      setIsLoading(false);
    }
  }, [currentStore?.id, searchTerm]);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      fetchReport();
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [fetchReport]);

  const sortedDebtData = useMemo(() => {
    if (!reportData?.data) return [];
    
    let sortableItems = [...reportData.data];
    sortableItems.sort((a, b) => {
      let valA: string | number, valB: string | number;

      if (sortKey === 'phone') {
        valA = a.phone || '';
        valB = b.phone || '';
      } else if (sortKey === 'totalDebt') {
        valA = a.totalDebt || 0;
        valB = b.totalDebt || 0;
      } else {
        valA = a[sortKey] as string | number;
        valB = b[sortKey] as string | number;
      }

      if (typeof valA === 'string' && typeof valB === 'string') {
        valA = valA.toLowerCase();
        valB = valB.toLowerCase();
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
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

  const handleOpenReminderDialog = (customer: any) => {
    setSelectedCustomerForReminder({
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      customerEmail: customer.email,
      totalSales: customer.totalSales || 0,
      totalPayments: customer.totalPayments || 0,
      finalDebt: customer.totalDebt || 0,
    });
    setIsReminderDialogOpen(true);
  }

  const handleOpenRefundDialog = (customer: any) => {
    setSelectedCustomerForRefund({
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      excessAmount: Math.abs(customer.totalDebt || 0), // Chuyển số âm thành số dương
    });
    setIsRefundDialogOpen(true);
  }

  const handleRefundSuccess = () => {
    fetchReport(); // Reload data after refund
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

  const totalRow = reportData?.totals || { totalSales: 0, totalPayments: 0, totalDebt: 0 };

  const handleExportExcel = () => {
    const dataToExport = sortedDebtData.map((data, index) => ({
      'STT': index + 1,
      'Tên khách hàng': data.name,
      'Số điện thoại': formatPhoneNumber(data.phone),
      'Tổng phát sinh': data.totalSales || 0,
      'Đã trả': data.totalPayments || 0,
      'Nợ cuối kỳ': data.totalDebt || 0,
    }));

    const totalRowData = {
      'STT': '',
      'Tên khách hàng': 'Tổng cộng',
      'Số điện thoại': '',
      'Tổng phát sinh': totalRow.totalSales,
      'Đã trả': totalRow.totalPayments,
      'Nợ cuối kỳ': totalRow.totalDebt,
    };

    const worksheet = xlsx.utils.json_to_sheet([...dataToExport, totalRowData]);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "BaoCaoCongNo");

    worksheet['!cols'] = [
      { wch: 5 },
      { wch: 30 },
      { wch: 15 },
      { wch: 20 },
      { wch: 20 },
      { wch: 20 },
    ];

    const numberFormat = '#,##0';
    dataToExport.forEach((_, index) => {
      const rowIndex = index + 2;
      ['D', 'E', 'F'].forEach(col => {
        const cell = worksheet[`${col}${rowIndex}`];
        if (cell) cell.z = numberFormat;
      });
    });
    const totalRowIndex = dataToExport.length + 2;
    ['D', 'E', 'F'].forEach(col => {
      const cell = worksheet[`${col}${totalRowIndex}`];
      if (cell) {
        cell.z = numberFormat;
      }
    });

    xlsx.writeFile(workbook, "bao_cao_cong_no.xlsx");
  };

  const handleExportPDF = () => {
    const headers = ["STT", "Tên khách hàng", "Số điện thoại", "Tổng phát sinh", "Đã trả", "Nợ cuối kỳ"];
    const data = sortedDebtData.map((item, index) => [
      index + 1,
      item.name,
      formatPhoneNumber(item.phone),
      formatCurrencyForExport(item.totalSales || 0),
      formatCurrencyForExport(item.totalPayments || 0),
      formatCurrencyForExport(item.totalDebt || 0),
    ]);

    exportToPDF(
      'BÁO CÁO CÔNG NỢ KHÁCH HÀNG',
      headers,
      data,
      'bao_cao_cong_no',
      {
        orientation: 'portrait',
        totals: [
          '',
          'Tổng cộng',
          '',
          formatCurrencyForExport(totalRow.totalSales),
          formatCurrencyForExport(totalRow.totalPayments),
          formatCurrencyForExport(totalRow.totalDebt),
        ],
        columnAligns: ['center', 'left', 'center', 'right', 'right', 'right'],
      }
    );
  };

  return (
    <>
      {selectedCustomerForReminder && (
        <DebtReminderDialog
          isOpen={isReminderDialogOpen}
          onOpenChange={setIsReminderDialogOpen}
          customer={selectedCustomerForReminder}
        />
      )}
      {selectedCustomerForRefund && (
        <RefundDialog
          isOpen={isRefundDialogOpen}
          onOpenChange={setIsRefundDialogOpen}
          customer={selectedCustomerForRefund}
          onSuccess={handleRefundSuccess}
        />
      )}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Báo cáo công nợ khách hàng</CardTitle>
              <CardDescription>
                Tổng hợp công nợ và thực hiện ghi nhận thanh toán nhanh cho khách hàng.
              </CardDescription>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Tổng nợ cuối kỳ</p>
              <p className={`text-2xl font-bold ${totalRow.totalDebt > 0 ? 'text-destructive' : 'text-primary'}`}>
                {formatCurrency(totalRow.totalDebt)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 pt-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Tìm kiếm theo tên hoặc SĐT..."
                className="w-full rounded-lg bg-background pl-8 md:w-80"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button onClick={handleExportPDF} variant="outline" className="ml-auto">
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
                <SortableHeader sortKey="name">Tên khách hàng</SortableHeader>
                <SortableHeader sortKey="phone">Số điện thoại</SortableHeader>
                <SortableHeader sortKey="totalSales" className="text-right">Tổng phát sinh</SortableHeader>
                <SortableHeader sortKey="totalPayments" className="text-right">Đã trả</SortableHeader>
                <SortableHeader sortKey="totalDebt" className="text-right">Nợ cuối kỳ</SortableHeader>
                <TableHead className="text-right">Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={7} className="text-center h-24">Đang tải dữ liệu...</TableCell></TableRow>}
              {error && <TableRow><TableCell colSpan={7} className="text-center h-24 text-destructive">{error}</TableCell></TableRow>}
              {!isLoading && !error && sortedDebtData.map((data, index) => (
                <TableRow key={data.id || `debt-${index}`} className={data.isOverCredit ? 'bg-destructive/10' : ''}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell className="font-medium">
                    <Link href={`/customers/${data.id}`} className="hover:underline">
                      {data.name}
                    </Link>
                  </TableCell>
                  <TableCell>{formatPhoneNumber(data.phone)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(data.totalSales || 0)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(data.totalPayments || 0)}</TableCell>
                  <TableCell className={`text-right font-semibold ${(data.totalDebt || 0) > 0 ? 'text-destructive' : (data.totalDebt || 0) < 0 ? 'text-primary' : ''}`}>
                    {formatCurrency(data.totalDebt || 0)}
                  </TableCell>
                  <TableCell className="text-right">
                    {(data.totalDebt || 0) > 0 && (
                      <Button variant="outline" size="sm" onClick={() => handleOpenReminderDialog(data)}>
                        <Mail className="mr-2 h-4 w-4" />
                        Nhắc nợ
                      </Button>
                    )}
                    {(data.totalDebt || 0) < 0 && (
                      <Button variant="default" size="sm" onClick={() => handleOpenRefundDialog(data)}>
                        <DollarSign className="mr-2 h-4 w-4" />
                        Hoàn tiền
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && !error && sortedDebtData.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center h-24">Không có dữ liệu công nợ.</TableCell>
                </TableRow>
              )}
            </TableBody>
            <ShadcnTableFooter>
              <TableRow className="text-base font-bold">
                <TableCell colSpan={3}>Tổng cộng</TableCell>
                <TableCell className="text-right">{formatCurrency(totalRow.totalSales)}</TableCell>
                <TableCell className="text-right">{formatCurrency(totalRow.totalPayments)}</TableCell>
                <TableCell className={`text-right ${totalRow.totalDebt > 0 ? 'text-destructive' : ''}`}>{formatCurrency(totalRow.totalDebt)}</TableCell>
                <TableCell></TableCell>
              </TableRow>
            </ShadcnTableFooter>
          </Table>
        </CardContent>
        <CardFooter>
          <div className="text-xs text-muted-foreground">
            Hiển thị <strong>{sortedDebtData.length}</strong> khách hàng có công nợ.
            {reportData?.overCreditCount ? (
              <span className="text-destructive ml-2">
                ({reportData.overCreditCount} khách hàng vượt hạn mức)
              </span>
            ) : null}
          </div>
        </CardFooter>
      </Card>
    </>
  )
}
