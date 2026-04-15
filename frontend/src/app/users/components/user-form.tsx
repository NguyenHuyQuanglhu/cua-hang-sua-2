'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
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
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from "@/components/ui/input"
import type { Module, Permission, Permissions, UserRole } from '@/lib/types'
import { getRoleVietnamese, getManageableRoles, ROLE_HIERARCHY } from '@/lib/types'
import { upsertUser } from '../actions'
import { useToast } from '@/hooks/use-toast'
import { RefreshCw, Copy, Store, X } from 'lucide-react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { useUserRole } from '@/hooks/use-user-role'
import { Badge } from '@/components/ui/badge'
import { apiClient } from '@/lib/api-client'

interface UserStoreAssignment {
  storeId: string;
  storeName: string;
  storeCode: string;
  role?: string;
  permissions?: Permissions;
}

interface UserWithStores {
  id: string;
  email: string;
  displayName?: string;
  role: UserRole;
  permissions?: Permissions;
  status: 'active' | 'inactive';
  stores: UserStoreAssignment[];
  subscriptionPlanId?: string;
  subscriptionMonths?: number;
  autoRenewal?: boolean;
  subscriptionStartDate?: string;
  subscriptionEndDate?: string;
}

interface StoreOption {
  id: string;
  name: string;
  code: string;
}

interface SubscriptionPlanOption {
  id: string;
  name: string;
  maxStores: number;
  price: number;
  isActive?: boolean;
}

// Allow empty permissions - user will use default role permissions
const permissionsSchema = z.record(z.array(z.enum(['view', 'add', 'edit', 'delete'])).optional()).optional().default({})

const userInfoSchemaBase = z.object({
  email: z.string().email({ message: "Email không hợp lệ." }),
  displayName: z.string().optional(),
  role: z.enum(['owner', 'company_manager', 'store_manager', 'salesperson']),
  storeIds: z.array(z.string()).optional(),
  hourlyRate: z.number().min(0, 'Lương theo giờ phải >= 0').optional(),
  maxShiftHours: z.number().min(1, 'Giới hạn giờ phải >= 1').max(24, 'Giới hạn giờ phải <= 24').optional(),
  subscriptionPlanId: z.string().optional(),
  subscriptionMonths: z.number().min(1, 'Thời hạn gói phải từ 1 tháng').max(24, 'Thời hạn tối đa 24 tháng').optional(),
  autoRenewal: z.boolean().optional(),
});

const newUserInfoSchema = userInfoSchemaBase.extend({
  password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự.'),
});

const updateUserInfoSchema = userInfoSchemaBase.extend({
  password: z.string().optional().refine(val => !val || val.length >= 6, {
    message: 'Mật khẩu mới phải có ít nhất 6 ký tự.',
  }),
});

const permissionsFormSchema = z.object({
  permissions: permissionsSchema,
})

const permissionGroups: { groupName: string; modules: { id: Module; name: string; description: string; }[] }[] = [
  {
    groupName: "Nghiệp vụ cơ bản",
    modules: [
      { id: 'dashboard', name: 'Bảng điều khiển', description: 'Xem tổng quan tình hình kinh doanh, doanh thu, công nợ.' },
      { id: 'pos', name: 'POS - Bán tại quầy', description: 'Sử dụng giao diện bán hàng nhanh tại quầy.' },
      { id: 'categories', name: 'Danh mục', description: 'Quản lý các loại sản phẩm (VD: Giống, Phân bón).' },
      { id: 'units', name: 'Đơn vị tính', description: 'Quản lý các đơn vị (VD: Cái, Kg, Bao).' },
      { id: 'suppliers', name: 'Nhà cung cấp', description: 'Quản lý thông tin các nhà cung cấp hàng hóa.' },
      { id: 'products', name: 'Sản phẩm', description: 'Quản lý thông tin, giá và các lô nhập của sản phẩm.' },
      { id: 'purchases', name: 'Nhập hàng', description: 'Tạo và quản lý các phiếu nhập hàng từ nhà cung cấp.' },
      { id: 'sales', name: 'Bán hàng', description: 'Tạo và quản lý các đơn hàng bán cho khách.' },
      { id: 'customers', name: 'Khách hàng', description: 'Quản lý thông tin và công nợ của khách hàng.' },
      { id: 'cash-flow', name: 'Sổ quỹ', description: 'Quản lý các giao dịch thu, chi tiền mặt.' },
    ]
  },
  {
    groupName: "Báo cáo & Phân tích",
    modules: [
      { id: 'reports_shifts', name: 'BC - Quản lý Ca', description: 'Xem lại và quản lý các ca làm việc của nhân viên.' },
      { id: 'reports_income_statement', name: 'BC - Thu-Chi', description: 'Báo cáo kết quả kinh doanh (lãi/lỗ).' },
      { id: 'reports_profit', name: 'BC - Lợi nhuận', description: 'Phân tích lợi nhuận theo sản phẩm.' },
      { id: 'reports_debt', name: 'BC - Công nợ KH', description: 'Báo cáo tổng hợp công nợ khách hàng.' },
      { id: 'reports_supplier_debt', name: 'BC - Công nợ NCC', description: 'Báo cáo tổng hợp công nợ nhà cung cấp.' },
      { id: 'reports_transactions', name: 'BC - Lịch sử Giao dịch', description: 'Xem lại nhật ký giao dịch của khách hàng.' },
      { id: 'reports_supplier_debt_tracking', name: 'BC - Đối soát Công nợ NCC', description: 'Xem biến động công nợ của nhà cung cấp.' },
      { id: 'reports_revenue', name: 'BC - Doanh thu', description: 'Báo cáo doanh thu chi tiết theo đơn hàng.' },
      { id: 'reports_sold_products', name: 'BC - SP đã bán', description: 'Thống kê các sản phẩm đã được bán ra.' },
      { id: 'reports_inventory', name: 'BC - Tồn kho', description: 'Báo cáo nhập, xuất, tồn kho của sản phẩm.' },
    ]
  },
  {
    groupName: "Phân tích AI",
    modules: [
      { id: 'reports_ai_segmentation', name: 'AI - Phân khúc KH', description: 'Sử dụng AI để phân nhóm khách hàng.' },
      { id: 'reports_ai_basket_analysis', name: 'AI - Phân tích rổ hàng', description: 'Sử dụng AI để tìm sản phẩm mua kèm.' },
      { id: 'ai_forecast', name: 'AI - Dự báo & Đề xuất', description: 'Sử dụng AI để dự báo doanh số và đề xuất nhập hàng.' },
    ]
  },
  {
    groupName: "Quản trị hệ thống",
    modules: [
      { id: 'users', name: 'Người dùng', description: 'Quản lý tài khoản và phân quyền người dùng hệ thống.' },
      { id: 'settings', name: 'Cài đặt', description: 'Tùy chỉnh thông tin chung và giao diện của ứng dụng.' },
    ]
  }
];

const permissions: { id: Permission; name: string }[] = [
  { id: 'view', name: 'Xem' },
  { id: 'add', name: 'Thêm' },
  { id: 'edit', name: 'Sửa' },
  { id: 'delete', name: 'Xóa' },
]

const defaultPermissions: Record<UserRole, Permissions> = {
  owner: {
    dashboard: ['view'],
    pos: ['view', 'add', 'edit', 'delete'],
    categories: ['view', 'add', 'edit', 'delete'],
    units: ['view', 'add', 'edit', 'delete'],
    suppliers: ['view', 'add', 'edit', 'delete'],
    products: ['view', 'add', 'edit', 'delete'],
    purchases: ['view', 'add', 'edit', 'delete'],
    sales: ['view', 'add', 'edit', 'delete'],
    customers: ['view', 'add', 'edit', 'delete'],
    'cash-flow': ['view', 'add', 'edit', 'delete'],
    reports_shifts: ['view'],
    reports_income_statement: ['view'],
    reports_profit: ['view'],
    reports_debt: ['view'],
    reports_supplier_debt: ['view'],
    reports_transactions: ['view'],
    reports_supplier_debt_tracking: ['view'],
    reports_revenue: ['view'],
    reports_sold_products: ['view'],
    reports_inventory: ['view'],
    reports_ai_segmentation: ['view'],
    reports_ai_basket_analysis: ['view'],
    ai_forecast: ['view'],
    users: ['view', 'add', 'edit', 'delete'],
    settings: ['view', 'edit'],
  },
  company_manager: {
    dashboard: ['view'],
    pos: ['view', 'add', 'edit'],
    categories: ['view', 'add', 'edit', 'delete'],
    units: ['view', 'add', 'edit', 'delete'],
    suppliers: ['view', 'add', 'edit'],
    products: ['view', 'add', 'edit', 'delete'],
    purchases: ['view', 'add', 'edit'],
    sales: ['view', 'add', 'edit'],
    customers: ['view', 'add', 'edit'],
    'cash-flow': ['view', 'add', 'edit', 'delete'],
    reports_shifts: ['view'],
    reports_income_statement: ['view'],
    reports_profit: ['view'],
    reports_debt: ['view'],
    reports_supplier_debt: ['view'],
    reports_transactions: ['view'],
    reports_supplier_debt_tracking: ['view'],
    reports_revenue: ['view'],
    reports_sold_products: ['view'],
    reports_inventory: ['view'],
    reports_ai_segmentation: ['view'],
    reports_ai_basket_analysis: ['view'],
    ai_forecast: ['view'],
    users: ['view'],
    settings: ['view'],
  },
  store_manager: {
    dashboard: ['view'],
    pos: ['view', 'add', 'edit'],
    categories: ['view', 'add', 'edit'],
    units: ['view', 'add', 'edit'],
    suppliers: ['view', 'add'],
    products: ['view', 'add', 'edit'],
    purchases: ['view', 'add', 'edit'],
    sales: ['view', 'add', 'edit'],
    customers: ['view', 'add', 'edit'],
    'cash-flow': ['view', 'add', 'edit', 'delete'],
    reports_shifts: ['view'],
    reports_income_statement: ['view'],
    reports_profit: ['view'],
    reports_debt: ['view'],
    reports_supplier_debt: ['view'],
    reports_transactions: ['view'],
    reports_supplier_debt_tracking: ['view'],
    reports_revenue: ['view'],
    reports_sold_products: ['view'],
    reports_inventory: ['view'],
    reports_ai_segmentation: ['view'],
    reports_ai_basket_analysis: ['view'],
    ai_forecast: ['view'],
  },
  salesperson: {
    dashboard: ['view'],
    pos: ['view', 'add'],
    products: ['view'],
    sales: ['view', 'add'],
    customers: ['view', 'add'],
  },
};

interface UserFormProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  user?: UserWithStores;
  allUsers?: UserWithStores[];
  onUserUpdated?: () => void;
}

export function UserForm({ isOpen, onOpenChange, user, allUsers, onUserUpdated }: UserFormProps) {
  const { toast } = useToast();
  const { role: currentUserRole, userStores } = useUserRole();
  const [copyUserPopoverOpen, setCopyUserPopoverOpen] = useState(false);
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlanOption[]>([]);
  const [plansLoading, setPlansLoading] = useState(false);

  const isEditMode = !!user;
  const dialogWidthClass = isEditMode ? 'sm:max-w-5xl' : 'sm:max-w-[760px]';
  const layoutClass = isEditMode ? 'grid grid-cols-1 md:grid-cols-2' : 'grid grid-cols-1';

  // Get available stores from current user's stores
  const availableStores: StoreOption[] = useMemo(() => {
    return userStores?.map(s => ({
      id: s.storeId,
      name: s.storeName,
      code: s.storeCode,
    })) || [];
  }, [userStores]);

  const infoForm = useForm<z.infer<typeof userInfoSchemaBase> & { password?: string }>({
    resolver: zodResolver(isEditMode ? updateUserInfoSchema : newUserInfoSchema),
    defaultValues: {
      email: '',
      displayName: '',
      role: 'salesperson',
      password: '',
      storeIds: [],
    }
  });

  const permissionsForm = useForm<z.infer<typeof permissionsFormSchema>>({
    resolver: zodResolver(permissionsFormSchema),
    defaultValues: {
      permissions: {}
    }
  });

  const role = infoForm.watch('role');
  const selectedStoreIds = infoForm.watch('storeIds') || [];
  const shouldShowSubscriptionSection = true;

  useEffect(() => {
    if (isOpen) {
      if (user) {
        const derivedSubscriptionMonths = user.subscriptionMonths || (
          user.subscriptionStartDate && user.subscriptionEndDate
            ? Math.max(
                1,
                (new Date(user.subscriptionEndDate).getFullYear() - new Date(user.subscriptionStartDate).getFullYear()) * 12 +
                (new Date(user.subscriptionEndDate).getMonth() - new Date(user.subscriptionStartDate).getMonth())
              )
            : 1
        );

        infoForm.reset({
          email: user.email,
          displayName: user.displayName || '',
          role: user.role,
          password: '',
          storeIds: user.stores?.map(s => s.storeId) || [],
          subscriptionPlanId: user.subscriptionPlanId || '',
          subscriptionMonths: derivedSubscriptionMonths,
          autoRenewal: user.autoRenewal ?? true,
        });
        // If user has custom permissions (including empty object), use them
        // If permissions is null/undefined, show default permissions for the role
        const userPerms = user.permissions;
        const hasCustomPermissions = userPerms !== null && userPerms !== undefined;
        permissionsForm.reset({
          permissions: hasCustomPermissions ? userPerms : (defaultPermissions[user.role] || {})
        });
      } else {
        infoForm.reset({
          email: '',
          displayName: '',
          role: 'salesperson',
          password: '',
          storeIds: [],
          subscriptionPlanId: '',
          subscriptionMonths: 1,
          autoRenewal: true,
        });
        permissionsForm.reset({
          permissions: defaultPermissions.salesperson
        });
      }
    }
  }, [user, isOpen, infoForm, permissionsForm]);

  useEffect(() => {
    if (!isOpen || !shouldShowSubscriptionSection) {
      return;
    }

    const fetchSubscriptionPlans = async () => {
      setPlansLoading(true);
      try {
        const response = await apiClient.request<{ plans: SubscriptionPlanOption[] }>('/subscription/plans');
        setSubscriptionPlans(response.plans || []);

        const currentPlan = infoForm.getValues('subscriptionPlanId');
        if (!currentPlan && response.plans && response.plans.length > 0) {
          const defaultPlan = response.plans.find((plan) => plan.id === 'basic') || response.plans[0];
          infoForm.setValue('subscriptionPlanId', defaultPlan.id, { shouldDirty: true });
        }
      } catch (error) {
        console.error('Fetch subscription plans for user form error:', error);
      } finally {
        setPlansLoading(false);
      }
    };

    fetchSubscriptionPlans();
  }, [isOpen, isEditMode, shouldShowSubscriptionSection, infoForm]);

  // Get manageable roles for current user
  const manageableRoles = useMemo(() => {
    if (!currentUserRole) return [];
    const normalizedRole = currentUserRole === 'admin' ? 'owner' : currentUserRole;
    return getManageableRoles(normalizedRole as UserRole);
  }, [currentUserRole]);

  const handleApplyDefaultPermissions = () => {
    if (role) {
      permissionsForm.setValue('permissions', defaultPermissions[role as UserRole], { shouldValidate: true, shouldDirty: true });
      toast({
        title: "Đã áp dụng",
        description: `Đã áp dụng bộ quyền mặc định cho vai trò "${getRoleVietnamese(role)}".`,
      });
    }
  };

  const handleClearAllPermissions = () => {
    permissionsForm.setValue('permissions', {}, { shouldValidate: true, shouldDirty: true });
    toast({
      title: "Đã xóa",
      description: "Đã bỏ chọn tất cả các quyền.",
    });
  };

  const handleAddStore = useCallback((storeId: string) => {
    const current = infoForm.getValues('storeIds') || [];
    if (!current.includes(storeId)) {
      infoForm.setValue('storeIds', [...current, storeId], { shouldDirty: true });
    }
  }, [infoForm]);

  const handleRemoveStore = useCallback((storeId: string) => {
    const current = infoForm.getValues('storeIds') || [];
    infoForm.setValue('storeIds', current.filter(id => id !== storeId), { shouldDirty: true });
  }, [infoForm]);

  const onInfoSubmit = async (data: z.infer<typeof userInfoSchemaBase> & { password?: string }) => {
    const payload: Record<string, unknown> = {
      ...data,
      id: user?.id,
      storeIds: data.storeIds,
    };

    const result = await upsertUser({
      ...payload,
    });
    if (result.success) {
      toast({
        title: "Thành công!",
        description: `Đã ${user ? 'cập nhật' : 'tạo'} thông tin người dùng.`,
      });
      // Refresh danh sách người dùng
      onUserUpdated?.();
      if (!user) {
        onOpenChange(false);
        infoForm.reset();
      }
    } else {
      toast({
        variant: "destructive",
        title: "Ôi! Đã có lỗi xảy ra.",
        description: result.error,
      });
    }
  };

  const onPermissionsSubmit = async (data: z.infer<typeof permissionsFormSchema>) => {
    // Filter out empty permission arrays to clean up the data
    const cleanedPermissions: Record<string, string[]> = {};
    if (data.permissions) {
      for (const [module, perms] of Object.entries(data.permissions)) {
        if (perms && Array.isArray(perms) && perms.length > 0) {
          cleanedPermissions[module] = perms;
        }
      }
    }
    
    console.log('[UserForm] Submitting permissions:', JSON.stringify(cleanedPermissions));
    // Send empty object if no permissions selected - backend will set to null (use default role permissions)
    const result = await upsertUser({ id: user?.id, permissions: cleanedPermissions });
    console.log('[UserForm] Result:', result);
    if (result.success) {
      toast({
        title: "Thành công!",
        description: Object.keys(cleanedPermissions).length > 0 
          ? `Đã cập nhật phân quyền.`
          : `Đã xóa phân quyền tùy chỉnh. Người dùng sẽ sử dụng quyền mặc định theo vai trò.`,
      });
      permissionsForm.reset(data, { keepValues: true });
      // Refresh danh sách người dùng
      onUserUpdated?.();
    } else {
      toast({
        variant: "destructive",
        title: "Ôi! Đã có lỗi xảy ra.",
        description: result.error,
      });
    }
  }

  const handleCopyPermissions = (sourceUserId: string) => {
    const sourceUser = allUsers?.find(u => u.id === sourceUserId);
    if (sourceUser?.permissions) {
      permissionsForm.setValue('permissions', sourceUser.permissions, { shouldValidate: true, shouldDirty: true });
      toast({
        title: "Đã sao chép",
        description: `Đã sao chép quyền từ người dùng ${sourceUser.displayName || sourceUser.email}.`
      });
    }
    setCopyUserPopoverOpen(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className={`${dialogWidthClass} h-[90vh] max-h-[90vh] flex flex-col border-0 bg-gradient-to-b from-slate-50 to-white p-0 overflow-hidden`}>
        <DialogHeader className="shrink-0 border-b bg-[radial-gradient(circle_at_top_left,_#e2e8f0,_#f8fafc_60%)] px-6 py-5">
          <DialogTitle className="text-2xl font-bold tracking-tight">{user ? 'Chỉnh sửa người dùng' : 'Thêm người dùng mới'}</DialogTitle>
          <DialogDescription>
            {user ? 'Cập nhật chi tiết cho người dùng này.' : 'Tạo tài khoản mới, gán vai trò và phân quyền chi tiết.'}
          </DialogDescription>
        </DialogHeader>
        <div className={`${layoutClass} gap-5 overflow-y-auto p-5 flex-1 min-h-0`}>
          <Form {...infoForm}>
            <form onSubmit={infoForm.handleSubmit(onInfoSubmit)} className="flex flex-col w-full">
              <Card className="flex flex-col border-slate-200 shadow-sm">
                <CardHeader className="shrink-0 border-b bg-slate-50/80">
                  <CardTitle className="text-xl">Thông tin tài khoản</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 p-5">
                  <FormField
                    control={infoForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem className="rounded-xl border border-slate-200 bg-white/90 p-3">
                        <FormLabel className="text-slate-700">Email</FormLabel>
                        <FormControl>
                          <Input className="h-11 bg-slate-50" placeholder="example@email.com" {...field} disabled={!!user} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={infoForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem className="rounded-xl border border-slate-200 bg-white/90 p-3">
                        <FormLabel className="text-slate-700">Mật khẩu</FormLabel>
                        <FormControl>
                          <Input className="h-11 bg-slate-50" type="password" placeholder={user ? "Để trống nếu không muốn đổi" : "••••••••"} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={infoForm.control}
                    name="displayName"
                    render={({ field }) => (
                      <FormItem className="rounded-xl border border-slate-200 bg-white/90 p-3">
                        <FormLabel className="text-slate-700">Tên hiển thị</FormLabel>
                        <FormControl>
                          <Input className="h-11 bg-slate-50" placeholder="John Doe" {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={infoForm.control}
                    name="hourlyRate"
                    render={({ field }) => (
                      <FormItem className="rounded-xl border border-slate-200 bg-white/90 p-3">
                        <FormLabel className="text-slate-700">Lương theo giờ (VNĐ)</FormLabel>
                        <FormControl>
                          <Input 
                            className="h-11 bg-slate-50"
                            type="number" 
                            placeholder="20000" 
                            {...field} 
                            value={field.value || ''} 
                            onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                          />
                        </FormControl>
                        <p className="text-xs text-muted-foreground">
                          Lương nhân viên nhận được mỗi giờ làm việc
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={infoForm.control}
                    name="maxShiftHours"
                    render={({ field }) => (
                      <FormItem className="rounded-xl border border-slate-200 bg-white/90 p-3">
                        <FormLabel className="text-slate-700">Giới hạn giờ làm việc</FormLabel>
                        <FormControl>
                          <Input 
                            className="h-11 bg-slate-50"
                            type="number" 
                            placeholder="8" 
                            step="0.5"
                            {...field} 
                            value={field.value || ''} 
                            onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                          />
                        </FormControl>
                        <p className="text-xs text-muted-foreground">
                          Số giờ tối đa nhân viên có thể làm việc trong một ca (mặc định: 8 giờ)
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={infoForm.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem className="rounded-xl border border-slate-200 bg-white/90 p-3">
                        <FormLabel className="text-slate-700">Vai trò</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-11 bg-slate-50">
                              <SelectValue placeholder="Chọn một vai trò" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {/* Only show roles that current user can manage (lower than their own) */}
                            {manageableRoles.map((roleOption) => (
                              <SelectItem key={roleOption} value={roleOption}>
                                {getRoleVietnamese(roleOption)}
                              </SelectItem>
                            ))}
                            {manageableRoles.length === 0 && (
                              <SelectItem value="none" disabled>
                                Bạn không có quyền tạo người dùng
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {shouldShowSubscriptionSection && (
                    <div className="space-y-4 rounded-xl border border-amber-200 bg-amber-50/60 p-4">
                      <div className="text-sm font-semibold text-amber-800">Cấp gói dịch vụ</div>

                      <FormField
                        control={infoForm.control}
                        name="subscriptionPlanId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Gói dịch vụ</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ''}>
                              <FormControl>
                                <SelectTrigger className="h-11 bg-white">
                                  <SelectValue placeholder={plansLoading ? 'Đang tải gói...' : 'Chọn gói dịch vụ'} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {subscriptionPlans.map((plan) => (
                                  <SelectItem key={plan.id} value={plan.id}>
                                    {plan.name} ({plan.maxStores >= 999 ? 'không giới hạn cửa hàng' : `${plan.maxStores} cửa hàng`})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={infoForm.control}
                        name="subscriptionMonths"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Thời hạn gói (tháng)</FormLabel>
                            <FormControl>
                              <Input
                                className="h-11 bg-white"
                                type="number"
                                min={1}
                                max={24}
                                value={field.value || ''}
                                onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : 1)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={infoForm.control}
                        name="autoRenewal"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border border-amber-200 bg-white p-3">
                            <div className="space-y-1">
                              <FormLabel>Tự động gia hạn</FormLabel>
                              <p className="text-xs text-muted-foreground">
                                Bật để tài khoản quản lý tự động gia hạn khi hết hạn gói.
                              </p>
                            </div>
                            <FormControl>
                              <Checkbox
                                checked={Boolean(field.value)}
                                onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  {/* Store Assignment Section - Only for store_manager and salesperson */}
                  {(role === 'store_manager' || role === 'salesperson') && (
                    <FormField
                      control={infoForm.control}
                      name="storeIds"
                      render={() => (
                        <FormItem className="rounded-xl border border-slate-200 bg-white/90 p-3">
                          <FormLabel className="flex items-center gap-2">
                            <Store className="h-4 w-4" />
                            Cửa hàng được gán
                          </FormLabel>
                          <div className="space-y-2">
                            {/* Selected stores */}
                            <div className="flex flex-wrap gap-2">
                              {selectedStoreIds.map(storeId => {
                                const store = availableStores.find(s => s.id === storeId);
                                return store ? (
                                  <Badge key={storeId} variant="secondary" className="flex items-center gap-1">
                                    {store.name} ({store.code})
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveStore(storeId)}
                                      className="ml-1 hover:text-destructive"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </Badge>
                                ) : null;
                              })}
                            </div>
                            {/* Store selector */}
                            <Select onValueChange={handleAddStore}>
                              <SelectTrigger className="h-11 bg-slate-50">
                                <SelectValue placeholder="Chọn cửa hàng để gán..." />
                              </SelectTrigger>
                              <SelectContent>
                                {availableStores
                                  .filter(s => !selectedStoreIds.includes(s.id))
                                  .map(store => (
                                    <SelectItem key={store.id} value={store.id}>
                                      {store.name} ({store.code})
                                    </SelectItem>
                                  ))}
                                {availableStores.filter(s => !selectedStoreIds.includes(s.id)).length === 0 && (
                                  <SelectItem value="none" disabled>
                                    Không còn cửa hàng nào
                                  </SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  {(role === 'owner' || role === 'company_manager') && (
                    <div className="text-sm text-muted-foreground flex items-center gap-2 p-3 bg-slate-100 rounded-lg border border-slate-200">
                      <Store className="h-4 w-4" />
                      <span>Vai trò này có quyền truy cập tất cả cửa hàng</span>
                    </div>
                  )}
                </CardContent>
                <div className="p-5 pt-0 shrink-0">
                  <Button type="submit" className="w-full h-11 font-semibold" disabled={infoForm.formState.isSubmitting}>
                    {infoForm.formState.isSubmitting ? 'Đang lưu...' : (isEditMode ? 'Lưu thay đổi thông tin' : 'Tạo người dùng')}
                  </Button>
                </div>
              </Card>
            </form>
          </Form>

          {isEditMode && (
            <Form {...permissionsForm}>
              <form onSubmit={permissionsForm.handleSubmit(onPermissionsSubmit)} className="flex flex-col">
                <Card className="flex flex-col border-slate-200 shadow-sm">
                  <CardHeader className="shrink-0 border-b bg-slate-50/80">
                    <div className="space-y-3">
                      <CardTitle className="text-xl">Phân quyền chi tiết</CardTitle>
                      <div className="flex flex-wrap gap-2">
                        <Popover open={copyUserPopoverOpen} onOpenChange={setCopyUserPopoverOpen}>
                          <PopoverTrigger asChild>
                            <Button type="button" variant="outline" size="sm" className="text-xs">
                              <Copy className="h-3 w-3 mr-1" />Sao chép
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[300px] p-0">
                            <Command>
                              <CommandInput placeholder="Tìm người dùng..." />
                              <CommandList>
                                <CommandEmpty>Không tìm thấy.</CommandEmpty>
                                <CommandGroup>
                                  {allUsers?.filter(u => u.id !== user?.id).map((sourceUser) => (
                                    <CommandItem key={sourceUser.id} value={`${sourceUser.displayName} ${sourceUser.email}`} onSelect={() => handleCopyPermissions(sourceUser.id)}>
                                      {sourceUser.displayName || sourceUser.email}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <Button size="sm" variant="outline" type="button" onClick={handleClearAllPermissions} className="text-xs">
                          <X className="h-3 w-3 mr-1" />
                          Bỏ chọn tất cả
                        </Button>
                        {role && (
                          <Button size="sm" variant="outline" type="button" onClick={handleApplyDefaultPermissions} className="text-xs">
                            <RefreshCw className="h-3 w-3 mr-1" />
                            Mặc định
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 p-5">
                    <Accordion type="multiple" className="w-full" defaultValue={permissionGroups.map(g => g.groupName)}>
                      {permissionGroups.map(group => {
                        // Only owner and admin can see/edit system administration permissions
                        if (group.groupName === 'Quản trị hệ thống' && currentUserRole !== 'owner' && currentUserRole !== 'admin') {
                          return null;
                        }
                        return (
                          <AccordionItem value={group.groupName} key={group.groupName}>
                            <AccordionTrigger>{group.groupName}</AccordionTrigger>
                            <AccordionContent className="space-y-2 pl-2">
                              {group.modules.map((module) => (
                                <FormField
                                  key={module.id}
                                  control={permissionsForm.control}
                                  name={`permissions.${module.id}`}
                                  render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border border-slate-200 p-3 bg-white shadow-sm">
                                      <div className="space-y-0.5">
                                        <FormLabel className="cursor-pointer">{module.name}</FormLabel>
                                      </div>
                                      <div className="flex items-center space-x-4">
                                        {permissions.map((permission) => {
                                          const currentValue = field.value || [];
                                          const isChecked = currentValue.includes(permission.id);
                                          return (
                                            <div
                                              key={permission.id}
                                              className="flex flex-row items-center space-x-2"
                                            >
                                              <Checkbox
                                                id={`${module.id}-${permission.id}`}
                                                checked={isChecked}
                                                onCheckedChange={(checked) => {
                                                  if (checked) {
                                                    field.onChange([...currentValue, permission.id]);
                                                  } else {
                                                    const newValue = currentValue.filter((v: string) => v !== permission.id);
                                                    // Set to empty array instead of undefined
                                                    field.onChange(newValue);
                                                  }
                                                }}
                                              />
                                              <label 
                                                htmlFor={`${module.id}-${permission.id}`}
                                                className="text-sm font-normal cursor-pointer"
                                              >
                                                {permission.name}
                                              </label>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </FormItem>
                                  )}
                                />
                              ))}
                            </AccordionContent>
                          </AccordionItem>
                        )
                      })}
                    </Accordion>
                  </CardContent>
                  <div className="p-5 pt-4 shrink-0">
                    <Button type="submit" className="w-full h-11 font-semibold" disabled={permissionsForm.formState.isSubmitting}>
                      {permissionsForm.formState.isSubmitting ? 'Đang lưu...' : 'Lưu phân quyền'}
                    </Button>
                  </div>
                </Card>
              </form>
            </Form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
