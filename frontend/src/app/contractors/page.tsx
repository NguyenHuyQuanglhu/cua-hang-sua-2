'use client'

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  ArrowDown,
  ArrowUp,
  MoreHorizontal,
  PlusCircle,
  RefreshCw,
  Search,
} from "lucide-react"

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
import {
  Card,
  CardContent,
  CardDescription,
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
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import { useUserRole } from "@/hooks/use-user-role"
import type { Contractor } from "@/lib/types"
import { deleteContractor, getContractors } from "./actions"
import { ContractorForm } from "./components/contractor-form"

type SortKey = 'name' | 'contactPerson' | 'phone' | 'email';

export default function ContractorsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedContractor, setSelectedContractor] = useState<Contractor | undefined>(undefined);
  const [contractorToDelete, setContractorToDelete] = useState<Contractor | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { toast } = useToast();
  const { permissions, isLoading: isRoleLoading } = useUserRole();

  const canView = permissions?.suppliers?.includes('view');
  const canAdd = permissions?.suppliers?.includes('add');
  const canEdit = permissions?.suppliers?.includes('edit');
  const canDelete = permissions?.suppliers?.includes('delete');

  const fetchContractors = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const result = await getContractors();

    if (result.success && result.contractors) {
      setContractors(result.contractors);
    } else {
      const message = result.error || 'Không thể lấy danh sách nhà thầu';
      setError(message);
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: message,
      });
    }

    setIsLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchContractors();
  }, [fetchContractors]);

  const filteredContractors = useMemo(() => {
    const term = searchTerm.toLowerCase();

    return contractors.filter((contractor) =>
      contractor.name.toLowerCase().includes(term) ||
      (contractor.contactPerson || '').toLowerCase().includes(term) ||
      (contractor.phone || '').toLowerCase().includes(term) ||
      (contractor.email || '').toLowerCase().includes(term) ||
      (contractor.identityNumber || '').toLowerCase().includes(term)
    );
  }, [contractors, searchTerm]);

  const sortedContractors = useMemo(() => {
    const items = [...filteredContractors];

    items.sort((a, b) => {
      const valueA = String(a[sortKey] || '').toLowerCase();
      const valueB = String(b[sortKey] || '').toLowerCase();

      if (valueA < valueB) return sortDirection === 'asc' ? -1 : 1;
      if (valueA > valueB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return items;
  }, [filteredContractors, sortDirection, sortKey]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortKey(key);
    setSortDirection('asc');
  };

  const handleDelete = async () => {
    if (!contractorToDelete) return;

    setIsDeleting(true);
    const result = await deleteContractor(contractorToDelete.id);

    if (result.success) {
      toast({
        title: "Thành công!",
        description: `Đã xóa nhà thầu "${contractorToDelete.name}".`,
      });
      await fetchContractors();
    } else {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: result.error,
      });
    }

    setIsDeleting(false);
    setContractorToDelete(null);
  };

  const SortableHeader = ({ sortKey: key, children }: { sortKey: SortKey; children: React.ReactNode }) => (
    <TableHead>
      <Button variant="ghost" onClick={() => handleSort(key)} className="h-auto px-2 py-1">
        {children}
        {sortKey === key && (sortDirection === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />)}
      </Button>
    </TableHead>
  );

  if (isLoading || isRoleLoading) {
    return <p>Đang tải dữ liệu...</p>;
  }

  if (!canView) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Truy cập bị từ chối</CardTitle>
          <CardDescription>Bạn không có quyền xem danh sách nhà thầu.</CardDescription>
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
          <Button onClick={fetchContractors}><RefreshCw className="mr-2 h-4 w-4" />Thử lại</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <ContractorForm
        isOpen={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) {
            setSelectedContractor(undefined);
            fetchContractors();
          }
        }}
        contractor={selectedContractor}
      />

      <AlertDialog open={!!contractorToDelete} onOpenChange={(open) => !open && setContractorToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bạn có chắc chắn không?</AlertDialogTitle>
            <AlertDialogDescription>
              Thao tác này sẽ xóa vĩnh viễn nhà thầu <strong>{contractorToDelete?.name}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? 'Đang xóa...' : 'Xóa'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="mb-4 flex items-center gap-2">
        <div className="grid gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Nhà thầu</h1>
          <p className="text-sm text-muted-foreground">Quản lý danh mục nhà thầu và liên kết với hóa đơn nhập hàng.</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" variant="outline" className="h-8 gap-1" onClick={fetchContractors}>
            <RefreshCw className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Làm mới</span>
          </Button>
          {canAdd && (
            <Button
              size="sm"
              className="h-8 gap-1"
              onClick={() => {
                setSelectedContractor(undefined);
                setIsFormOpen(true);
              }}
            >
              <PlusCircle className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Thêm nhà thầu</span>
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Tìm theo tên, người liên hệ, SĐT, email..."
              className="w-full rounded-lg bg-background pl-8 md:w-1/3"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">STT</TableHead>
                <SortableHeader sortKey="name">Tên nhà thầu</SortableHeader>
                <SortableHeader sortKey="contactPerson">Người liên hệ</SortableHeader>
                <SortableHeader sortKey="phone">Điện thoại</SortableHeader>
                <SortableHeader sortKey="email">Email</SortableHeader>
                <TableHead>Mô tả</TableHead>
                <TableHead><span className="sr-only">Hành động</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedContractors.map((contractor, index) => (
                <TableRow key={contractor.id}>
                  <TableCell className="font-medium">{index + 1}</TableCell>
                  <TableCell className="font-medium">
                    <div>{contractor.name}</div>
                    {contractor.identityNumber && (
                      <div className="text-xs text-muted-foreground">CCCD/CMND: {contractor.identityNumber}</div>
                    )}
                  </TableCell>
                  <TableCell>{contractor.contactPerson || 'N/A'}</TableCell>
                  <TableCell>{contractor.phone || 'N/A'}</TableCell>
                  <TableCell>{contractor.email || 'N/A'}</TableCell>
                  <TableCell className="max-w-[280px] truncate">{contractor.description || 'N/A'}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button aria-haspopup="true" size="icon" variant="ghost">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Hành động</DropdownMenuLabel>
                        {canEdit && (
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedContractor(contractor);
                              setIsFormOpen(true);
                            }}
                          >
                            Sửa
                          </DropdownMenuItem>
                        )}
                        {canDelete && (
                          <DropdownMenuItem className="text-destructive" onClick={() => setContractorToDelete(contractor)}>
                            Xóa
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}

              {sortedContractors.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    Không tìm thấy nhà thầu nào.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  )
}
