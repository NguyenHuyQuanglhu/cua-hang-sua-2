

'use client'

import { useState, useMemo, useEffect } from "react"
import { Search, ArrowUp, ArrowDown, File } from "lucide-react"
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
import { Supplier, PurchaseOrder, SupplierPayment } from "@/lib/types"
import { formatCurrency } from "@/lib/utils"
import { SupplierPaymentForm } from "./components/supplier-payment-form"
import { fetchWithAuth } from "@/lib/fetch-with-auth"

export type SupplierDebtInfo = {
  supplierId: string;
  supplierName: string;
  supplierPhone?: string;
  totalPurchases: number;
  totalPayments: number;
  finalDebt: number;
}

type SortKey = 'supplierName' | 'supplierPhone' | 'totalPurchases' | 'totalPayments' | 'finalDebt';

export default function SupplierDebtReportPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>('finalDebt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [isPaymentFormOpen, setIsPaymentFormOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierDebtInfo | undefined>(undefined);

  const { currentStore } = useStore();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchases, setPurchases] = useState<PurchaseOrder[]>([]);
  const [payments, setPayments] = useState<SupplierPayment[]>([]);
  const [suppliersLoading, setSuppliersLoading] = useState(true);
  const [purchasesLoading, setPurchasesLoading] = useState(true);
  const [paymentsLoading, setPaymentsLoading] = useState(true);

  useEffect(() => {
    if (!currentStore) return;

    const fetchData = async () => {
      try {
        setSuppliersLoading(true);
        const suppliersRes = await fetchWithAuth('/api/suppliers');
        if (suppliersRes.ok) {
          const data = await suppliersRes.json();
          setSuppliers(Array.isArray(data) ? data : (data.data || []));
        }
        setSuppliersLoading(false);

        setPurchasesLoading(true);
        const purchasesRes = await fetchWithAuth('/api/purchases?pageSize=1000'); // Lấy tất cả purchase orders
        if (purchasesRes.ok) {
          const data = await purchasesRes.json();
          setPurchases(Array.isArray(data) ? data : (data.data || []));
        }
        setPurchasesLoading(false);

        setPaymentsLoading(true);
        const paymentsRes = await fetchWithAuth('/api/supplier-payments');
        if (paymentsRes.ok) {
          const data = await paymentsRes.json();
          setPayments(Array.isArray(data) ? data : (data.data || []));
        }
        setPaymentsLoading(false);
      } catch (error) {
        console.error('Error fetching supplier debt data:', error);
        setSuppliersLoading(false);
        setPurchasesLoading(false);
        setPaymentsLoading(false);
      }
    };

    fetchData();
  }, [currentStore]);

  const supplierDebtData = useMemo((): SupplierDebtInfo[] => {
    if (!suppliers || !purchases) return [];

    console.log('[supplierDebtData] First purchase:', purchases[0]);

    return suppliers.map(supplier => {
      const supplierPurchasesList = purchases.filter(p => p.supplierId === supplier.id);
      const totalPurchases = supplierPurchasesList.reduce((sum, p) => sum + (p.totalAmount || 0), 0);
      const totalPaid = supplierPurchasesList.reduce((sum, p) => sum + (p.paidAmount || 0), 0);
      // Use remaining_debt from purchases - this is the source of truth
      const finalDebt = supplierPurchasesList.reduce((sum, p) => sum + (p.remainingDebt || 0), 0);

      if (supplier.name.includes('Abbott')) {
        console.log('[supplierDebtData] Abbott:', {
          supplierPurchasesList,
          totalPurchases,
          totalPaid,
          finalDebt
        });
      }

      return {
        supplierId: supplier.id,
        supplierName: supplier.name,
        supplierPhone: supplier.phone,
        totalPurchases: totalPurchases,
        totalPayments: totalPaid,
        finalDebt: finalDebt,
      };
    }).filter(data => data.totalPurchases > 0 || data.totalPayments > 0); // Hiển thị nhà cung cấp có giao dịch (đã nhập hoặc đã thanh toán)
  }, [suppliers, purchases]);

  const filteredDebtData = useMemo(() => {
    let filtered = supplierDebtData;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(data => 
        data.supplierName.toLowerCase().includes(term) ||
        (data.supplierPhone && data.supplierPhone.includes(term))
      );
    }
    return filtered;
  }, [supplierDebtData, searchTerm]);

  const sortedDebtData = useMemo(() => {
    let sortableItems = [...filteredDebtData];
    if (sortKey) {
      sortableItems.sort((a, b) => {
        let valA = a[sortKey as keyof SupplierDebtInfo] || '';
        let valB = b[sortKey as keyof SupplierDebtInfo] || '';

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
  }, [filteredDebtData, sortKey, sortDirection]);
  
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const handleOpenPaymentForm = (supplier: SupplierDebtInfo) => {
    setSelectedSupplier(supplier);
    setIsPaymentFormOpen(true);
  }

  const handlePaymentSuccess = async () => {
    // Refetch payments data after successful payment
    try {
      setPaymentsLoading(true);
      const paymentsRes = await fetchWithAuth('/api/supplier-payments');
      if (paymentsRes.ok) {
        const data = await paymentsRes.json();
        setPayments(Array.isArray(data) ? data : (data.data || []));
      }
      // Also refetch purchases as remaining_debt has been updated
      setPurchasesLoading(true);
      const purchasesRes = await fetchWithAuth('/api/purchases?pageSize=1000'); // Lấy tất cả
      if (purchasesRes.ok) {
        const data = await purchasesRes.json();
        setPurchases(Array.isArray(data) ? data : (data.data || []));
      }
    } catch (error) {
      console.error('Error refetching data:', error);
    } finally {
      setPaymentsLoading(false);
      setPurchasesLoading(false);
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

  const isLoading = suppliersLoading || purchasesLoading || paymentsLoading;
  
  const totalRow = useMemo(() => {
    return {
      totalPurchases: sortedDebtData.reduce((acc, curr) => acc + curr.totalPurchases, 0),
      totalPayments: sortedDebtData.reduce((acc, curr) => acc + curr.totalPayments, 0),
      finalDebt: sortedDebtData.reduce((acc, curr) => acc + curr.finalDebt, 0),
    };
  }, [sortedDebtData]);

  const handleExportExcel = () => {
    const dataToExport = sortedDebtData.map((data, index) => ({
      'STT': index + 1,
      'Nhà cung cấp': data.supplierName,
      'SĐT': data.supplierPhone || 'N/A',
      'Tổng nhập': data.totalPurchases,
      'Đã trả': data.totalPayments,
      'Nợ cuối kỳ': data.finalDebt,
    }));

    const totalRowData = {
      'Nhà cung cấp': 'Tổng cộng',
      'Tổng nhập': totalRow.totalPurchases,
      'Đã trả': totalRow.totalPayments,
      'Nợ cuối kỳ': totalRow.finalDebt,
    };

    const worksheet = xlsx.utils.json_to_sheet([...dataToExport, totalRowData]);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "CongNoNCC");

    worksheet['!cols'] = [ { wch: 5 }, { wch: 30 }, { wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 20 } ];
     const numberFormat = '#,##0';
     dataToExport.forEach((_, index) => {
        const rowIndex = index + 2;
        ['D', 'E', 'F'].forEach(col => {
            const cell = worksheet[`${col}${rowIndex}`];
            if(cell) cell.z = numberFormat;
        });
    });
     const totalRowIndex = dataToExport.length + 2;
      ['D', 'E', 'F'].forEach(col => {
        const cell = worksheet[`${col}${totalRowIndex}`];
        if(cell) {
          cell.z = numberFormat;
          cell.s = { font: { bold: true } };
        }
    });

    xlsx.writeFile(workbook, "bao_cao_cong_no_ncc.xlsx");
  };

  return (
    <>
      {selectedSupplier && (
        <SupplierPaymentForm
          isOpen={isPaymentFormOpen}
          onOpenChange={setIsPaymentFormOpen}
          supplier={selectedSupplier}
          onSuccess={handlePaymentSuccess}
        />
      )}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
              <div>
                  <CardTitle>Báo cáo Công nợ Nhà cung cấp</CardTitle>
                  <CardDescription>
                  Tổng hợp công nợ phải trả cho các nhà cung cấp.
                  </CardDescription>
              </div>
              <div className="text-right">
                  <p className="text-sm text-muted-foreground">Tổng nợ phải trả</p>
                  <p className={`text-2xl font-bold ${totalRow.finalDebt > 0 ? 'text-destructive' : 'text-primary'}`}>
                      {formatCurrency(totalRow.finalDebt)}
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
              <Button onClick={handleExportExcel} variant="outline" className="ml-auto">
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
                      <SortableHeader sortKey="supplierName">Nhà cung cấp</SortableHeader>
                      <SortableHeader sortKey="supplierPhone">Số điện thoại</SortableHeader>
                      <SortableHeader sortKey="totalPurchases" className="text-right">Tổng nhập</SortableHeader>
                      <SortableHeader sortKey="totalPayments" className="text-right">Đã trả</SortableHeader>
                      <SortableHeader sortKey="finalDebt" className="text-right">Nợ cuối kỳ</SortableHeader>
                      <TableHead className="text-right">Hành động</TableHead>
                  </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && <TableRow><TableCell colSpan={7} className="text-center h-24">Đang tải dữ liệu...</TableCell></TableRow>}
                {!isLoading && sortedDebtData.map((data, index) => (
                  <TableRow key={data.supplierId}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell className="font-medium">{data.supplierName}</TableCell>
                    <TableCell>{data.supplierPhone}</TableCell>
                    <TableCell className="text-right">{formatCurrency(data.totalPurchases)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(data.totalPayments)}</TableCell>
                    <TableCell className={`text-right font-semibold ${data.finalDebt > 0 ? 'text-destructive' : ''}`}>
                      {formatCurrency(data.finalDebt)}
                    </TableCell>
                    <TableCell className="text-right">
                       {data.finalDebt > 0 ? (
                          <Button variant="outline" size="sm" onClick={() => handleOpenPaymentForm(data)}>
                            Thanh toán
                          </Button>
                        ) : (
                          <span className="text-sm text-green-600 font-medium">Đã thanh toán</span>
                        )}
                    </TableCell>
                  </TableRow>
                ))}
                {!isLoading && sortedDebtData.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center h-24">Không có dữ liệu công nợ.</TableCell>
                  </TableRow>
                )}
              </TableBody>
              <ShadcnTableFooter>
                  <TableRow className="text-base font-bold">
                      <TableCell colSpan={3}>Tổng cộng</TableCell>
                      <TableCell className="text-right">{formatCurrency(totalRow.totalPurchases)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(totalRow.totalPayments)}</TableCell>
                      <TableCell className={`text-right ${totalRow.finalDebt > 0 ? 'text-destructive' : ''}`}>{formatCurrency(totalRow.finalDebt)}</TableCell>
                      <TableCell></TableCell>
                  </TableRow>
              </ShadcnTableFooter>
          </Table>
        </CardContent>
        <CardFooter>
            <div className="text-xs text-muted-foreground">
              Hiển thị <strong>{sortedDebtData.length}</strong> nhà cung cấp có công nợ.
            </div>
          </CardFooter>
      </Card>
    </>
  )
}
