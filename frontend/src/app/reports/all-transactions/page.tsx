'use client'

import * as React from "react"
import { useState, useMemo, useEffect } from "react"
import Link from "next/link"
import { Search, ArrowUp, ArrowDown, File, Calendar as CalendarIcon, TrendingUp, TrendingDown, DollarSign, Package, Sparkles } from "lucide-react"
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

type TransactionType = 'sale' | 'purchase' | 'customer_payment' | 'supplier_payment' | 'subscription_purchase' | 'discount_payout';

interface CashFlowItem {
  id: string;
  transactionDate: string;
  type: 'thu' | 'chi';
  amount: number;
  reason?: string;
  category?: string;
  relatedInvoiceId?: string;
}

interface SubscriptionHistoryItem {
  id: string;
  planId: string;
  planName: string;
  amount: number;
  paymentMethod: string;
  paymentStatus: string;
  startDate: string | null;
  endDate: string | null;
  createdAt: string | null;
}

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

const normalizeText = (value?: string): string => {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
};

const toNumber = (value: unknown, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toValidDate = (...candidates: unknown[]): Date => {
  for (const candidate of candidates) {
    if (!candidate) continue;
    const parsed = new Date(String(candidate));
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return new Date();
};

const normalizeInvoiceCode = (value?: string): string => {
  return String(value || '').trim().toUpperCase();
};

const extractInvoiceNumberFromPaymentNote = (note?: string): string | null => {
  const normalized = normalizeText(note);
  // Match formats like "Hoa don INV202604080012"
  const match = normalized.match(/hoa\s*don\s*([a-z0-9-]+)/i);
  if (!match?.[1]) {
    return null;
  }

  return normalizeInvoiceCode(match[1]);
};

const extractDiscountPayoutCustomerName = (reason?: string): string => {
  const text = String(reason || '').trim();
  if (!text) return 'Khách hàng';

  // Expected formats: both legacy non-accent and accented Vietnamese strings.
  const match =
    text.match(/thanh\s*toán\s*chiết\s*khấu\s*khách\s*hàng\s*(.+)$/i) ||
    text.match(/thanh\s*toan\s*chiet\s*khau\s*khach\s*hang\s*(.+)$/i);
  if (match?.[1]) {
    const name = match[1].trim();
    return name || 'Khách hàng';
  }

  return 'Khách hàng';
};

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
  const [subscriptionPurchases, setSubscriptionPurchases] = useState<SubscriptionHistoryItem[]>([]);
  const [cashFlowTransactions, setCashFlowTransactions] = useState<CashFlowItem[]>([]);
  const [supplierDebtTotal, setSupplierDebtTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!currentStore) return;

    const fetchAllSales = async (): Promise<any[]> => {
      const pageSize = 200;
      const allSales: any[] = [];
      let page = 1;
      let totalPages = 1;

      do {
        const response = await apiClient.getSales({ page, pageSize });
        const pageData = Array.isArray(response) ? response : (response as any)?.data || [];
        allSales.push(...pageData);

        const nextTotalPages = Number((response as any)?.totalPages || 1);
        totalPages = Number.isFinite(nextTotalPages) && nextTotalPages > 0 ? nextTotalPages : 1;
        page += 1;
      } while (page <= totalPages);

      return allSales;
    };

    const fetchAllPurchases = async (): Promise<any[]> => {
      const pageSize = 200;
      const allPurchases: any[] = [];
      let page = 1;
      let totalPages = 1;

      do {
        const response = await apiClient.request<{ data?: any[]; pagination?: { totalPages?: number } }>(
          `/purchases?page=${page}&pageSize=${pageSize}`
        );

        const pageData = Array.isArray(response) ? response : (response as any)?.data || [];
        allPurchases.push(...pageData);

        const nextTotalPages = Number((response as any)?.pagination?.totalPages || 1);
        totalPages = Number.isFinite(nextTotalPages) && nextTotalPages > 0 ? nextTotalPages : 1;
        page += 1;
      } while (page <= totalPages);

      return allPurchases;
    };

    const fetchData = async () => {
      try {
        setIsLoading(true);

        const [salesResult, purchasesResult, paymentsResult, supplierPaymentsResult, supplierDebtResult, subscriptionResult, cashFlowResult] = await Promise.allSettled([
          fetchAllSales(),
          fetchAllPurchases(),
          apiClient.getPayments(),
          apiClient.getSupplierPayments(),
          apiClient.getSupplierDebtReport(),
          apiClient.request<{ history: SubscriptionHistoryItem[] }>('/subscription/history?limit=200'),
          apiClient.request<{ data: CashFlowItem[] }>('/cash-flow?pageSize=500'),
        ]);

        const salesData = salesResult.status === 'fulfilled' ? salesResult.value : [];
        const purchasesData = purchasesResult.status === 'fulfilled' ? purchasesResult.value : [];
        const paymentsData = paymentsResult.status === 'fulfilled' ? paymentsResult.value : [];
        const supplierPaymentsData = supplierPaymentsResult.status === 'fulfilled' ? supplierPaymentsResult.value : [];
        const supplierDebtData = supplierDebtResult.status === 'fulfilled' ? supplierDebtResult.value : { data: [] };
        const subscriptionHistoryData = subscriptionResult.status === 'fulfilled' ? subscriptionResult.value : { history: [] };
        const cashFlowData = cashFlowResult.status === 'fulfilled' ? cashFlowResult.value : { data: [] };

        if (subscriptionResult.status === 'rejected') {
          console.error('Subscription history fetch failed, continue with other transaction data:', subscriptionResult.reason);
        }
        if (purchasesResult.status === 'rejected') {
          console.error('Purchases fetch failed, continue with other transaction data:', purchasesResult.reason);
        }
        if (supplierDebtResult.status === 'rejected') {
          console.error('Supplier debt fetch failed, continue with transaction data:', supplierDebtResult.reason);
        }

        const supplierDebtItems = Array.isArray((supplierDebtData as any)?.data) ? (supplierDebtData as any).data : [];
        const totalSupplierDebt = supplierDebtItems.reduce(
          (sum: number, item: any) => sum + toNumber(item.totalDebt ?? item.finalDebt, 0),
          0
        );

        setSales(Array.isArray(salesData) ? salesData : (salesData as any).data || []);
        setPurchases(Array.isArray(purchasesData) ? purchasesData : (purchasesData as any).data || []);
        setCustomerPayments(Array.isArray(paymentsData) ? paymentsData : (paymentsData as any).data || []);
        setSupplierPayments(Array.isArray(supplierPaymentsData) ? supplierPaymentsData : (supplierPaymentsData as any).data || []);
        setSubscriptionPurchases(subscriptionHistoryData?.history || []);
        setCashFlowTransactions(Array.isArray((cashFlowData as any)?.data) ? (cashFlowData as any).data : []);
        setSupplierDebtTotal(totalSupplierDebt);
        
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
    const saleInvoiceSet = new Set<string>();

    // Add sales
    sales.forEach(sale => {
      const invoiceCode = normalizeInvoiceCode(sale.invoiceNumber);
      const contractorName = String((sale as any).contractorName || '').trim();
      const customerName = String((sale as any).customerName || '').trim();
      const hasBothPartner = Boolean(contractorName && customerName);
      const resolvedPartnerName = hasBothPartner
        ? `${contractorName} / KH: ${customerName}`
        : contractorName || customerName || ((sale as any).contractorId ? 'Nhà thầu' : 'Khách lẻ');
      const resolvedPartnerId = String((sale as any).contractorId || sale.customerId || '');
      if (invoiceCode) {
        saleInvoiceSet.add(invoiceCode);
      }

      transactions.push({
        id: `sale-${sale.id}`,
        date: new Date(sale.transactionDate),
        type: 'sale',
        partnerName: resolvedPartnerName,
        partnerId: resolvedPartnerId,
        reference: sale.invoiceNumber || '',
        amount: sale.finalAmount || 0,
        notes: (sale as any).notes,
        originalData: sale,
      });
    });

    const purchaseIdSet = new Set<string>();

    // Add purchases
    purchases.forEach(purchase => {
      // Accept both camelCase and snake_case keys so this page remains compatible across schemas.
      const purchaseDate = toValidDate(
        (purchase as any).importDate,
        (purchase as any).import_date,
        (purchase as any).purchaseDate,
        (purchase as any).createdAt,
        (purchase as any).created_at
      );
      const invoiceNumber = (purchase as any).orderNumber || (purchase as any).order_number || purchase.invoiceNumber;
      const supplierName = purchase.supplierName || (purchase as any).supplier_name || 'Không rõ';
      const totalAmount = toNumber((purchase as any).totalAmount ?? (purchase as any).total_amount, 0);
      const paidAmount = toNumber((purchase as any).paidAmount ?? (purchase as any).paid_amount, 0);
      const displayAmount = totalAmount > 0 ? totalAmount : paidAmount;
      const purchaseId = String((purchase as any).id || '');

      if (purchaseId) {
        purchaseIdSet.add(purchaseId);
      }
      
      transactions.push({
        id: `purchase-${purchaseId || Math.random().toString(36).slice(2)}`,
        date: purchaseDate,
        type: 'purchase',
        partnerName: supplierName,
        partnerId: purchase.supplierId || (purchase as any).supplier_id || '',
        reference: invoiceNumber || '',
        amount: displayAmount,
        notes: purchase.notes,
        originalData: {
          ...purchase,
          totalAmount,
          paidAmount,
        },
      });
    });

    // Add customer payments
    customerPayments.forEach(payment => {
      const invoiceCodeFromNote = extractInvoiceNumberFromPaymentNote(payment.notes);
      // Do not show duplicated "Thu tiền KH" rows generated at checkout for invoices
      // that already exist as sale transactions.
      if (invoiceCodeFromNote && saleInvoiceSet.has(invoiceCodeFromNote)) {
        return;
      }

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

    // Add subscription purchases
    subscriptionPurchases.forEach(subscription => {
      transactions.push({
        id: `subscription-purchase-${subscription.id}`,
        date: new Date(subscription.createdAt || subscription.startDate || new Date().toISOString()),
        type: 'subscription_purchase',
        partnerName: subscription.planName || subscription.planId || 'Gói dịch vụ',
        partnerId: subscription.planId || '',
        reference: `Mua gói ${subscription.planName || subscription.planId}`,
        amount: subscription.amount || 0,
        notes: `Thanh toán: ${subscription.paymentMethod || 'N/A'} | Trạng thái: ${subscription.paymentStatus || 'N/A'}`,
        originalData: subscription,
      });
    });

    // Add customer discount payout transactions from cash flow
    cashFlowTransactions
      .filter((item) => {
        const category = String(item.category || '').toLowerCase();
        const reason = normalizeText(item.reason);
        return category === 'customer_discount_payout' || reason.includes('chiet khau khach hang');
      })
      .forEach((item) => {
        transactions.push({
          id: `discount-payout-${item.id}`,
          date: new Date(item.transactionDate),
          type: 'discount_payout',
          partnerName: extractDiscountPayoutCustomerName(item.reason),
          partnerId: '',
          reference: item.relatedInvoiceId || 'Chi tra chiet khau',
          amount: item.amount || 0,
          notes: item.reason || 'Chi tra chiet khau khach hang',
          originalData: item,
        });
      });

    // Fallback: include purchase transactions from cash-flow if purchases API misses records.
    cashFlowTransactions
      .filter((item) => {
        if (item.type !== 'chi') return false;
        const category = normalizeText(item.category);
        const reason = normalizeText(item.reason);
        const isPurchaseCashFlow = category.includes('nhap hang') || reason.includes('nhap hang');
        if (!isPurchaseCashFlow) return false;

        const relatedId = String(item.relatedInvoiceId || '');
        if (relatedId && purchaseIdSet.has(relatedId)) {
          return false;
        }

        return true;
      })
      .forEach((item) => {
        transactions.push({
          id: `purchase-fallback-${item.id}`,
          date: toValidDate(item.transactionDate),
          type: 'purchase',
          partnerName: 'Nhà cung cấp',
          partnerId: '',
          reference: item.relatedInvoiceId || 'Phiếu nhập',
          amount: toNumber(item.amount, 0),
          notes: item.reason || 'Chi tiền nhập hàng',
          originalData: {
            id: item.relatedInvoiceId,
            totalAmount: toNumber(item.amount, 0),
            paidAmount: toNumber(item.amount, 0),
            supplierId: null,
          },
        });
      });

    return transactions;
  }, [sales, purchases, customerPayments, supplierPayments, subscriptionPurchases, cashFlowTransactions]);

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
      case 'subscription_purchase': return 'Mua gói dịch vụ';
      case 'discount_payout': return 'Thanh toán chiết khấu';
    }
  };

  const getTransactionTypeIcon = (type: TransactionType) => {
    switch (type) {
      case 'sale': return <TrendingUp className="h-4 w-4" />;
      case 'purchase': return <Package className="h-4 w-4" />;
      case 'customer_payment': return <DollarSign className="h-4 w-4" />;
      case 'supplier_payment': return <TrendingDown className="h-4 w-4" />;
      case 'subscription_purchase': return <Sparkles className="h-4 w-4" />;
      case 'discount_payout': return <TrendingDown className="h-4 w-4" />;
    }
  };

  const getTransactionTypeVariant = (type: TransactionType): "default" | "secondary" | "destructive" | "outline" => {
    switch (type) {
      case 'sale': return 'default';
      case 'purchase': return 'secondary';
      case 'customer_payment': return 'outline';
      case 'supplier_payment': return 'destructive';
      case 'subscription_purchase': return 'outline';
      case 'discount_payout': return 'destructive';
    }
  };

  const summary = useMemo(() => {
    return sortedTransactions.reduce((acc, tx) => {
      switch (tx.type) {
        case 'sale':
          acc.totalSales += tx.amount;
          
          const saleData = tx.originalData as any;
          const saleCustomerId = saleData.customerId || null;
          const saleCustomerPayment = toNumber(saleData.customerPayment ?? saleData.customer_payment, 0);
          
          // Khách lẻ (không có customerId) không sinh ra phiếu 'customer_payment'.
          // Đối với khách lẻ, ta cộng thẳng vào doanh thu.
          // Đối với khách có tài khoản, phần thanh toán tại quầy lấy từ customerPayment của hóa đơn.
          if (!saleCustomerId) {
            acc.totalRevenue += tx.amount; 
          } else {
            acc.totalRevenue += saleCustomerPayment;
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
        case 'subscription_purchase':
          acc.totalSubscriptionPurchases += tx.amount;
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
      totalSubscriptionPurchases: 0, // Tổng tiền mua gói dịch vụ
    });
  }, [sortedTransactions]);

  const visibleTransactions = useMemo(
    () => sortedTransactions.filter((tx) => tx.type !== 'customer_payment'),
    [sortedTransactions]
  );

  const handleExportExcel = () => {
    const dataToExport = visibleTransactions.map((tx, index) => ({
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
            <div className="text-2xl font-bold text-orange-600">{formatCurrency(summary.totalSupplierPayments)}</div>
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
              {formatCurrency(supplierDebtTotal)}
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
                <SelectItem value="supplier_payment">Trả tiền NCC</SelectItem>
                <SelectItem value="subscription_purchase">Mua gói dịch vụ</SelectItem>
                <SelectItem value="discount_payout">Thanh toán chiết khấu</SelectItem>
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
              {!isLoading && visibleTransactions.map((tx, index) => (
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
              {!isLoading && visibleTransactions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center h-24">Không có giao dịch nào trong kỳ.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter>
          <div className="text-xs text-muted-foreground">
            Hiển thị <strong>{visibleTransactions.length}</strong> giao dịch.
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
