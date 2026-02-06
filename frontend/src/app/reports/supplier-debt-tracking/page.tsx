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
import { formatCurrency } from "@/lib/utils"
import { fetchWithAuth } from "@/lib/fetch-with-auth"
import { PurchaseOrderPaymentForm } from "./components/purchase-order-payment-form"

type PurchaseOrderDebt = {
  id: string;
  orderNumber: string;
  supplierId: string;
  supplierName: string;
  importDate: string;
  totalAmount: number;
  paidAmount: number;
  remainingDebt: number;
  paymentStatus: string;
}

type SortKey = 'orderNumber' | 'supplierName' | 'importDate' | 'totalAmount' | 'paidAmount' | 'remainingDebt';

export default function SupplierDebtTrackingPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>('importDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [isPaymentFormOpen, setIsPaymentFormOpen] = useState(false);
  const [selectedPurchaseOrder, setSelectedPurchaseOrder] = useState<PurchaseOrderDebt | undefined>(undefined);

  const { currentStore } = useStore();

  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderDebt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentStore) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        const purchasesRes = await fetchWithAuth('/api/purchases?pageSize=1000');
        if (purchasesRes.ok) {
          const data = await purchasesRes.json();
          const purchases = Array.isArray(data) ? data : (data.data || []);
          
          // Map to PurchaseOrderDebt format
          const mapped: PurchaseOrderDebt[] = purchases.map((p: any) => ({
            id: p.id,
            orderNumber: p.orderNumber,
            supplierId: p.supplierId,
            supplierName: p.supplierName || 'Không có nhà cung cấp',
            importDate: p.importDate,
            totalAmount: p.totalAmount || 0,
            paidAmount: p.paidAmount || 0,
            remainingDebt: p.remainingDebt || 0,
            paymentStatus: p.paymentStatus || 'unpaid',
          }));
          
          setPurchaseOrders(mapped);
        }
        setLoading(false);
      } catch (error) {
        console.error('Error fetching purchase orders:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, [currentStore]);

  const filteredData = useMemo(() => {
    let filtered = purchaseOrders;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(data => 
        data.orderNumber.toLowerCase().includes(term) ||
        data.supplierName.toLowerCase().includes(term)
      );
    }
    return filtered;
  }, [purchaseOrders, searchTerm]);

  const sortedData = useMemo(() => {
    let sortableItems = [...filteredData];
    if (sortKey) {
      sortableItems.sort((a, b) => {
        let valA = a[sortKey as keyof PurchaseOrderDebt] || '';
        let valB = b[sortKey as keyof PurchaseOrderDebt] || '';

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
  }, [filteredData, sortKey, sortDirection]);
  
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const handleOpenPaymentForm = (purchaseOrder: PurchaseOrderDebt) => {
    setSelectedPurchaseOrder(purchaseOrder);
    setIsPaymentFormOpen(true);
  }

  const handlePaymentSuccess = async () => {
    // Refetch data after successful payment
    try {
      setLoading(true);
      const purchasesRes = await fetchWithAuth('/api/purchases?pageSize=1000');
      if (purchasesRes.ok) {
        const data = await purchasesRes.json();
        const purchases = Array.isArray(data) ? data : (data.data || []);
        
        const mapped: PurchaseOrderDebt[] = purchases.map((p: any) => ({
          id: p.id,
          orderNumber: p.orderNumber,
          supplierId: p.supplierId,
          supplierName: p.supplierName || 'Không có nhà cung cấp',
          importDate: p.importDate,
          totalAmount: p.totalAmount || 0,
          paidAmount: p.paidAmount || 0,
          remainingDebt: p.remainingDebt || 0,
          paymentStatus: p.paymentStatus || 'unpaid',
        }));
        
        setPurchaseOrders(mapped);
      }
    } catch (error) {
      console.error('Error refetching data:', error);
    } finally {
      setLoading(false);
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
  
  const totalRow = useMemo(() => {
    return {
      totalAmount: sortedData.reduce((acc, curr) => acc + curr.totalAmount, 0),
      paidAmount: sortedData.reduce((acc, curr) => acc + curr.paidAmount, 0),
      remainingDebt: sortedData.reduce((acc, curr) => acc + curr.remainingDebt, 0),
    };
  }, [sortedData]);

  const handleExportExcel = () => {
    const dataToExport = sortedData.map((data, index) => ({
      'STT': index + 1,
      'Số đơn': data.orderNumber,
      'Nhà cung cấp': data.supplierName,
      'Ngày nhập': new Date(data.importDate).toLocaleDateString('vi-VN'),
      'Tổng tiền': data.totalAmount,
      'Đã trả': data.paidAmount,
      'Còn nợ': data.remainingDebt,
      'Trạng thái': data.paymentStatus === 'paid' ? 'Đã thanh toán' : data.paymentStatus === 'partial' ? 'Thanh toán một phần' : 'Chưa thanh toán',
    }));

    const totalRowData = {
      'Số đơn': 'Tổng cộng',
      'Tổng tiền': totalRow.totalAmount,
      'Đã trả': totalRow.paidAmount,
      'Còn nợ': totalRow.remainingDebt,
    };

    const worksheet = xlsx.utils.json_to_sheet([...dataToExport, totalRowData]);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "ChiTietCongNo");

    worksheet['!cols'] = [ { wch: 5 }, { wch: 15 }, { wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 20 } ];
    
    xlsx.writeFile(workbook, "chi_tiet_cong_no_theo_don.xlsx");
  };

  return (
    <>
      {selectedPurchaseOrder && (
        <PurchaseOrderPaymentForm
          isOpen={isPaymentFormOpen}
          onOpenChange={setIsPaymentFormOpen}
          purchaseOrder={selectedPurchaseOrder}
          onSuccess={handlePaymentSuccess}
        />
      )}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
              <div>
                  <CardTitle>Chi tiết Công nợ theo Đơn hàng</CardTitle>
                  <CardDescription>
                  Theo dõi và thanh toán từng đơn nhập hàng riêng biệt.
                  </CardDescription>
              </div>
              <div className="text-right">
                  <p className="text-sm text-muted-foreground">Tổng nợ phải trả</p>
                  <p className={`text-2xl font-bold ${totalRow.remainingDebt > 0 ? 'text-destructive' : 'text-primary'}`}>
                      {formatCurrency(totalRow.remainingDebt)}
                  </p>
              </div>
          </div>
          <div className="flex items-center gap-4 pt-4">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Tìm kiếm theo số đơn hoặc nhà cung cấp..."
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
                      <SortableHeader sortKey="orderNumber">Số đơn</SortableHeader>
                      <SortableHeader sortKey="supplierName">Nhà cung cấp</SortableHeader>
                      <SortableHeader sortKey="importDate">Ngày nhập</SortableHeader>
                      <SortableHeader sortKey="totalAmount" className="text-right">Tổng tiền</SortableHeader>
                      <SortableHeader sortKey="paidAmount" className="text-right">Đã trả</SortableHeader>
                      <SortableHeader sortKey="remainingDebt" className="text-right">Còn nợ</SortableHeader>
                      <TableHead className="text-right">Hành động</TableHead>
                  </TableRow>
              </TableHeader>
              <TableBody>
                {loading && <TableRow><TableCell colSpan={8} className="text-center h-24">Đang tải dữ liệu...</TableCell></TableRow>}
                {!loading && sortedData.map((data, index) => (
                  <TableRow key={data.id}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell className="font-medium">{data.orderNumber}</TableCell>
                    <TableCell>{data.supplierName}</TableCell>
                    <TableCell>{new Date(data.importDate).toLocaleDateString('vi-VN')}</TableCell>
                    <TableCell className="text-right">{formatCurrency(data.totalAmount)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(data.paidAmount)}</TableCell>
                    <TableCell className={`text-right font-semibold ${data.remainingDebt > 0 ? 'text-destructive' : 'text-green-600'}`}>
                      {formatCurrency(data.remainingDebt)}
                    </TableCell>
                    <TableCell className="text-right">
                       {data.remainingDebt > 0 && data.supplierId ? (
                          <Button variant="outline" size="sm" onClick={() => handleOpenPaymentForm(data)}>
                            Thanh toán
                          </Button>
                        ) : data.remainingDebt > 0 && !data.supplierId ? (
                          <span className="text-sm text-muted-foreground">Không có NCC</span>
                        ) : (
                          <span className="text-sm text-green-600 font-medium">Đã thanh toán</span>
                        )}
                    </TableCell>
                  </TableRow>
                ))}
                {!loading && sortedData.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center h-24">Không có dữ liệu.</TableCell>
                  </TableRow>
                )}
              </TableBody>
              <ShadcnTableFooter>
                  <TableRow className="text-base font-bold">
                      <TableCell colSpan={4}>Tổng cộng</TableCell>
                      <TableCell className="text-right">{formatCurrency(totalRow.totalAmount)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(totalRow.paidAmount)}</TableCell>
                      <TableCell className={`text-right ${totalRow.remainingDebt > 0 ? 'text-destructive' : 'text-green-600'}`}>{formatCurrency(totalRow.remainingDebt)}</TableCell>
                      <TableCell></TableCell>
                  </TableRow>
              </ShadcnTableFooter>
          </Table>
        </CardContent>
        <CardFooter>
            <div className="text-xs text-muted-foreground">
              Hiển thị <strong>{sortedData.length}</strong> đơn nhập hàng.
            </div>
          </CardFooter>
      </Card>
    </>
  )
}
