'use client'

import {
  MoreHorizontal,
  PlusCircle,
  Search,
  ListFilter,
  Store,
  ChevronDown,
  Pencil,
  Trash2,
  Key,
  UserCog,
  Building2,
  RefreshCw,
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
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
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
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { UserForm } from "./components/user-form"
import { AssignStoresDialog } from "./components/assign-stores-dialog"
import { useState, useMemo, useEffect, useCallback } from "react"
import { useUserRole } from "@/hooks/use-user-role"
import { deleteUser, getUsers, updateUserStatus } from "./actions"
import { useToast } from "@/hooks/use-toast"
import type { Permissions, UserRole } from "@/lib/types"
import { getRoleVietnamese, getManageableRoles, canManageRole } from "@/lib/types"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface UserStoreAssignment {
  storeId: string;
  storeName: string;
  storeCode: string;
  roleOverride?: string;
  permissionsOverride?: Permissions;
}

interface UserWithStores {
  id: string;
  email: string;
  displayName?: string;
  role: UserRole;
  permissions?: Permissions;
  status: 'active' | 'inactive';
  stores: UserStoreAssignment[];
  createdAt: string;
  updatedAt?: string;
}

type StatusFilter = 'all' | 'active' | 'inactive';

function getStatusBadge(status: string) {
  switch (status) {
    case 'active':
      return <Badge variant="default">Hoạt động</Badge>;
    case 'inactive':
      return <Badge variant="secondary">Ngừng hoạt động</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function getRoleBadgeVariant(role: UserRole): "default" | "secondary" | "outline" | "destructive" {
  switch (role) {
    case 'owner': return 'default';
    case 'company_manager': return 'secondary';
    case 'store_manager': return 'outline';
    case 'salesperson': return 'outline';
    default: return 'outline';
  }
}

export default function UsersPage() {
  const { permissions, role: currentUserRole, isLoading: isRoleLoading, userId: currentUserId, userStores } = useUserRole();
  const { toast } = useToast();

  const [users, setUsers] = useState<UserWithStores[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithStores | undefined>(undefined);
  const [userToDelete, setUserToDelete] = useState<UserWithStores | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [userToAssignStores, setUserToAssignStores] = useState<UserWithStores | null>(null);
  const [userToResetPassword, setUserToResetPassword] = useState<UserWithStores | null>(null);

  // Get manageable roles for current user
  const manageableRoles = useMemo(() => {
    if (!currentUserRole) return [];
    return getManageableRoles(currentUserRole as UserRole);
  }, [currentUserRole]);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    const result = await getUsers();
    if (result.success && result.users) {
      setUsers(result.users as UserWithStores[]);
    } else {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: result.error || "Không thể tải danh sách người dùng",
      });
    }
    setIsLoading(false);
  }, [toast]);

  useEffect(() => {
    if (!isRoleLoading) {
      fetchUsers();
    }
  }, [isRoleLoading, fetchUsers]);

  // Filter users based on role hierarchy and search/filter criteria
  const filteredUsers = useMemo(() => {
    return users?.filter(user => {
      // Role hierarchy filter - only show users that current user can manage
      // Owner can see all users, others can only see users with lower roles
      if (currentUserRole !== 'owner') {
        // Can't see users with same or higher role (except themselves)
        if (user.id !== currentUserId && !canManageRole(currentUserRole as UserRole, user.role)) {
          return false;
        }
      }

      // Store Manager can only see users assigned to their stores
      if (currentUserRole === 'store_manager' && user.id !== currentUserId) {
        const currentUserStoreIds = userStores?.map(s => s.storeId) || [];
        const userStoreIds = user.stores?.map(s => s.storeId) || [];
        const hasCommonStore = userStoreIds.some(id => currentUserStoreIds.includes(id));
        if (!hasCommonStore && user.role !== 'owner' && user.role !== 'company_manager') {
          return false;
        }
      }

      // Role filter
      if (roleFilter !== 'all' && user.role !== roleFilter) {
        return false;
      }

      // Status filter
      if (statusFilter !== 'all' && user.status !== statusFilter) {
        return false;
      }

      // Search filter
      const term = searchTerm.toLowerCase();
      if (term) {
        return (
          user.email.toLowerCase().includes(term) ||
          (user.displayName && user.displayName.toLowerCase().includes(term))
        );
      }

      return true;
    });
  }, [users, searchTerm, roleFilter, statusFilter, currentUserRole, currentUserId, userStores]);

  const canAccess = permissions?.users?.includes('view');
  const canAdd = permissions?.users?.includes('add');
  const canEdit = permissions?.users?.includes('edit');
  const canDelete = permissions?.users?.includes('delete');

  const handleAddUser = () => {
    setSelectedUser(undefined);
    setIsFormOpen(true);
  }

  const handleEditUser = (user: UserWithStores) => {
    setSelectedUser(user);
    setIsFormOpen(true);
  }

  const handleStatusChange = async (userId: string, newStatus: 'active' | 'inactive') => {
    setIsUpdatingStatus(true);
    const result = await updateUserStatus(userId, newStatus);
    if (result.success) {
      toast({
        title: "Thành công!",
        description: `Đã ${newStatus === 'active' ? 'kích hoạt' : 'vô hiệu hóa'} người dùng.`,
      });
      fetchUsers();
    } else {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: result.error,
      });
    }
    setIsUpdatingStatus(false);
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    const result = await deleteUser(userToDelete.id);
    if (result.success) {
      toast({
        title: "Thành công!",
        description: `Đã xóa người dùng ${userToDelete.displayName || userToDelete.email}.`,
      });
      fetchUsers();
    } else {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: result.error,
      });
    }
    setIsDeleting(false);
    setUserToDelete(null);
  };

  const handleFormClose = (open: boolean) => {
    setIsFormOpen(open);
    if (!open) {
      fetchUsers();
    }
  };

  const handleResetPassword = async () => {
    if (!userToResetPassword) return;
    try {
      const response = await fetch(`http://localhost:3001/api/users/${userToResetPassword.id}/reset-password`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'X-Store-Id': localStorage.getItem('store_id') || '',
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        toast({
          title: "Thành công!",
          description: (
            <div className="space-y-2">
              <p>Đã đặt lại mật khẩu cho {userToResetPassword.email}</p>
              {data.tempPassword && (
                <div className="bg-muted p-3 rounded-md">
                  <p className="text-sm font-semibold mb-1">Mật khẩu tạm thời:</p>
                  <p className="text-lg font-mono font-bold select-all">{data.tempPassword}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    ⚠️ Người dùng đã bị đăng xuất và cần đăng nhập lại với mật khẩu này. Sau đó họ nên đổi mật khẩu trong phần Cài đặt.
                  </p>
                </div>
              )}
            </div>
          ),
          duration: 15000, // Show for 15 seconds
        });
      } else {
        const error = await response.json();
        toast({
          variant: "destructive",
          title: "Lỗi",
          description: error.error || "Không thể đặt lại mật khẩu",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: "Không thể đặt lại mật khẩu",
      });
    }
    setUserToResetPassword(null);
  };

  // Check if user role requires store assignment
  const needsStoreAssignment = (role: UserRole) => {
    return role === 'store_manager' || role === 'salesperson';
  };

  if (isLoading || isRoleLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div>Đang tải...</div>
      </div>
    );
  }

  if (!canAccess) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Truy cập bị từ chối</CardTitle>
          <CardDescription>
            Bạn không có quyền truy cập trang này.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>Chỉ những người dùng có quyền &apos;Xem người dùng&apos; mới có thể truy cập trang này.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      <UserForm
        isOpen={isFormOpen}
        onOpenChange={handleFormClose}
        user={selectedUser}
        allUsers={users}
        onUserUpdated={fetchUsers}
      />
      
      {/* Assign Stores Dialog */}
      {userToAssignStores && (
        <AssignStoresDialog
          isOpen={!!userToAssignStores}
          onOpenChange={(open) => !open && setUserToAssignStores(null)}
          userId={userToAssignStores.id}
          userName={userToAssignStores.displayName || userToAssignStores.email}
          currentStores={userToAssignStores.stores}
          onSuccess={fetchUsers}
        />
      )}

      {/* Reset Password Confirmation Dialog */}
      <AlertDialog open={!!userToResetPassword} onOpenChange={(open) => !open && setUserToResetPassword(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Đặt lại mật khẩu</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc muốn đặt lại mật khẩu cho{' '}
              <strong>{userToResetPassword?.displayName || userToResetPassword?.email}</strong>?
              Một email hướng dẫn đặt lại mật khẩu sẽ được gửi đến địa chỉ email của họ.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetPassword}>
              Đặt lại mật khẩu
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete User Confirmation Dialog */}
      <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bạn có chắc chắn không?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này sẽ vô hiệu hóa tài khoản của{' '}
              <strong>{userToDelete?.displayName || userToDelete?.email}</strong> và thu hồi quyền truy cập của họ ngay lập tức.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} disabled={isDeleting}>
              {isDeleting ? "Đang xóa..." : "Xóa"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card>
        <CardHeader>
          <CardTitle>Quản lý người dùng</CardTitle>
          <CardDescription>
            Quản lý tài khoản và phân quyền người dùng trong hệ thống.
          </CardDescription>
          <div className="flex flex-wrap items-center gap-4 pt-4">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Tìm theo tên, email..."
                className="w-full rounded-lg bg-background pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-10 gap-1">
                  <ListFilter className="h-3.5 w-3.5" />
                  <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                    Vai trò
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Lọc theo vai trò</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup value={roleFilter} onValueChange={(value) => setRoleFilter(value as UserRole | 'all')}>
                  <DropdownMenuRadioItem value="all">Tất cả</DropdownMenuRadioItem>
                  {currentUserRole === 'owner' && (
                    <>
                      <DropdownMenuRadioItem value="owner">Chủ sở hữu</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="company_manager">Quản lý công ty</DropdownMenuRadioItem>
                    </>
                  )}
                  {(currentUserRole === 'owner' || currentUserRole === 'company_manager') && (
                    <DropdownMenuRadioItem value="store_manager">Quản lý cửa hàng</DropdownMenuRadioItem>
                  )}
                  <DropdownMenuRadioItem value="salesperson">Nhân viên bán hàng</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-10 gap-1">
                  <ListFilter className="h-3.5 w-3.5" />
                  <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                    Trạng thái
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Lọc theo trạng thái</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
                  <DropdownMenuRadioItem value="all">Tất cả</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="active">Hoạt động</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="inactive">Ngừng hoạt động</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="ml-auto flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-10 gap-1"
                onClick={fetchUsers}
                title="Tải lại danh sách"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                  Tải lại
                </span>
              </Button>
              {canAdd && manageableRoles.length > 0 && (
                <Button size="sm" className="h-10 gap-1" onClick={handleAddUser}>
                  <PlusCircle className="h-3.5 w-3.5" />
                  <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                    Thêm người dùng
                  </span>
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">STT</TableHead>
                <TableHead>Tên hiển thị</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Vai trò</TableHead>
                <TableHead>Cửa hàng</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>
                  <span className="sr-only">Hành động</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">Đang tải...</TableCell>
                </TableRow>
              )}
              {!isLoading && filteredUsers?.map((user, index) => {
                const isCurrentUser = user.id === currentUserId;
                const canManage = canManageRole(currentUserRole as UserRole, user.role);
                return (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell className="font-medium">
                      {user.displayName || 'N/A'}
                      {isCurrentUser && <Badge variant="outline" className="ml-2">Bạn</Badge>}
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(user.role)}>
                        {getRoleVietnamese(user.role)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.role === 'owner' || user.role === 'company_manager' ? (
                        <span className="text-muted-foreground text-sm">Tất cả cửa hàng</span>
                      ) : user.stores && user.stores.length > 0 ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-1 cursor-pointer">
                                <Store className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">{user.stores.length} cửa hàng</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="space-y-1">
                                {user.stores.map((store) => (
                                  <div key={store.storeId} className="text-sm">
                                    {store.storeName} ({store.storeCode})
                                  </div>
                                ))}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <span className="text-muted-foreground text-sm">Chưa gán</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {canEdit && canManage && !isCurrentUser ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="p-1 h-auto" disabled={isUpdatingStatus}>
                              {getStatusBadge(user.status)}
                              <ChevronDown className="h-3 w-3 ml-1" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            <DropdownMenuItem 
                              onClick={() => handleStatusChange(user.id, 'active')}
                              disabled={user.status === 'active'}
                            >
                              Hoạt động
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleStatusChange(user.id, 'inactive')}
                              disabled={user.status === 'inactive'}
                            >
                              Ngừng hoạt động
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : (
                        getStatusBadge(user.status)
                      )}
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
                          <DropdownMenuSeparator />
                          {canEdit && (canManage || isCurrentUser) && (
                            <DropdownMenuItem onClick={() => handleEditUser(user)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Chỉnh sửa thông tin
                            </DropdownMenuItem>
                          )}
                          {canEdit && canManage && !isCurrentUser && (
                            <DropdownMenuItem onClick={() => setUserToResetPassword(user)}>
                              <Key className="mr-2 h-4 w-4" />
                              Đặt lại mật khẩu
                            </DropdownMenuItem>
                          )}
                          {canEdit && canManage && !isCurrentUser && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleStatusChange(user.id, user.status === 'active' ? 'inactive' : 'active')}
                              >
                                <UserCog className="mr-2 h-4 w-4" />
                                {user.status === 'active' ? 'Vô hiệu hóa' : 'Kích hoạt'}
                              </DropdownMenuItem>
                            </>
                          )}
                          {canDelete && canManage && !isCurrentUser && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => setUserToDelete(user)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Xóa người dùng
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
              {!isLoading && filteredUsers?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    Không tìm thấy người dùng nào.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter>
          <div className="text-xs text-muted-foreground">
            Hiển thị <strong>{filteredUsers?.length || 0}</strong> trên <strong>{users?.length || 0}</strong> người dùng
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
