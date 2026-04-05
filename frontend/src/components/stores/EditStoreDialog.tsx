'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useStore, type Store } from '@/contexts/store-context';

export interface EditStoreFormData {
  name: string;
  description: string;
  address: string;
  phone: string;
}

interface EditStoreDialogProps {
  store: Store | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStoreUpdated?: (store: Store) => void;
}

export function EditStoreDialog({
  store,
  open,
  onOpenChange,
  onStoreUpdated,
}: EditStoreDialogProps) {
  const { toast } = useToast();
  const { updateStore } = useStore();
  const [formData, setFormData] = useState<EditStoreFormData>({
    name: '',
    description: '',
    address: '',
    phone: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<EditStoreFormData>>({});

  // Pre-fill form when store changes
  useEffect(() => {
    if (store) {
      const storeWithDescription = store as unknown as { description?: string };
      setFormData({
        name: store.name || '',
        description: storeWithDescription.description || '',
        address: store.address || '',
        phone: store.phone || '',
      });
      setErrors({});
    }
  }, [store]);

  const validateForm = (): boolean => {
    const newErrors: Partial<EditStoreFormData> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Tên cửa hàng là bắt buộc';
    } else if (formData.name.length > 255) {
      newErrors.name = 'Tên cửa hàng không được quá 255 ký tự';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!store || !validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const updatedStore = await updateStore(store.id, {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        address: formData.address.trim() || undefined,
        phone: formData.phone.trim() || undefined,
      });

      toast({
        title: 'Thành công',
        description: 'Đã cập nhật thông tin cửa hàng',
      });

      onOpenChange(false);
      onStoreUpdated?.(updatedStore);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: error instanceof Error ? error.message : 'Đã xảy ra lỗi khi cập nhật cửa hàng',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setErrors({});
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Chỉnh sửa cửa hàng</DialogTitle>
            <DialogDescription>
              Cập nhật thông tin cửa hàng
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Tên cửa hàng *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                  if (errors.name) setErrors({ ...errors, name: undefined });
                }}
                placeholder="Nhập tên cửa hàng"
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? 'edit-name-error' : undefined}
              />
              {errors.name && (
                <p id="edit-name-error" className="text-sm text-destructive">
                  {errors.name}
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Mô tả</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Nhập mô tả cửa hàng"
                rows={3}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-address">Địa chỉ</Label>
              <Input
                id="edit-address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Nhập địa chỉ"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-phone">Số điện thoại</Label>
              <Input
                id="edit-phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Nhập số điện thoại"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Hủy
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Lưu thay đổi
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
