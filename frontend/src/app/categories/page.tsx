'use client'

import { useState, useMemo, useTransition } from "react"
import {
  MoreHorizontal,
  PlusCircle,
  Search,
  ArrowUp,
  ArrowDown,
  File,
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
import { CategoryForm } from "./components/category-form"
import { deleteCategory, generateCategoryTemplate } from "./actions"
import { useToast } from "@/hooks/use-toast"
import { Input } from "@/components/ui/input"
import { useUserRole } from "@/hooks/use-user-role"
import { useCategories, type Category } from "@/hooks/use-categories"
import Link from "next/link"

type SortKey = 'name' | 'description';

export default function CategoriesPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | undefined>(undefined);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [isExporting, startExportingTransition] = useTransition();
  
  const { toast } = useToast();
  const { permissions, isLoading: isRoleLoading } = useUserRole();
  const { categories, isLoading: categoriesLoading, refetch } = useCategories();

  const filteredCategories = categories?.filter(category => {
    const term = searchTerm.toLowerCase();
    return (
      category.name.toLowerCase().includes(term) ||
      (category.description && category.description.toLowerCase().includes(term))
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

  const sortedCategories = useMemo(() => {
    let sortableItems = [...(filteredCategories || [])];
    if (sortKey) {
      sortableItems.sort((a, b) => {
        const valA = (a[sortKey] || '').toLowerCase();
        const valB = (b[sortKey] || '').toLowerCase();

        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [filteredCategories, sortKey, sortDirection]);

  const SortableHeader = ({ sortKey: key, children }: { sortKey: SortKey; children: React.ReactNode }) => (
    <TableHead>
      <Button variant="ghost" onClick={() => handleSort(key)} className="px-2 py-1 h-auto">
        {children}
        {sortKey === key && (
          sortDirection === 'asc' ? <ArrowUp className="h-4 w-4 ml-2" /> : <ArrowDown className="h-4 w-4 ml-2" />
        )}
      </Button>
    </TableHead>
  );

  const handleAddCategory = () => {
    setSelectedCategory(undefined);
    setIsFormOpen(true);
  }

  const handleEditCategory = (category: Category) => {
    setSelectedCategory(category);
    setIsFormOpen(true);
  }

  const handleFormSuccess = () => {
    refetch();
  }

  const handleDelete = async () => {
    if (!categoryToDelete) return;
    setIsDeleting(true);
    const result = await deleteCategory(categoryToDelete.id);
    if (result.success) {
      toast({
        title: "Thành công!",
        description: `Đã xóa danh mục "${categoryToDelete.name}".`,
      });
      refetch();
    } else {
      toast({
        variant: "destructive",
        title: "Ôi! Đã có lỗi xảy ra.",
        description: result.error,
      });
    }
    setIsDeleting(false);
    setCategoryToDelete(null);
  }

  const handleExportTemplate = () => {
    startExportingTransition(async () => {
      const result = await generateCategoryTemplate();
      if (result.success && result.data) {
        const link = document.createElement("a");
        link.href = `data:text/csv;charset=utf-8;base64,${result.data}`;
        link.download = "category_template.csv";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast({ 
          title: "Thành công", 
          description: "Đã tải xuống file mẫu danh mục." 
        });
      } else {
        toast({ 
          variant: "destructive", 
          title: "Lỗi", 
          description: result.error || "Không thể tạo file mẫu" 
        });
      }
    });
  }

  const isLoading = categoriesLoading || isRoleLoading;
  const canView = permissions?.categories?.includes('view');
  const canAdd = permissions?.categories?.includes('add');
  const canEdit = permissions?.categories?.includes('edit');
  const canDelete = permissions?.categories?.includes('delete');

  if (isLoading) {
    return <p>Đang tải...</p>;
  }

  if (!canView) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Truy cập bị từ chối</CardTitle>
          <CardDescription>Bạn không có quyền xem trang này.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild><Link href="/dashboard">Quay lại Bảng điều khiển</Link></Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <CategoryForm 
        isOpen={isFormOpen}
        onOpenChange={setIsFormOpen}
        category={selectedCategory}
        onSuccess={handleFormSuccess}
      />
      <AlertDialog open={!!categoryToDelete} onOpenChange={(open) => !open && setCategoryToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bạn có chắc chắn không?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này không thể được hoàn tác. Thao tác này sẽ xóa vĩnh viễn danh mục{' '}
              <strong>{categoryToDelete?.name}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? "Đang xóa..." : "Xóa"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex items-center gap-2 mb-4">
        <div className="grid gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">Danh mục sản phẩm</h1>
            <p className="text-sm text-muted-foreground">
                Thêm, sửa, xóa và tìm kiếm các danh mục sản phẩm của bạn.
            </p>
        </div>
        {canAdd && <div className="ml-auto flex items-center gap-2">
          <Button size="sm" variant="outline" className="h-8 gap-1" onClick={handleExportTemplate} disabled={isExporting}>
            <File className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
              {isExporting ? 'Đang xuất...' : 'Xuất Template'}
            </span>
          </Button>
          <Button size="sm" className="h-8 gap-1" onClick={handleAddCategory}>
            <PlusCircle className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
              Thêm danh mục
            </span>
          </Button>
        </div>}
      </div>
      <Card>
        <CardHeader>
             <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Tìm kiếm theo tên hoặc mô tả..."
                    className="w-full rounded-lg bg-background pl-8 md:w-1/3"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">STT</TableHead>
                <SortableHeader sortKey="name">Tên</SortableHeader>
                <SortableHeader sortKey="description">Mô tả</SortableHeader>
                <TableHead>
                  <span className="sr-only">Hành động</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow key="loading">
                  <TableCell colSpan={4} className="text-center">Đang tải...</TableCell>
                </TableRow>
              ) : sortedCategories && sortedCategories.length > 0 ? (
                sortedCategories.map((category, index) => (
                  <TableRow key={category.id || `category-${index}`}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell className="font-medium">
                      {category.name}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {category.description}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            aria-haspopup="true"
                            size="icon"
                            variant="ghost"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Chuyển đổi menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Hành động</DropdownMenuLabel>
                          {canEdit && <DropdownMenuItem onClick={() => handleEditCategory(category)}>Sửa</DropdownMenuItem>}
                          {canDelete && <DropdownMenuItem className="text-destructive" onClick={() => setCategoryToDelete(category)}>Xóa</DropdownMenuItem>}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow key="empty">
                  <TableCell colSpan={4} className="text-center h-24">
                    Không tìm thấy danh mục nào. Hãy thử một từ khóa tìm kiếm khác hoặc thêm một danh mục mới.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter>
          <div className="text-xs text-muted-foreground">
            Hiển thị <strong>{sortedCategories?.length || 0}</strong> trên <strong>{categories?.length || 0}</strong> danh mục
          </div>
        </CardFooter>
      </Card>
    </>
  )
}
