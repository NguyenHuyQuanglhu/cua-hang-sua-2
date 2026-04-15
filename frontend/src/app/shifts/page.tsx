'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import {
  Search,
  ArrowUp,
  ArrowDown,
  MoreHorizontal,
  Calendar as CalendarIcon,
  ListFilter
} from 'lucide-react'
import { DateRange } from 'react-day-picker'
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns'

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { formatCurrency, cn } from '@/lib/utils'
import Link from 'next/link'
import { Calendar } from '@/components/ui/calendar'
import { useUserRole } from '@/hooks/use-user-role'
import { getShifts } from './actions'
import { Shift } from '@/lib/repositories/shift-repository'

type SortKey = 'startTime' | 'userName' | 'status' | 'totalRevenue' | 'cashDifference';
type StatusFilter = 'all' | 'open' | 'closed';

export default function ShiftsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('startTime')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [userFilter, setUserFilter] = useState<string>('all');
  
  const { permissions, isLoading: isRoleLoading } = useUserRole();
  
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get unique users from shifts for filter
  const users = useMemo(() => {
    const userMap = new Map<string, { id: string; name: string }>();
    shifts.forEach(shift => {
      if (!userMap.has(shift.userId)) {
        userMap.set(shift.userId, { id: shift.userId, name: shift.userName || 'Không rõ' });
      }
    });
    return Array.from(userMap.values());
  }, [shifts]);

  const normalizeShift = useCallback((raw: Record<string, unknown>): Shift => ({
    id: String(raw.id ?? ''),
    storeId: String(raw.storeId ?? ''),
    userId: String(raw.userId ?? ''),
    userName: raw.userName ? String(raw.userName) : undefined,
    startTime: String(raw.startTime ?? new Date().toISOString()),
    endTime: raw.endTime ? String(raw.endTime) : undefined,
    startingCash: Number(raw.startingCash ?? 0),
    endingCash: raw.endingCash !== undefined ? Number(raw.endingCash) : undefined,
    expectedCash: raw.expectedCash !== undefined ? Number(raw.expectedCash) : undefined,
    cashDifference: raw.cashDifference !== undefined ? Number(raw.cashDifference) : undefined,
    status: raw.status === 'closed' ? 'closed' : 'open',
    totalSales: raw.totalSales !== undefined ? Number(raw.totalSales) : undefined,
    totalTransactions: raw.totalTransactions !== undefined ? Number(raw.totalTransactions) : undefined,
    totalRevenue: raw.totalRevenue !== undefined ? Number(raw.totalRevenue) : undefined,
    cashSales: raw.cashSales !== undefined ? Number(raw.cashSales) : undefined,
    cashPayments: raw.cashPayments !== undefined ? Number(raw.cashPayments) : undefined,
    totalCashInDrawer: raw.totalCashInDrawer !== undefined ? Number(raw.totalCashInDrawer) : undefined,
    salesCount: raw.salesCount !== undefined ? Number(raw.salesCount) : undefined,
    notes: raw.notes ? String(raw.notes) : undefined,
    createdAt: String(raw.createdAt ?? new Date().toISOString()),
    updatedAt: raw.updatedAt ? String(raw.updatedAt) : undefined,
  }), []);

  // Fetch shifts
  const fetchShifts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await getShifts({
        dateFrom: dateRange?.from?.toISOString(),
        dateTo: dateRange?.to?.toISOString(),
        pageSize: 1000, // Get all shifts for client-side filtering
      });
      
      if (result.success && result.data) {
        setShifts(result.data.map(normalizeShift));
      } else {
        setError(result.error || 'Không thể lấy danh sách ca làm việc');
      }
    } catch (err) {
      setError('Đã xảy ra lỗi khi tải dữ liệu');
    } finally {
      setIsLoading(false);
    }
  }, [dateRange, normalizeShift]);

  useEffect(() => {
    fetchShifts();
  }, [fetchShifts]);

  useEffect(() => {
    const refreshInterval = setInterval(() => {
      fetchShifts();
    }, 15000);

    return () => clearInterval(refreshInterval);
  }, [fetchShifts]);

  const filteredShifts = useMemo(() => {
    return shifts?.filter(shift => {
      const term = searchTerm.toLowerCase()
      const searchMatch = !term ||
        (shift.userName || '').toLowerCase().includes(term) ||
        shift.id.toLowerCase().includes(term);
      
      const statusMatch = statusFilter === 'all' || shift.status === statusFilter;
      const userMatch = userFilter === 'all' || shift.userId === userFilter;

      return searchMatch && statusMatch && userMatch;
    });
  }, [shifts, searchTerm, statusFilter, userFilter]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDirection('asc')
    }
  }

  const sortedShifts = useMemo(() => {
    const sortableItems = [...(filteredShifts || [])]
    if (sortKey) {
      sortableItems.sort((a, b) => {
        let valA, valB

        switch (sortKey) {
          case 'startTime':
            valA = new Date(a.startTime).getTime()
            valB = new Date(b.startTime).getTime()
            break
          case 'totalRevenue':
          case 'cashDifference':
            valA = a[sortKey] || 0
            valB = b[sortKey] || 0
            break
          default:
            valA = (a[sortKey] || '').toString().toLowerCase()
            valB = (b[sortKey] || '').toString().toLowerCase()
        }

        if (valA < valB) return sortDirection === 'asc' ? -1 : 1
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1
        return 0
      })
    }
    return sortableItems
  }, [filteredShifts, sortKey, sortDirection])
  
  const setDatePreset = (preset: 'this_week' | 'this_month' | 'this_year' | 'all') => {
    const now = new Date();
    if (preset === 'all') {
      setDateRange(undefined);
      return;
    }
    switch (preset) {
      case 'this_week':
        setDateRange({ from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) });
        break;
      case 'this_month':
        setDateRange({ from: startOfMonth(now), to: endOfMonth(now) });
        break;
      case 'this_year':
        setDateRange({ from: startOfYear(now), to: endOfYear(now) });
        break;
    }
  }

  const SortableHeader = ({ sortKey: key, children, className }: { sortKey: SortKey; children: React.ReactNode; className?: string }) => (
    <TableHead className={className}>
      <Button variant="ghost" onClick={() => handleSort(key)} className="px-2 py-1 h-auto">
        {children}
        {sortKey === key && (
          sortDirection === 'asc' ? <ArrowUp className="h-4 w-4 ml-2" /> : <ArrowDown className="h-4 w-4 ml-2" />
        )}
      </Button>
    </TableHead>
  )

  const pageLoading = isLoading || isRoleLoading;
  const canView = permissions?.reports_shifts?.includes('view');

  if (pageLoading) {
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

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Lỗi</CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={fetchShifts}>Thử lại</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>Quản lý Ca làm việc</CardTitle>
              <CardDescription>
                Xem lại lịch sử và chi tiết các ca làm việc của nhân viên.
              </CardDescription>
            </div>
          </div>
           <div className="flex flex-wrap items-center gap-4 pt-4">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Tìm theo tên nhân viên, mã ca..."
                    className="w-full rounded-lg bg-background pl-8 md:w-64"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Popover>
                  <PopoverTrigger asChild>
                      <Button
                      variant={"outline"}
                      className={cn(
                          "w-[240px] justify-start text-left font-normal",
                          !dateRange && "text-muted-foreground"
                      )}
                      >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange?.from ? (dateRange.to ? <>{format(dateRange.from, "dd/MM/yyyy")} - {format(dateRange.to, "dd/MM/yyyy")}</> : format(dateRange.from, "dd/MM/yyyy")) : <span>Tất cả</span>}
                      </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                          mode="range"
                          selected={dateRange}
                          onSelect={setDateRange}
                          initialFocus
                      />
                       <div className="p-2 border-t grid grid-cols-3 gap-1">
                          <Button variant="ghost" size="sm" onClick={() => setDatePreset('this_week')}>Tuần này</Button>
                          <Button variant="ghost" size="sm" onClick={() => setDatePreset('this_month')}>Tháng này</Button>
                          <Button variant="ghost" size="sm" onClick={() => setDatePreset('this_year')}>Năm nay</Button>
                          <Button variant="ghost" size="sm" onClick={() => setDatePreset('all')}>Tất cả</Button>
                      </div>
                  </PopoverContent>
              </Popover>
               <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-10 gap-1">
                    <ListFilter className="h-3.5 w-3.5" />
                    <span>Lọc</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Lọc theo Trạng thái</DropdownMenuLabel>
                    <DropdownMenuRadioGroup value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                        <DropdownMenuRadioItem value="all">Tất cả</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="open">Đang hoạt động</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="closed">Đã đóng</DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Lọc theo Nhân viên</DropdownMenuLabel>
                     <DropdownMenuRadioGroup value={userFilter} onValueChange={(v) => setUserFilter(v)}>
                        <DropdownMenuRadioItem value="all">Tất cả</DropdownMenuRadioItem>
                        {users.map(user => (
                            <DropdownMenuRadioItem key={user.id} value={user.id}>{user.name}</DropdownMenuRadioItem>
                        ))}
                    </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
           </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16 hidden md:table-cell">STT</TableHead>
                <SortableHeader sortKey="startTime">Thời gian bắt đầu</SortableHeader>
                <SortableHeader sortKey="userName">Nhân viên</SortableHeader>
                <SortableHeader sortKey="status">Trạng thái</SortableHeader>
                <TableHead className="text-right">Tiền đầu ca</TableHead>
                <SortableHeader sortKey="totalRevenue" className="text-right">Doanh thu</SortableHeader>
                <SortableHeader sortKey="cashDifference" className="text-right">Chênh lệch</SortableHeader>
                <TableHead>
                  <span className="sr-only">Hành động</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={8} className="text-center">Đang tải...</TableCell></TableRow>}
              {!isLoading && sortedShifts?.map((shift, index) => (
                  <TableRow key={shift.id}>
                    <TableCell className="font-medium hidden md:table-cell">{index + 1}</TableCell>
                    <TableCell>
                      {new Date(shift.startTime).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}
                    </TableCell>
                    <TableCell>{shift.userName}</TableCell>
                    <TableCell>
                      <Badge variant={shift.status === 'open' ? 'default' : 'secondary'}>
                        {shift.status === 'open' ? 'Đang hoạt động' : 'Đã đóng'}
                        </Badge>
                    </TableCell>
                     <TableCell className="text-right">{formatCurrency(shift.startingCash)}</TableCell>
                    <TableCell className="text-right font-semibold text-primary">{formatCurrency(shift.totalRevenue || 0)}</TableCell>
                    <TableCell className={`text-right font-semibold ${shift.cashDifference && shift.cashDifference !== 0 ? 'text-destructive' : ''}`}>{formatCurrency(shift.cashDifference || 0)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button aria-haspopup="true" size="icon" variant="ghost">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Hành động</DropdownMenuLabel>
                          <DropdownMenuItem asChild>
                            <Link href={`/shifts/${shift.id}`}>Xem chi tiết</Link>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {!isLoading && sortedShifts?.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={8} className="text-center h-24">
                           Chưa có ca làm việc nào.
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter>
          <div className="text-xs text-muted-foreground">
            Hiển thị <strong>{sortedShifts?.length || 0}</strong> trên <strong>{shifts?.length || 0}</strong> ca làm việc
          </div>
        </CardFooter>
      </Card>
    </>
  )
}
