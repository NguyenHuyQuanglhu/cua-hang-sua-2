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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from '@/hooks/use-toast'
import { upsertContractor } from '../actions'

interface ContractorFormModel {
  id: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  taxCode?: string;
  identityNumber?: string;
  description?: string;
}

const contractorFormSchema = z.object({
  name: z.string().min(1, "Tên nhà thầu không được để trống."),
  contactPerson: z.string().optional(),
  email: z.string().email("Email không hợp lệ.").optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  taxCode: z.string().optional(),
  identityNumber: z.string().optional(),
  description: z.string().optional(),
});

type ContractorFormValues = z.infer<typeof contractorFormSchema>;

interface ContractorFormProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  contractor?: ContractorFormModel;
}

export function ContractorForm({ isOpen, onOpenChange, contractor }: ContractorFormProps) {
  const { toast } = useToast();

  const form = useForm<ContractorFormValues>({
    resolver: zodResolver(contractorFormSchema),
    defaultValues: {
      name: '',
      contactPerson: '',
      email: '',
      phone: '',
      address: '',
      taxCode: '',
      identityNumber: '',
      description: '',
    },
  });

  useEffect(() => {
    if (!isOpen) return;

    form.reset(
      contractor
        ? { ...contractor }
        : {
            name: '',
            contactPerson: '',
            email: '',
            phone: '',
            address: '',
            taxCode: '',
            identityNumber: '',
            description: '',
          }
    );
  }, [contractor, form, isOpen]);

  const onSubmit = async (data: ContractorFormValues) => {
    const result = await upsertContractor({ ...data, id: contractor?.id });

    if (result.success) {
      toast({
        title: "Thành công!",
        description: `Đã ${contractor ? 'cập nhật' : 'tạo'} nhà thầu thành công.`,
      });
      onOpenChange(false);
      return;
    }

    toast({
      variant: "destructive",
      title: "Lỗi",
      description: result.error,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{contractor ? 'Chỉnh sửa nhà thầu' : 'Thêm nhà thầu mới'}</DialogTitle>
          <DialogDescription>
            Quản lý thông tin cá nhân, liên lạc và mô tả của nhà thầu.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tên nhà thầu</FormLabel>
                    <FormControl>
                      <Input placeholder="VD: Nguyễn Văn A / Công ty ABC" {...field} />
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
                      <Input placeholder="Người đại diện hoặc phụ trách" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                      <Input placeholder="contractor@example.com" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                name="identityNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CCCD/CMND</FormLabel>
                    <FormControl>
                      <Input placeholder="Số giấy tờ định danh" {...field} value={field.value ?? ''} />
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
                  <FormLabel>Địa chỉ liên hệ</FormLabel>
                  <FormControl>
                    <Input placeholder="123 Đường ABC, Quận 1, TP.HCM" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mô tả</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Mô tả phạm vi công việc hoặc ghi chú về nhà thầu..." {...field} value={field.value ?? ''} />
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
