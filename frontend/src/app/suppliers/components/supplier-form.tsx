
'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { upsertSupplier } from '../actions'
import { useToast } from '@/hooks/use-toast'

interface SupplierFormModel {
  id: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  taxCode?: string;
  notes?: string;
}

const supplierFormSchema = z.object({
  name: z.string().min(1, "Tên nhà cung cấp không được để trống."),
  contactPerson: z.string().optional(),
  email: z.string().email("Email không hợp lệ.").optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  taxCode: z.string().optional(),
  notes: z.string().optional(),
});

type SupplierFormValues = z.infer<typeof supplierFormSchema>;

interface SupplierFormProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  supplier?: SupplierFormModel;
}

export function SupplierForm({ isOpen, onOpenChange, supplier }: SupplierFormProps) {
  const { toast } = useToast();

  const form = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierFormSchema),
    defaultValues: {
        name: '',
        contactPerson: '',
        email: '',
        phone: '',
        address: '',
        taxCode: '',
        notes: ''
    },
  });

  useEffect(() => {
    if (isOpen) {
      form.reset(
        supplier 
        ? { ...supplier } 
        : {
            name: '',
            contactPerson: '',
            email: '',
            phone: '',
            address: '',
            taxCode: '',
            notes: ''
        }
      );
    }
  }, [supplier, isOpen, form]);

  const onSubmit = async (data: SupplierFormValues) => {
    const result = await upsertSupplier({ ...data, id: supplier?.id });
    if (result.success) {
      toast({
        title: "Thành công!",
        description: `Đã ${supplier ? 'cập nhật' : 'tạo'} nhà cung cấp thành công.`,
      });
      onOpenChange(false);
    } else {
      toast({
        variant: "destructive",
        title: "Ôi! Đã có lỗi xảy ra.",
        description: result.error,
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{supplier ? 'Chỉnh sửa nhà cung cấp' : 'Thêm nhà cung cấp mới'}</DialogTitle>
          <DialogDescription>
            Điền thông tin chi tiết của nhà cung cấp.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Tên nhà cung cấp</FormLabel>
                        <FormControl>
                            <Input placeholder="Vd: Công ty TNHH Hạt giống ABC" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="contactPerson"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Người liên hệ</FormLabel>
                        <FormControl>
                            <Input placeholder="Nguyễn Văn A" {...field} value={field.value ?? ''} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Số điện thoại</FormLabel>
                        <FormControl>
                            <Input placeholder="0905123456" {...field} value={field.value ?? ''} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                            <Input placeholder="contact@abc.com" {...field} value={field.value ?? ''} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
             <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Địa chỉ</FormLabel>
                    <FormControl>
                        <Input placeholder="123 Đường ABC, Quận 1, TP.HCM" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
             <FormField
                control={form.control}
                name="taxCode"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Mã số thuế</FormLabel>
                    <FormControl>
                        <Input placeholder="0123456789" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Ghi chú</FormLabel>
                    <FormControl>
                        <Textarea placeholder="Ghi chú thêm về nhà cung cấp..." {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Hủy</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Đang lưu...' : 'Lưu'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
