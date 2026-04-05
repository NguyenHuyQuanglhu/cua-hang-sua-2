'use client';

import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { apiClient } from '@/lib/api-client';
import { formatCurrency } from '@/lib/utils';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface SubscriptionTransactionItem {
  id: string;
  userId: string;
  transactionType: 'auto_renewal' | 'manual_upgrade' | 'manual_purchase';
  planId: string;
  amount: number;
  paymentMethod: string;
  paymentStatus: 'pending' | 'completed' | 'failed' | 'refunded';
  processedByRole?: 'system' | 'admin' | 'owner' | 'company_manager';
  notes?: string;
  createdAt: string;
  userInfo?: {
    fullName?: string;
    email?: string;
  };
}

interface UserLookupItem {
  id: string;
  name: string;
  email: string;
}

type FilterType = 'all' | 'assigned' | 'manual_purchase' | 'manual_upgrade' | 'auto_renewal';

function isAssignedTransaction(item: SubscriptionTransactionItem): boolean {
  const notes = (item.notes || '').toLowerCase();
  return notes.includes('cap goi') || notes.includes('cấp gói');
}

function getTransactionLabel(item: SubscriptionTransactionItem): string {
  if (isAssignedTransaction(item)) return 'Cấp gói';
  if (item.transactionType === 'manual_purchase') return 'Mua gói';
  if (item.transactionType === 'manual_upgrade') return 'Nâng cấp gói';
  return 'Tự động gia hạn';
}

function getStatusLabel(status: string): string {
  if (status === 'completed') return 'Hoàn thành';
  if (status === 'pending') return 'Đang xử lý';
  if (status === 'failed') return 'Thất bại';
  if (status === 'refunded') return 'Hoàn tiền';
  return 'Hoàn thành';
}

function getPaymentMethodLabel(method: string): string {
  const normalized = (method || '').toLowerCase();
  if (normalized === 'admin_assign') return 'Cấp bởi quản trị';
  if (normalized === 'bank_transfer') return 'Chuyển khoản';
  if (normalized === 'cash') return 'Tiền mặt';
  if (normalized === 'credit_card') return 'Thẻ tín dụng';
  if (normalized === 'auto_payment') return 'Tự động trích phí';
  return method || 'N/A';
}

export default function SubscriptionHistoryReportPage() {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<SubscriptionTransactionItem[]>([]);
  const [userLookup, setUserLookup] = useState<Record<string, UserLookupItem>>({});
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [transactionResponse, usersResponse] = await Promise.all([
          apiClient.request<{ transactions: SubscriptionTransactionItem[] }>(
            '/admin/subscription-transactions?limit=200'
          ),
          apiClient.request<unknown>('/users').catch(() => null),
        ]);

        setTransactions(transactionResponse.transactions || []);

        const rawUsers = Array.isArray(usersResponse)
          ? usersResponse
          : (
            usersResponse &&
            typeof usersResponse === 'object' &&
            'users' in usersResponse &&
            Array.isArray((usersResponse as { users?: unknown[] }).users)
          )
            ? ((usersResponse as { users: unknown[] }).users)
            : [];

        const lookup: Record<string, UserLookupItem> = {};

        rawUsers.forEach((user) => {
          if (!user || typeof user !== 'object') return;

          const typedUser = user as { id?: unknown; displayName?: unknown; email?: unknown };
          const id = String(typedUser.id || '').trim();
          if (!id) return;

          const email = String(typedUser.email || '').trim();
          const displayName = String(typedUser.displayName || '').trim();
          const accountName = displayName || (email.includes('@') ? email.split('@')[0] : email) || id;

          const normalizedId = id.toUpperCase();
          const shortId = normalizedId.slice(0, 8);
          const payload: UserLookupItem = { id, name: accountName, email };

          lookup[normalizedId] = payload;
          lookup[shortId] = payload;
        });

        setUserLookup(lookup);
      } catch (error) {
        console.error('Fetch subscription history report error:', error);
        setTransactions([]);
        setUserLookup({});
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const resolveUserInfo = (item: SubscriptionTransactionItem): { name: string; email: string } => {
    const rawUserId = String(item.userId || '').trim();
    const normalizedUserId = rawUserId.toUpperCase();
    const lookup = userLookup[normalizedUserId] || userLookup[normalizedUserId.slice(0, 8)] || null;

    const backendName = String(item.userInfo?.fullName || '').trim();
    const backendEmail = String(item.userInfo?.email || '').trim();
    const isIdLabel = /^ID:\s*[A-F0-9]{8}$/i.test(backendName);

    if (lookup) {
      return {
        name: lookup.name || backendName || `ID: ${rawUserId.slice(0, 8)}`,
        email: lookup.email || backendEmail || '-',
      };
    }

    return {
      name: backendName && !isIdLabel ? backendName : `ID: ${rawUserId.slice(0, 8)}`,
      email: backendEmail || '-',
    };
  };

  const filteredTransactions = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return transactions.filter((item) => {
      if (filterType === 'assigned' && !isAssignedTransaction(item)) {
        return false;
      }
      if (filterType !== 'all' && filterType !== 'assigned' && item.transactionType !== filterType) {
        return false;
      }

      if (!keyword) return true;

      const userName = item.userInfo?.fullName || '';
      const userEmail = item.userInfo?.email || '';
      const resolvedUser = resolveUserInfo(item);
      const notes = item.notes || '';
      const planId = item.planId || '';

      return [userName, userEmail, resolvedUser.name, resolvedUser.email, notes, planId]
        .join(' ')
        .toLowerCase()
        .includes(keyword);
    });
  }, [transactions, search, filterType, userLookup]);

  const totalAmount = useMemo(
    () => filteredTransactions.reduce((sum, item) => sum + Number(item.amount || 0), 0),
    [filteredTransactions]
  );

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Lịch sử gói dịch vụ</h1>
        <p className="text-muted-foreground">
          Theo dõi các gói dịch vụ đã cấp hoặc đã mua bởi người quản lý.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Tổng giao dịch</CardDescription>
            <CardTitle className="text-2xl">{filteredTransactions.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Tổng giá trị</CardDescription>
            <CardTitle className="text-2xl">{formatCurrency(totalAmount)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Giao dịch cấp gói</CardDescription>
            <CardTitle className="text-2xl">
              {filteredTransactions.filter((item) => isAssignedTransaction(item)).length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Bộ lọc</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên, email, ghi chú, mã gói..."
          />
          <Select value={filterType} onValueChange={(value) => setFilterType(value as FilterType)}>
            <SelectTrigger>
              <SelectValue placeholder="Loại giao dịch" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="assigned">Cấp gói</SelectItem>
              <SelectItem value="manual_purchase">Mua gói</SelectItem>
              <SelectItem value="manual_upgrade">Nâng cấp gói</SelectItem>
              <SelectItem value="auto_renewal">Tự động gia hạn</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Danh sách giao dịch gói</CardTitle>
          <CardDescription>
            {loading ? 'Đang tải dữ liệu...' : `Hiển thị ${filteredTransactions.length} giao dịch`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Thời gian</TableHead>
                  <TableHead>Người dùng</TableHead>
                  <TableHead>Loại</TableHead>
                  <TableHead>Gói</TableHead>
                  <TableHead>Thanh toán</TableHead>
                  <TableHead className="text-right">Số tiền</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!loading && filteredTransactions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Chưa có dữ liệu lịch sử gói dịch vụ
                    </TableCell>
                  </TableRow>
                )}

                {filteredTransactions.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      {item.createdAt
                        ? format(new Date(item.createdAt), 'dd/MM/yyyy HH:mm', { locale: vi })
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{resolveUserInfo(item).name}</div>
                      <div className="text-xs text-muted-foreground">{resolveUserInfo(item).email}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{getTransactionLabel(item)}</Badge>
                    </TableCell>
                    <TableCell className="font-medium uppercase">{item.planId}</TableCell>
                    <TableCell>
                      <div className="text-sm">{getPaymentMethodLabel(item.paymentMethod)}</div>
                      <div className="text-xs text-muted-foreground">{getStatusLabel(item.paymentStatus)}</div>
                    </TableCell>
                    <TableCell className="text-right font-semibold">{formatCurrency(Number(item.amount || 0))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
