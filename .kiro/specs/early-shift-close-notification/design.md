# Design: Thông báo đóng ca sớm

## 1. Tổng quan kiến trúc

Tính năng này mở rộng hệ thống quản lý ca làm việc hiện tại để theo dõi thời gian làm việc dự kiến và thông báo cho quản lý khi nhân viên đóng ca sớm hơn quy định.

### 1.1 Luồng dữ liệu

```
[Frontend: Mở ca] 
  → Chọn thời gian dự kiến (2-12 tiếng)
  → POST /api/shifts/start { expectedHours }
  → [Backend: Lưu vào DB]

[Frontend: Trong ca]
  → Hiển thị progress bar (X/Y tiếng)
  → Tính toán real-time

[Frontend: Đóng ca]
  → Tính chênh lệch thời gian
  → Nếu đóng sớm > 30 phút:
    → Hiển thị dialog hỏi lý do
    → POST /api/shifts/:id/close { endingCash, earlyCloseReason }
  → [Backend: Kiểm tra + Tạo notification]
```

## 2. Database Schema Changes

### 2.1 Bảng Shifts - Thêm cột

```sql
ALTER TABLE Shifts ADD ExpectedHours DECIMAL(5,2) DEFAULT 8.0;
ALTER TABLE Shifts ADD EarlyCloseReason NVARCHAR(500) NULL;
```

**Giải thích:**
- `ExpectedHours`: Thời gian làm việc dự kiến (giờ), mặc định 8.0
- `EarlyCloseReason`: Lý do đóng ca sớm (tùy chọn)

### 2.2 Bảng Notifications (đã tồn tại)

Sử dụng bảng Notifications hiện có với type = 'early_shift_close'

## 3. Backend API Design

### 3.1 POST /api/shifts/start

**Thay đổi:**
- Thêm tham số `expectedHours` (optional, default: 8.0)

**Request:**
```typescript
{
  startingCash: number;
  expectedHours?: number; // 2, 4, 6, 8, 10, 12
}
```

**Validation:**
- `expectedHours` phải nằm trong [2, 4, 6, 8, 10, 12]
- Nếu không truyền, sử dụng 8.0

**Response:** (không đổi)

### 3.2 POST /api/shifts/:id/close

**Thay đổi:**
- Thêm tham số `earlyCloseReason` (optional)
- Thêm logic kiểm tra đóng ca sớm

**Request:**
```typescript
{
  endingCash: number;
  earlyCloseReason?: string; // Tùy chọn
}
```

**Logic mới:**
```typescript
// 1. Tính thời gian làm việc thực tế
const actualHours = (endTime - startTime) / (1000 * 60 * 60);

// 2. Lấy expectedHours từ DB
const expectedHours = shift.ExpectedHours || 8.0;

// 3. Tính chênh lệch
const difference = actualHours - expectedHours;

// 4. Nếu đóng sớm > 30 phút (0.5 giờ)
if (difference < -0.5) {
  // 4.1 Lưu lý do (nếu có)
  await query(
    'UPDATE Shifts SET EarlyCloseReason = @reason WHERE id = @id',
    { id, reason: earlyCloseReason }
  );

  // 4.2 Tạo notification cho quản lý
  await createEarlyCloseNotification({
    shiftId: id,
    employeeName: shift.user_name,
    storeId: shift.store_id,
    expectedHours,
    actualHours,
    difference: Math.abs(difference),
    reason: earlyCloseReason,
  });

  // 4.3 Log audit
  await logAudit({
    action: 'early_shift_close',
    entityType: 'shift',
    entityId: id,
    details: { expectedHours, actualHours, difference, reason: earlyCloseReason },
  });
}
```

### 3.3 GET /api/shifts/early-close-reports (Mới)

**Mục đích:** Xem báo cáo đóng ca sớm (cho quản lý)

**Query Parameters:**
- `startDate` (optional): Từ ngày
- `endDate` (optional): Đến ngày
- `userId` (optional): Lọc theo nhân viên

**Response:**
```typescript
{
  reports: Array<{
    shiftId: string;
    employeeId: string;
    employeeName: string;
    expectedHours: number;
    actualHours: number;
    difference: number; // Số giờ chênh lệch (âm = đóng sớm)
    reason: string | null;
    startTime: string;
    endTime: string;
  }>;
  summary: {
    totalEarlyCloses: number;
    averageDifference: number;
  };
}
```

**Authorization:**
- Chỉ Owner, Company Manager, Store Manager được xem

## 4. Frontend Design

### 4.1 Component: shift-controls.tsx

#### 4.1.1 State mới

```typescript
const [expectedHours, setExpectedHours] = useState(8); // Thời gian dự kiến
const [showEarlyCloseDialog, setShowEarlyCloseDialog] = useState(false);
const [earlyCloseReason, setEarlyCloseReason] = useState('');
```

#### 4.1.2 UI khi mở ca

Thêm dropdown chọn thời gian dự kiến:

```tsx
<div className="space-y-2">
  <Label>Thời gian làm việc dự kiến</Label>
  <Select value={expectedHours.toString()} onValueChange={(v) => setExpectedHours(Number(v))}>
    <SelectTrigger>
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="2">2 tiếng</SelectItem>
      <SelectItem value="4">4 tiếng</SelectItem>
      <SelectItem value="6">6 tiếng</SelectItem>
      <SelectItem value="8">8 tiếng (mặc định)</SelectItem>
      <SelectItem value="10">10 tiếng</SelectItem>
      <SelectItem value="12">12 tiếng</SelectItem>
    </SelectContent>
  </Select>
</div>
```

#### 4.1.3 UI trong ca làm việc

Hiển thị progress bar:

```tsx
<div className="space-y-2">
  <div className="flex justify-between text-sm">
    <span>Thời gian làm việc:</span>
    <span className="font-semibold">
      {hoursWorked.toFixed(1)}/{expectedHours} tiếng
    </span>
  </div>
  <Progress 
    value={(hoursWorked / expectedHours) * 100} 
    className={cn(
      hoursWorked >= expectedHours ? "bg-green-500" :
      hoursWorked >= expectedHours * 0.9 ? "bg-yellow-500" :
      "bg-blue-500"
    )}
  />
</div>
```

#### 4.1.4 Logic khi đóng ca

```typescript
const handleCloseShiftClick = () => {
  const actualHours = hoursWorked;
  const difference = actualHours - expectedHours;
  
  // Nếu đóng sớm > 30 phút
  if (difference < -0.5) {
    setShowEarlyCloseDialog(true);
  } else {
    // Đóng ca bình thường
    setIsCloseShiftDialogOpen(true);
  }
};
```

#### 4.1.5 Dialog đóng ca sớm

```tsx
<Dialog open={showEarlyCloseDialog} onOpenChange={setShowEarlyCloseDialog}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>⚠️ Đóng ca sớm hơn dự kiến</DialogTitle>
      <DialogDescription>
        Bạn đang đóng ca sớm hơn {Math.abs(difference * 60).toFixed(0)} phút so với dự kiến.
      </DialogDescription>
    </DialogHeader>
    
    <div className="space-y-4 py-4">
      <div className="p-4 bg-yellow-50 rounded-lg">
        <p className="text-sm">
          • Thời gian dự kiến: {expectedHours} giờ<br/>
          • Thời gian thực tế: {actualHours.toFixed(1)} giờ<br/>
          • Chênh lệch: {Math.abs(difference).toFixed(1)} giờ
        </p>
      </div>
      
      <div className="space-y-2">
        <Label>Lý do đóng ca sớm (tùy chọn)</Label>
        <Textarea
          value={earlyCloseReason}
          onChange={(e) => setEarlyCloseReason(e.target.value)}
          placeholder="Ví dụ: Hoàn thành công việc sớm..."
          maxLength={500}
        />
        <p className="text-xs text-muted-foreground">
          {earlyCloseReason.length}/500 ký tự
        </p>
      </div>
      
      <div className="p-3 bg-blue-50 rounded">
        <p className="text-sm text-blue-700">
          ℹ️ Quản lý sẽ nhận được thông báo về việc đóng ca sớm này.
        </p>
      </div>
    </div>
    
    <DialogFooter>
      <Button variant="outline" onClick={() => setShowEarlyCloseDialog(false)}>
        Hủy
      </Button>
      <Button onClick={handleConfirmEarlyClose}>
        Xác nhận đóng ca
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### 4.2 Component: Notifications (Mới - cho quản lý)

Tạo component hiển thị thông báo đóng ca sớm:

```tsx
// src/components/early-close-notification.tsx
export function EarlyCloseNotification({ notification }) {
  return (
    <div className="p-4 border rounded-lg">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-orange-100 rounded">
          🔔
        </div>
        <div className="flex-1">
          <h4 className="font-semibold">Nhân viên đóng ca sớm</h4>
          <p className="text-sm text-muted-foreground mt-1">
            {notification.message}
          </p>
          <div className="flex gap-2 mt-3">
            <Button size="sm" variant="outline">
              Xem chi tiết ca
            </Button>
            <Button size="sm">
              Đánh dấu đã đọc
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

## 5. Helper Functions

### 5.1 Backend: createEarlyCloseNotification

```typescript
async function createEarlyCloseNotification(params: {
  shiftId: string;
  employeeName: string;
  storeId: string;
  expectedHours: number;
  actualHours: number;
  difference: number;
  reason?: string;
}) {
  const { shiftId, employeeName, storeId, expectedHours, actualHours, difference, reason } = params;
  
  // 1. Tìm quản lý của cửa hàng
  const managers = await query(
    `SELECT u.id 
     FROM Users u
     INNER JOIN TenantUsers tu ON u.Id = tu.UserId
     WHERE tu.StoreId = @storeId
       AND u.role IN ('owner', 'company_manager', 'store_manager')
       AND u.status = 'active'`,
    { storeId }
  );
  
  // 2. Tạo message
  const differenceMinutes = Math.round(difference * 60);
  const message = `${employeeName} đã đóng ca sớm. Dự kiến: ${expectedHours} giờ, Thực tế: ${actualHours.toFixed(1)} giờ, Chênh lệch: ${differenceMinutes} phút.${reason ? ` Lý do: ${reason}` : ''}`;
  
  // 3. Tạo notification cho từng quản lý
  for (const manager of managers) {
    await query(
      `INSERT INTO Notifications (id, user_id, type, title, message, related_id, priority, created_at, is_read)
       VALUES (@id, @userId, @type, @title, @message, @relatedId, @priority, GETDATE(), 0)`,
      {
        id: crypto.randomUUID(),
        userId: manager.id,
        type: 'early_shift_close',
        title: 'Nhân viên đóng ca sớm',
        message,
        relatedId: shiftId,
        priority: difference > 2 ? 'high' : 'medium', // Nếu đóng sớm > 2 tiếng → ưu tiên cao
      }
    );
  }
}
```

### 5.2 Frontend: calculateTimeDifference

```typescript
function calculateTimeDifference(
  startTime: string,
  endTime: string,
  expectedHours: number
): {
  actualHours: number;
  difference: number;
  isEarlyClose: boolean;
  differenceMinutes: number;
} {
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();
  const actualHours = (end - start) / (1000 * 60 * 60);
  const difference = actualHours - expectedHours;
  const isEarlyClose = difference < -0.5; // Đóng sớm > 30 phút
  const differenceMinutes = Math.abs(Math.round(difference * 60));
  
  return {
    actualHours,
    difference,
    isEarlyClose,
    differenceMinutes,
  };
}
```

## 6. Edge Cases Handling

### 6.1 Không có thời gian dự kiến (ca cũ)

```typescript
// Backend: Khi đóng ca
const expectedHours = shift.ExpectedHours || 8.0; // Mặc định 8 giờ
```

### 6.2 Đóng ca quá sớm (< 1 tiếng)

```typescript
// Frontend: Hiển thị cảnh báo đặc biệt
if (actualHours < 1) {
  toast({
    title: '⚠️ Cảnh báo',
    description: 'Bạn đang đóng ca sau chưa đầy 1 tiếng làm việc. Vui lòng nhập lý do.',
    variant: 'destructive'
  });
  // Yêu cầu lý do bắt buộc
  setReasonRequired(true);
}
```

### 6.3 Không có quản lý cửa hàng

```typescript
// Backend: Fallback hierarchy
// 1. Store Manager của cửa hàng
// 2. Company Manager
// 3. Owner
const managers = await query(
  `SELECT u.id, u.role
   FROM Users u
   WHERE u.role IN ('owner', 'company_manager', 'store_manager')
     AND u.status = 'active'
   ORDER BY 
     CASE u.role
       WHEN 'store_manager' THEN 1
       WHEN 'company_manager' THEN 2
       WHEN 'owner' THEN 3
     END`,
  {}
);
```

### 6.4 Nhân viên đóng ca đúng giờ hoặc muộn

```typescript
// Không hiển thị dialog, không gửi notification
if (difference >= -0.5) {
  // Đóng ca bình thường
  await closeShift({ endingCash });
}
```

## 7. Testing Strategy

### 7.1 Unit Tests

```typescript
describe('Early Close Detection', () => {
  it('should detect early close when difference > 30 minutes', () => {
    const result = calculateTimeDifference(
      '2024-01-15T08:00:00Z',
      '2024-01-15T11:00:00Z', // 3 giờ
      4 // Dự kiến 4 giờ
    );
    expect(result.isEarlyClose).toBe(true);
    expect(result.differenceMinutes).toBe(60);
  });
  
  it('should not detect early close when difference < 30 minutes', () => {
    const result = calculateTimeDifference(
      '2024-01-15T08:00:00Z',
      '2024-01-15T11:45:00Z', // 3.75 giờ
      4 // Dự kiến 4 giờ
    );
    expect(result.isEarlyClose).toBe(false);
  });
});
```

### 7.2 Integration Tests

```typescript
describe('POST /api/shifts/:id/close', () => {
  it('should create notification when closing early', async () => {
    // 1. Tạo shift với expectedHours = 4
    const shift = await createShift({ expectedHours: 4 });
    
    // 2. Đóng ca sau 3 giờ
    await closeShift(shift.id, { endingCash: 1000000 });
    
    // 3. Kiểm tra notification được tạo
    const notifications = await getNotifications({ type: 'early_shift_close' });
    expect(notifications.length).toBeGreaterThan(0);
  });
});
```

### 7.3 E2E Tests

```typescript
describe('Early Close Flow', () => {
  it('should show dialog when closing early', async () => {
    // 1. Mở ca với expectedHours = 4
    await openShift({ expectedHours: 4 });
    
    // 2. Mock thời gian đã làm 3 giờ
    mockHoursWorked(3);
    
    // 3. Click đóng ca
    await clickCloseShift();
    
    // 4. Kiểm tra dialog xuất hiện
    expect(screen.getByText(/đóng ca sớm/i)).toBeInTheDocument();
  });
});
```

## 8. Performance Considerations

### 8.1 Database Indexing

```sql
-- Index cho query tìm managers
CREATE INDEX IX_Users_Role_Status ON Users(role, status);

-- Index cho query early close reports
CREATE INDEX IX_Shifts_ExpectedHours_EndTime ON Shifts(ExpectedHours, end_time);
```

### 8.2 Caching

- Cache danh sách managers của mỗi cửa hàng (TTL: 1 giờ)
- Invalidate cache khi có thay đổi role/status

## 9. Security Considerations

### 9.1 Authorization

- Chỉ nhân viên sở hữu shift mới được đóng ca
- Chỉ quản lý mới được xem báo cáo đóng ca sớm
- Validate `expectedHours` phải nằm trong danh sách cho phép

### 9.2 Input Validation

```typescript
// Backend validation
const ALLOWED_EXPECTED_HOURS = [2, 4, 6, 8, 10, 12];

if (expectedHours && !ALLOWED_EXPECTED_HOURS.includes(expectedHours)) {
  throw new Error('Invalid expected hours');
}

if (earlyCloseReason && earlyCloseReason.length > 500) {
  throw new Error('Reason too long');
}
```

## 10. Monitoring & Logging

### 10.1 Metrics to Track

- Số lượng đóng ca sớm / tổng số ca
- Thời gian chênh lệch trung bình
- Tỷ lệ nhân viên nhập lý do
- Thời gian phản hồi của quản lý

### 10.2 Audit Logs

Mọi đóng ca sớm đều được log vào AuditLogs:

```typescript
{
  action: 'early_shift_close',
  entityType: 'shift',
  entityId: shiftId,
  details: {
    expectedHours: 4,
    actualHours: 3.2,
    difference: -0.8,
    reason: 'Hoàn thành công việc sớm'
  }
}
```

## 11. Rollout Plan

### Phase 1: Database Migration
- Chạy migration thêm cột ExpectedHours và EarlyCloseReason
- Cập nhật tất cả ca cũ với ExpectedHours = 8.0

### Phase 2: Backend Implementation
- Implement API changes
- Implement notification logic
- Deploy và test

### Phase 3: Frontend Implementation
- Implement UI changes
- Implement dialog logic
- Deploy và test

### Phase 4: Monitoring
- Theo dõi metrics
- Thu thập feedback từ người dùng
- Điều chỉnh nếu cần

## 12. Future Enhancements (Out of Scope)

- Tự động phê duyệt/từ chối đóng ca sớm
- Tính lương theo thời gian thực tế (hiện tại vẫn tính theo giờ làm việc)
- Dashboard thống kê chi tiết về đóng ca sớm
- Cảnh báo trước khi đóng ca sớm (hiện tại chỉ thông báo sau khi đóng)
- Push notification real-time cho quản lý
