'use client'

import { useState, useMemo, useEffect, useCallback } from "react"
import {
  MoreHorizontal,
  PlusCircle,
  Search,
  ArrowUp,
  ArrowDown,
  RefreshCw
} from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { SupplierForm } from "./components/supplier-form"
import { deleteSupplier, getSuppliers, SupplierWithDebt } from "./actions"
import { useToast } from "@/hooks/use-toast"
import { Input } from "@/components/ui/input"
import { formatCurrency } from "@/lib/utils"
import { SupplierPaymentForm } from "./components/supplier-payment-form"
import { useUserRole } from "@/hooks/use-user-role"
import Link from "next/link"

type SortKey = 'name' | 'contactPerson' | 'email' | 'phone' | 'debt';

export default function SuppliersPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierWithDebt | undefined>(undefined);
  const [supplierToDelete, setSupplierToDelete] = useState<SupplierWithDebt | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortKey, setSortKey] = useState<SortKey | null>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [supplierForPayment, setSupplierForPayment] = useState<SupplierWithDebt | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  
  const [suppliers, setSuppliers] = useState<SupplierWithDebt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { toast } = useToast();
  const { permissions, isLoading: isRoleLoading } = useUserRole();

  const fetchSuppliers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    const result = await getSuppliers(true);
    
    if (result.success && result.suppliers) {
      setSuppliers(result.suppliers);
    } else {
      setError(result.error || 'Không thể lấy danh sách nhà cung cấp');
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: result.error || 'Không thể lấy danh sách nhà cung cấp',
      });
    }
    
    setIsLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const filteredSuppliers = suppliers?.filter(supplier => {
    const term = searchTerm.toLowerCase();
    return (
      supplier.name.toLowerCase().includes(term) ||
      (supplier.contactPerson && supplier.contactPerson.toLowerCase().includes(term)) ||
      (supplier.email && supplier.email.toLowerCase().includes(term)) ||
      (supplier.phone && supplier.phone.includes(term))
    );
  })

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const sortedSuppliers = useMemo(() => {
    const sortableItems = [...(filteredSuppliers || [])];
    if (sortKey) {
      sortableItems.sort((a, b) => {
        let valA: string | number, valB: string | number;
        if (sortKey === 'debt') {
          valA = a.debt || 0;
          valB = b.debt || 0;
        } else {
          valA = (a[sortKey] as string || '').toLowerCase();
          valB = (b[sortKey] as string || '').toLowerCase();
        }
        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [filteredSuppliers, sortKey, sortDirection]);

  const SortableHeader = ({ sortKey: key, children, className }: { sortKey: SortKey; children: React.ReactNode, className?: string; }) => (
    <TableHead className={className}>
      <Button variant="ghost" onClick={() => handleSort(key)} className="px-2 py-1 h-auto">
        {children}
        {sortKey === key && (
          sortDirection === 'asc' ? <ArrowUp className="h-4 w-4 ml-2" /> : <ArrowDown className="h-4 w-4 ml-2" />
        )}
      </Button>
    </TableHead>
  );

  const handleAddSupplier = () => {
    setSelectedSupplier(undefined);
    setIsFormOpen(true);
  }

  const handleEditSupplier = (supplier: SupplierWithDebt) => {
    setSelectedSupplier(supplier);
    setIsFormOpen(true);
  }

  const handleDelete = async () => {
    if (!supplierToDelete) return;
    setIsDeleting(true);
    const result = await deleteSupplier(supplierToDelete.id);
    if (result.success) {
      toast({ title: "Thành công!", description: `Đã xóa nhà cung cấp "${supplierToDelete.name}".` });
      fetchSuppliers();
    } else {
      toast({ variant: "destructive", title: "Ôi! Đã có lỗi xảy ra.", description: result.error });
    }
    setIsDeleting(false);
    setSupplierToDelete(null);
  }

  const handleFormClose = (open: boolean) => {
    setIsFormOpen(open);
    if (!open) fetchSuppliers();
  }

  const handlePaymentFormClose = async (open: boolean) => {
    if (!open) {
      setSupplierForPayment(null);
      // Force refresh by incrementing refreshKey
      setRefreshKey(prev => prev + 1);
    }
  }
  
  const loading = isLoading || isRoleLoading;
  const canView = permissions?.suppliers?.includes('view');
  const canAdd = permissions?.suppliers?.includes('add');
  const canEdit = permissions?.suppliers?.includes('edit');
  const canDelete = permissions?.suppliers?.includes('delete');
  
  if (loading) return <p>Đang tải dữ liệu...</p>;

  if (!canView) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Truy cập bị từ chối</CardTitle>
          <CardDescription>Bạn không có quyền xem danh sách nhà cung cấp.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild><Link href="/dashboard">Quay lại Bảng điều khiển</Link></Button>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Lỗi</CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={fetchSuppliers}><RefreshCw className="h-4 w-4 mr-2" />Thử lại</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <SupplierForm isOpen={isFormOpen} onOpenChange={handleFormClose} supplier={selectedSupplier} />
      {supplierForPayment && (
        <SupplierPaymentForm
          isOpen={!!supplierForPayment}
          onOpenChange={handlePaymentFormClose}
          supplier={{ supplierId: supplierForPayment.id, supplierName: supplierForPayment.name, finalDebt: supplierForPayment.debt }}
        />
      )}
      <AlertDialog open={!!supplierToDelete} onOpenChange={(open) => !open && setSupplierToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bạn có chắc chắn không?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này không thể được hoàn tác. Thao tác này sẽ xóa vĩnh viễn nhà cung cấp <strong>{supplierToDelete?.name}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>{isDeleting ? "Đang xóa..." : "Xóa"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex items-center gap-2 mb-4">
        <div className="grid gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Nhà cung cấp</h1>
          <p className="text-sm text-muted-foreground">Thêm, sửa, xóa và tìm kiếm các nhà cung cấp của bạn.</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" variant="outline" className="h-8 gap-1" onClick={fetchSuppliers}>
            <RefreshCw className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Làm mới</span>
          </Button>
          {canAdd && (
            <Button size="sm" className="h-8 gap-1" onClick={handleAddSupplier}>
              <PlusCircle className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Thêm NCC</span>
            </Button>
          )}
        </div>
      </div>
      <Card>
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input type="search" placeholder="Tìm kiếm theo tên, email, SĐT..." className="w-full rounded-lg bg-background pl-8 md:w-1/3" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">STT</TableHead>
                <SortableHeader sortKey="name">Tên Nhà cung cấp</SortableHeader>
                <SortableHeader sortKey="phone">Điện thoại</SortableHeader>
                <TableHead className="text-right">Tổng nhập</TableHead>
                <TableHead className="text-right">Đã trả</TableHead>
                <SortableHeader sortKey="debt" className="text-right">Công nợ</SortableHeader>
                <TableHead><span className="sr-only">Hành động</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && <TableRow><TableCell colSpan={7} className="text-center">Đang tải...</TableCell></TableRow>}
              {!loading && sortedSuppliers?.map((supplier, index) => {
                const hasDebt = supplier.debt > 0;
                return (
                  <TableRow key={supplier.id}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell className="font-medium">{supplier.name}</TableCell>
                    <TableCell>{supplier.phone}</TableCell>
                    <TableCell className="text-right">{formatCurrency(supplier.totalPurchases)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(supplier.totalPayments)}</TableCell>
                    <TableCell className={`text-right font-semibold ${hasDebt ? 'text-destructive' : ''}`}>
                      <Button variant="link" onClick={() => hasDebt && setSupplierForPayment(supplier)} disabled={!hasDebt} className={`p-0 h-auto ${hasDebt ? 'text-destructive' : ''}`}>
                        {formatCurrency(supplier.debt)}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button aria-haspopup="true" size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /><span className="sr-only">Menu</span></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Hành động</DropdownMenuLabel>
                          {canEdit && <DropdownMenuItem onClick={() => handleEditSupplier(supplier)}>Sửa</DropdownMenuItem>}
                          {canDelete && <DropdownMenuItem className="text-destructive" onClick={() => setSupplierToDelete(supplier)}>Xóa</DropdownMenuItem>}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )})}
              {!loading && sortedSuppliers?.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center h-24">Không tìm thấy nhà cung cấp nào.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter>
          <div className="text-xs text-muted-foreground">Hiển thị <strong>{sortedSuppliers?.length || 0}</strong> trên <strong>{suppliers?.length || 0}</strong> nhà cung cấp</div>
        </CardFooter>
      </Card>
    </>
  )
}
