'use client'

import { useEffect, useState } from 'react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { createStoreCustomerSegment, getStoreCustomerSegments, StoreCustomerSegment, upsertCustomer } from '../actions'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { Separator } from '@/components/ui/separator'
import { useUserRole } from '@/hooks/use-user-role'

const DEFAULT_DISCOUNT_BY_SEGMENT: Record<string, number> = {
  personal: 0,
  business: 10,
  wholesaler: 12,
  agency: 15,
  vip: 8,
};

const DEFAULT_CUSTOMER_SEGMENTS: StoreCustomerSegment[] = [
  { segmentKey: 'personal', segmentLabel: 'Cá nhân', baseCustomerType: 'personal', defaultDiscountRate: 0, isActive: true, isSystem: true },
  { segmentKey: 'business', segmentLabel: 'Doanh nghiệp', baseCustomerType: 'business', defaultDiscountRate: 10, isActive: true, isSystem: true },
  { segmentKey: 'wholesaler', segmentLabel: 'Đại lý sỉ', baseCustomerType: 'business', defaultDiscountRate: 12, isActive: true, isSystem: true },
  { segmentKey: 'agency', segmentLabel: 'Nhà phân phối', baseCustomerType: 'business', defaultDiscountRate: 15, isActive: true, isSystem: true },
  { segmentKey: 'vip', segmentLabel: 'VIP', baseCustomerType: 'personal', defaultDiscountRate: 8, isActive: true, isSystem: true },
];

const MIN_CUSTOMER_AGE = 12;
const EARLIEST_BIRTHDAY = new Date('1900-01-01');
const LATEST_BIRTHDAY = (() => {
  const now = new Date();
  return new Date(now.getFullYear() - MIN_CUSTOMER_AGE, now.getMonth(), now.getDate());
})();

const customerFormSchema = z.object({
  name: z.string().min(1, "Tên không được để trống."),
  email: z.string().email("Email không hợp lệ.").optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  customerSegment: z.string().min(1, 'Loại khách hàng là bắt buộc.'),
  discountRate: z.coerce.number().min(0, "Chiết khấu phải >= 0").max(100, "Chiết khấu tối đa 100%"),
  customerGroup: z.string().optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  birthday: z
    .date()
    .max(LATEST_BIRTHDAY, `Khách hàng phải từ ${MIN_CUSTOMER_AGE} tuổi trở lên.`)
    .optional(),
  zalo: z.string().optional(),
  bankName: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  bankBranch: z.string().optional(),
  creditLimit: z.coerce.number().min(0, "Hạn mức tín dụng phải là số không âm."),
  status: z.enum(['active', 'inactive']),
  loyaltyPoints: z.coerce.number().optional(),
  lifetimePoints: z.coerce.number().optional(),
  loyaltyTier: z.enum(['bronze', 'silver', 'gold', 'diamond']).optional(),
});

type CustomerFormValues = z.infer<typeof customerFormSchema>;

interface CustomerFormModel {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  customerType?: string;
  customerSegment?: string;
  customerGroup?: string;
  gender?: 'male' | 'female' | 'other';
  birthday?: string;
  zalo?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankBranch?: string;
  creditLimit: number;
  status: 'active' | 'inactive';
  loyaltyPoints?: number;
  lifetimePoints?: number;
  loyaltyTier?: 'bronze' | 'silver' | 'gold' | 'diamond';
  discountRate?: number;
}

interface CustomerFormProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean, newCustomerId?: string) => void;
  customer?: CustomerFormModel;
}

export function CustomerForm({ isOpen, onOpenChange, customer }: CustomerFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const { role } = useUserRole();
  const [segmentOptions, setSegmentOptions] = useState<StoreCustomerSegment[]>(DEFAULT_CUSTOMER_SEGMENTS);
  const [isLoadingSegments, setIsLoadingSegments] = useState(false);
  const [newSegmentLabel, setNewSegmentLabel] = useState('');
  const [newSegmentBaseType, setNewSegmentBaseType] = useState<'personal' | 'business'>('personal');
  const [isCreatingSegment, setIsCreatingSegment] = useState(false);

  const defaultValues: Partial<CustomerFormValues> = customer
    ? { 
        name: customer.name,
        email: customer.email || '',
        phone: customer.phone || '',
        address: customer.address || '',
        customerSegment: (customer as unknown as { customerSegment?: string }).customerSegment as CustomerFormValues['customerSegment'] || (customer.customerType as CustomerFormValues['customerSegment']) || 'personal',
        discountRate: Number((customer as unknown as { discountRate?: number }).discountRate || 0),
        customerGroup: customer.customerGroup || '',
        gender: customer.gender,
        birthday: customer.birthday ? new Date(customer.birthday) : undefined,
        zalo: customer.zalo || '',
        bankName: customer.bankName || '',
        bankAccountNumber: customer.bankAccountNumber || '',
        bankBranch: customer.bankBranch || '',
        creditLimit: customer.creditLimit,
        status: customer.status,
        loyaltyPoints: customer.loyaltyPoints || 0,
        lifetimePoints: customer.lifetimePoints || 0,
        loyaltyTier: customer.loyaltyTier,
      }
    : { 
        name: '',
        customerSegment: 'personal',
        discountRate: 0,
        creditLimit: 0,
        status: 'active',
        loyaltyPoints: 0,
        lifetimePoints: 0,
      };
  
  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
    defaultValues,
  });

  useEffect(() => {
    if (isOpen) {
      form.reset(
        customer
        ? { 
            name: customer.name,
            email: customer.email || '',
            phone: customer.phone || '',
            address: customer.address || '',
            customerSegment: (customer as unknown as { customerSegment?: string }).customerSegment as CustomerFormValues['customerSegment'] || (customer.customerType as CustomerFormValues['customerSegment']) || 'personal',
            discountRate: Number((customer as unknown as { discountRate?: number }).discountRate || 0),
            customerGroup: customer.customerGroup || '',
            gender: customer.gender,
            birthday: customer.birthday ? new Date(customer.birthday) : undefined,
            zalo: customer.zalo || '',
            bankName: customer.bankName || '',
            bankAccountNumber: customer.bankAccountNumber || '',
            bankBranch: customer.bankBranch || '',
            creditLimit: customer.creditLimit,
            status: customer.status,
            loyaltyPoints: customer.loyaltyPoints || 0,
            lifetimePoints: customer.lifetimePoints || 0,
            loyaltyTier: customer.loyaltyTier,
          }
        : { 
            name: '',
            email: '',
            phone: '',
            address: '',
            customerSegment: 'personal',
            discountRate: 0,
            customerGroup: '',
            gender: undefined,
            birthday: undefined,
            zalo: '',
            bankName: '',
            bankAccountNumber: '',
            bankBranch: '',
            creditLimit: 0,
            status: 'active',
            loyaltyPoints: 0,
            lifetimePoints: 0,
            loyaltyTier: undefined,
          }
      );
    }
  }, [customer, isOpen, form]);

  const selectedSegment = form.watch('customerSegment');
  const selectedSegmentConfig = segmentOptions.find((segment) => segment.segmentKey === selectedSegment);

  const canManageSegments = ['owner', 'company_manager', 'store_manager', 'admin'].includes(String(role || '').toLowerCase());
  const canEditDiscountRate = canManageSegments;

  const loadSegmentOptions = async () => {
    setIsLoadingSegments(true);
    const result = await getStoreCustomerSegments();
    if (result.success && result.data && result.data.length > 0) {
      const filteredSegments = result.data.filter(
        (segment) => segment.segmentKey !== 'worker' && segment.segmentKey !== 'tho'
      );
      setSegmentOptions(filteredSegments);
      if (!filteredSegments.some((segment) => segment.segmentKey === form.getValues('customerSegment'))) {
        form.setValue('customerSegment', 'personal');
      }
    } else {
      setSegmentOptions(DEFAULT_CUSTOMER_SEGMENTS);
      if (result.error) {
        toast({
          variant: 'destructive',
          title: 'Không tải được loại khách hàng theo cửa hàng',
          description: result.error,
        });
      }
    }
    setIsLoadingSegments(false);
  };

  useEffect(() => {
    if (isOpen) {
      loadSegmentOptions();
    }
  }, [isOpen]);

  useEffect(() => {
    const currentRate = Number(form.getValues('discountRate') || 0);
    if (!Number.isFinite(currentRate) || currentRate === 0) {
      form.setValue('discountRate', selectedSegmentConfig?.defaultDiscountRate ?? DEFAULT_DISCOUNT_BY_SEGMENT[selectedSegment] ?? 0);
    }
  }, [selectedSegment, selectedSegmentConfig, form]);

  const handleCreateSegment = async () => {
    const label = newSegmentLabel.trim();
    if (!label) {
      toast({ variant: 'destructive', title: 'Thiếu thông tin', description: 'Vui lòng nhập tên loại khách hàng.' });
      return;
    }

    setIsCreatingSegment(true);
    const result = await createStoreCustomerSegment({
      segmentLabel: label,
      baseCustomerType: newSegmentBaseType,
    });

    if (!result.success || !result.data) {
      toast({ variant: 'destructive', title: 'Không thể tạo loại khách hàng', description: result.error });
      setIsCreatingSegment(false);
      return;
    }

    await loadSegmentOptions();
    form.setValue('customerSegment', result.data.segmentKey);
    form.setValue('discountRate', Number(result.data.defaultDiscountRate || 0));
    setNewSegmentLabel('');
    toast({ title: 'Đã thêm loại khách hàng', description: `Đã thêm loại "${result.data.segmentLabel}" cho cửa hàng.` });
    setIsCreatingSegment(false);
  };

  const onSubmit = async (data: CustomerFormValues) => {
    if (!customer && !data.gender) {
      form.setError('gender', { type: 'manual', message: 'Vui lòng chọn giới tính khi thêm khách hàng mới.' });
      return;
    }

    const baseCustomerType = selectedSegmentConfig?.baseCustomerType || (
      data.customerSegment === 'business' || data.customerSegment === 'wholesaler' || data.customerSegment === 'agency'
        ? 'business'
        : 'personal'
    );

    const dataToSubmit: Record<string, unknown> = {
      ...data,
      customerType: baseCustomerType,
      id: customer?.id,
      birthday: data.birthday ? data.birthday.toISOString() : undefined,
    }
    if (!canEditDiscountRate) {
      delete dataToSubmit.discountRate;
    }
    const result = await upsertCustomer(dataToSubmit);
    if (result.success) {
      toast({
        title: "Thành công!",
        description: `Đã ${customer ? 'cập nhật' : 'tạo'} khách hàng thành công.`,
      });
      onOpenChange(false, result.customerId);
      router.refresh();
    } else {
      toast({
        variant: "destructive",
        title: "Ôi! Đã có lỗi xảy ra.",
        description: result.error,
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => onOpenChange(open)}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{customer ? 'Chỉnh sửa khách hàng' : 'Thêm khách hàng mới'}</DialogTitle>
          <DialogDescription>
            Điền vào các chi tiết dưới đây.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-rows-[1fr_auto] gap-4 max-h-[80vh] overflow-hidden">
            <div className='space-y-4 overflow-y-auto pr-6'>
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Tên khách hàng</FormLabel>
                        <FormControl>
                            <Input placeholder="Nguyễn Văn A" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                      name="customerSegment"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Loại khách hàng</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Chọn loại khách hàng" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {segmentOptions.map((segment) => (
                                      <SelectItem key={segment.segmentKey} value={segment.segmentKey}>{segment.segmentLabel}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormDescription>
                              {isLoadingSegments ? 'Đang tải loại khách hàng theo cửa hàng...' : 'Danh sách loại khách hàng được cấu hình riêng cho cửa hàng hiện tại.'}
                            </FormDescription>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Trạng thái</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Chọn trạng thái" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="active">Đang hoạt động</SelectItem>
                                    <SelectItem value="inactive">Ngừng hoạt động</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
                {canManageSegments && (
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_180px_auto] gap-2 rounded-md border p-3">
                    <Input
                      placeholder="Thêm loại khách hàng mới cho cửa hàng"
                      value={newSegmentLabel}
                      onChange={(event) => setNewSegmentLabel(event.target.value)}
                    />
                    <Select value={newSegmentBaseType} onValueChange={(value) => setNewSegmentBaseType(value as 'personal' | 'business')}>
                      <SelectTrigger>
                        <SelectValue placeholder="Loại nền" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="personal">Nhóm cá nhân</SelectItem>
                        <SelectItem value="business">Nhóm doanh nghiệp</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button type="button" onClick={handleCreateSegment} disabled={isCreatingSegment}>
                      {isCreatingSegment ? 'Đang thêm...' : 'Thêm loại'}
                    </Button>
                  </div>
                )}
                {canEditDiscountRate && (
                  <FormField
                    control={form.control}
                    name="discountRate"
                    render={({ field }) => (
                      <FormItem>
                      <FormLabel>Chiết khấu mặc định (%)</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} max={100} step="0.01" placeholder="0" {...field} />
                      </FormControl>
                      <FormDescription>Áp dụng riêng cho khách hàng này khi tính chiết khấu.</FormDescription>
                      <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                 <FormField
                    control={form.control}
                    name="customerGroup"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Nhóm khách hàng</FormLabel>
                        <FormControl>
                            <Input placeholder="Vd: VIP, Thân thiết" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                                <Input placeholder="example@email.com" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Điện thoại</FormLabel>
                            <FormControl>
                                <Input placeholder="0905123456" {...field} />
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
                            <Input placeholder="123 Đường ABC, Quận 1, TP.HCM" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                        control={form.control}
                        name="gender"
                        render={({ field }) => (
                            <FormItem>
                        <FormLabel>Giới tính{!customer ? ' *' : ''}</FormLabel>
                         <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Chọn giới tính" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="male">Nam</SelectItem>
                                    <SelectItem value="female">Nữ</SelectItem>
                                    <SelectItem value="other">Khác</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="birthday"
                        render={({ field }) => (
                            <FormItem className="pt-2">
                                <FormLabel>Ngày sinh</FormLabel>
                                <FormControl>
                                  <Input
                                    type="date"
                                    min={format(EARLIEST_BIRTHDAY, 'yyyy-MM-dd')}
                                    max={format(LATEST_BIRTHDAY, 'yyyy-MM-dd')}
                                    value={field.value ? format(field.value, 'yyyy-MM-dd') : ''}
                                    onChange={(event) => {
                                      const value = event.target.value;
                                      field.onChange(value ? new Date(`${value}T00:00:00`) : undefined);
                                    }}
                                  />
                                </FormControl>
                                <FormDescription>
                                  Nhập hoặc chọn ngày sinh. Tuổi tối thiểu {MIN_CUSTOMER_AGE}.
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="zalo"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Zalo</FormLabel>
                            <FormControl>
                                <Input placeholder="Số điện thoại Zalo" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                 </div>
                 <Separator />
                  <div>
                    <h3 className="text-md font-medium">Thông tin ngân hàng</h3>
                    <p className="text-sm text-muted-foreground mb-4">Thông tin thanh toán của khách hàng.</p>
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="bankName"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Tên ngân hàng</FormLabel>
                            <FormControl>
                                <Input placeholder="Vd: Vietcombank" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="bankAccountNumber"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Số tài khoản</FormLabel>
                            <FormControl>
                                <Input placeholder="0123456789" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="bankBranch"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Chi nhánh</FormLabel>
                            <FormControl>
                                <Input placeholder="Vd: PGD Thủ Đức" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                      />
                    </div>
                  </div>
                 <Separator />
                 <FormField
                        control={form.control}
                        name="creditLimit"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Hạn mức tín dụng</FormLabel>
                            <FormControl>
                                <Input type="number" {...field} value={field.value ?? 0} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                {customer && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="text-md font-medium">Khách hàng thân thiết</h3>
                      <p className="text-sm text-muted-foreground mb-4">Điều chỉnh hạng và điểm thưởng của khách hàng.</p>
                      <div className="space-y-4">
                        <FormField
                            control={form.control}
                            name="loyaltyTier"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Hạng thành viên</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value || ''}>
                                    <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Chọn hạng thành viên" />
                                    </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="bronze">Đồng (Bronze)</SelectItem>
                                        <SelectItem value="silver">Bạc (Silver)</SelectItem>
                                        <SelectItem value="gold">Vàng (Gold)</SelectItem>
                                        <SelectItem value="diamond">Kim cương (Diamond)</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormDescription>Hạng thành viên quyết định mức chiết khấu.</FormDescription>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                              control={form.control}
                              name="loyaltyPoints"
                              render={({ field }) => (
                                  <FormItem>
                                  <FormLabel>Điểm có thể tiêu</FormLabel>
                                  <FormControl>
                                      <Input type="number" {...field} value={field.value ?? 0} />
                                  </FormControl>
                                  <FormDescription>Số điểm khách hàng có thể dùng để giảm giá.</FormDescription>
                                  <FormMessage />
                                  </FormItem>
                              )}
                          />
                          <FormField
                              control={form.control}
                              name="lifetimePoints"
                              render={({ field }) => (
                                  <FormItem>
                                  <FormLabel>Tổng điểm tích lũy</FormLabel>
                                  <FormControl>
                                      <Input type="number" {...field} value={field.value ?? 0} />
                                  </FormControl>
                                  <FormDescription>Tổng điểm để xét hạng tự động.</FormDescription>
                                  <FormMessage />
                                  </FormItem>
                              )}
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}
            </div>

            <DialogFooter className="pt-4 border-t">
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
