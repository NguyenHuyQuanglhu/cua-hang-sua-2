'use client';

import * as React from 'react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Plus, Store, Pencil, Trash2, Building2, Phone, MapPin, Loader2
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useStore, type Store as StoreType } from '@/contexts/store-context';
import { CreateStoreDialog } from '@/components/stores/CreateStoreDialog';
import { EditStoreDialog } from '@/components/stores/EditStoreDialog';
import { DeleteStoreDialog } from '@/components/stores/DeleteStoreDialog';


export default function StoresPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { stores, user, isLoading, deactivateStore, switchStore, currentStore } = useStore();
  
  // Physical store states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isPermanentDeleteDialogOpen, setIsPermanentDeleteDialogOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<StoreType | null>(null);
  const [deletingStore, setDeletingStore] = useState<StoreType | null>(null);
  const [permanentDeletingStore, setPermanentDeletingStore] = useState<StoreType | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const isOwner = user?.role === 'admin' || user?.role === 'owner';

  const handleOpenEditDialog = (store: StoreType) => {
    setEditingStore(store);
    setIsEditDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingStore) return;
    setIsDeleting(true);
    const wasCurrentStore = currentStore?.id === deletingStore.id;
    const remainingStoresCount = stores.length - 1;

    try {
      await deactivateStore(deletingStore.id);
      if (wasCurrentStore && remainingStoresCount > 0) {
        toast({ title: 'Thành công', description: 'Đã vô hiệu hóa cửa hàng. Đã tự động chuyển sang cửa hàng khác.' });
      } else if (wasCurrentStore && remainingStoresCount === 0) {
        toast({ title: 'Thành công', description: 'Đã vô hiệu hóa cửa hàng. Vui lòng tạo cửa hàng mới để tiếp tục.' });
      } else {
        toast({ title: 'Thành công', description: 'Đã vô hiệu hóa cửa hàng' });
      }
      setIsDeleteDialogOpen(false);
      setDeletingStore(null);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Lỗi', description: error instanceof Error ? error.message : 'Đã xảy ra lỗi' });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSelectStore = async (store: StoreType) => {
    const success = await switchStore(store.id);
    if (success) {
      toast({
        title: '✅ Chuyển cửa hàng thành công',
        description: `Đã chuyển sang cửa hàng: ${store.name}`,
        duration: 3000,
      });
      router.push('/dashboard');
    } else {
      toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: 'Không thể chuyển đến cửa hàng này',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cửa hàng vật lý</h1>
          <p className="text-muted-foreground">Quản lý các cửa hàng vật lý của bạn</p>
        </div>
        {isOwner && (
          <Button onClick={() => setIsCreateDialogOpen(true)} size="lg">
            <Plus className="mr-2 h-5 w-5" />
            Tạo cửa hàng vật lý
          </Button>
        )}
      </div>

      {stores.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Chưa có cửa hàng nào</h3>
            <p className="text-muted-foreground text-center mb-4">
              {isOwner ? 'Bắt đầu bằng cách tạo cửa hàng vật lý đầu tiên của bạn' : 'Bạn chưa được phân quyền vào cửa hàng nào'}
            </p>
            {isOwner && (
              <Button onClick={() => setIsCreateDialogOpen(true)} size="lg">
                <Plus className="mr-2 h-5 w-5" />
                Tạo cửa hàng vật lý
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {stores.map((store) => (
            <Card key={store.id} className="cursor-pointer hover:border-primary transition-colors" onClick={() => handleSelectStore(store)}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Store className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">{store.name}</CardTitle>
                  </div>
                  {currentStore?.id === store.id && <Badge>Đang chọn</Badge>}
                </div>
                {store.businessType && <CardDescription>{store.businessType}</CardDescription>}
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-muted-foreground">
                  {store.address && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      <span className="truncate">{store.address}</span>
                    </div>
                  )}
                  {store.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      <span>{store.phone}</span>
                    </div>
                  )}
                </div>
                {isOwner && (
                  <div className="flex gap-2 mt-4 pt-4 border-t">
                    <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleOpenEditDialog(store); }}>
                      <Pencil className="h-4 w-4 mr-1" />
                      Sửa
                    </Button>
                    <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); setDeletingStore(store); setIsDeleteDialogOpen(true); }}>
                      <Trash2 className="h-4 w-4 mr-1" />
                      Vô hiệu hóa
                    </Button>
                    <Button variant="destructive" size="sm" onClick={(e) => { e.stopPropagation(); setPermanentDeletingStore(store); setIsPermanentDeleteDialogOpen(true); }}>
                      <Trash2 className="h-4 w-4 mr-1" />
                      Xóa
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialogs */}
      <CreateStoreDialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen} />
      <EditStoreDialog store={editingStore} open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen} />
      <DeleteStoreDialog 
        store={permanentDeletingStore} 
        open={isPermanentDeleteDialogOpen} 
        onOpenChange={(open) => { 
          setIsPermanentDeleteDialogOpen(open); 
          if (!open) setPermanentDeletingStore(null); 
        }} 
      />

      {/* Delete Physical Store Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận vô hiệu hóa cửa hàng</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn vô hiệu hóa cửa hàng "{deletingStore?.name}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Vô hiệu hóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
