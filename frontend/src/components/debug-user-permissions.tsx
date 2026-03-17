'use client'

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useUserRole } from '@/hooks/use-user-role';
import { canManageRole, getRoleVietnamese, type UserRole } from '@/lib/types';

interface DebugUserPermissionsProps {
  targetUser?: {
    id: string;
    email: string;
    role: UserRole;
    status: string;
  };
}

export function DebugUserPermissions({ targetUser }: DebugUserPermissionsProps) {
  const { permissions, role: currentUserRole, userId: currentUserId } = useUserRole();
  const [isVisible, setIsVisible] = useState(false);

  if (!targetUser || process.env.NODE_ENV === 'production') {
    return null;
  }

  const canDelete = permissions?.users?.includes('delete') || false;
  const canManage = currentUserRole ? canManageRole(currentUserRole as UserRole, targetUser.role) : false;
  const isSelf = targetUser.id === currentUserId;

  const roleHierarchy = {
    owner: 4,
    company_manager: 3,
    store_manager: 2,
    salesperson: 1
  };

  return (
    <div className="mt-4">
      <Button 
        variant="outline" 
        size="sm" 
        onClick={() => setIsVisible(!isVisible)}
        className="mb-2"
      >
        {isVisible ? 'Ẩn' : 'Hiện'} Debug Info
      </Button>
      
      {isVisible && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-sm">Debug: Quyền Xóa Người Dùng</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <h4 className="font-medium mb-2">Thông tin người dùng hiện tại:</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>Role: <Badge>{getRoleVietnamese(currentUserRole as UserRole)}</Badge></div>
                <div>Level: {roleHierarchy[currentUserRole as UserRole] || 0}</div>
                <div>User ID: <code className="text-xs">{currentUserId}</code></div>
                <div>Has delete permission: <Badge variant={canDelete ? 'default' : 'destructive'}>{canDelete ? 'Có' : 'Không'}</Badge></div>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Thông tin người dùng muốn xóa:</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>Email: {targetUser.email}</div>
                <div>Role: <Badge>{getRoleVietnamese(targetUser.role)}</Badge></div>
                <div>Level: {roleHierarchy[targetUser.role] || 0}</div>
                <div>Status: <Badge variant={targetUser.status === 'active' ? 'default' : 'secondary'}>{targetUser.status}</Badge></div>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Kiểm tra quyền:</h4>
              <div className="space-y-1 text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant={canDelete ? 'default' : 'destructive'}>
                    {canDelete ? '✓' : '✗'}
                  </Badge>
                  <span>Có quyền delete trong module users</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={canManage ? 'default' : 'destructive'}>
                    {canManage ? '✓' : '✗'}
                  </Badge>
                  <span>Có thể quản lý role {getRoleVietnamese(targetUser.role)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={!isSelf ? 'default' : 'destructive'}>
                    {!isSelf ? '✓' : '✗'}
                  </Badge>
                  <span>Không phải chính mình</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={targetUser.status === 'active' ? 'default' : 'secondary'}>
                    {targetUser.status === 'active' ? '✓' : '?'}
                  </Badge>
                  <span>User đang active</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Kết luận:</h4>
              <div className="p-2 rounded bg-white border">
                {canDelete && canManage && !isSelf && targetUser.status === 'active' ? (
                  <Badge variant="default">✓ Có thể xóa người dùng này</Badge>
                ) : (
                  <div>
                    <Badge variant="destructive">✗ Không thể xóa người dùng này</Badge>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Lý do: {!canDelete && 'Không có quyền delete'} 
                      {!canManage && 'Không thể quản lý role này'} 
                      {isSelf && 'Không thể xóa chính mình'}
                      {targetUser.status !== 'active' && 'User không active'}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="text-xs text-muted-foreground">
              <p>Debug component này chỉ hiển thị trong development mode.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}