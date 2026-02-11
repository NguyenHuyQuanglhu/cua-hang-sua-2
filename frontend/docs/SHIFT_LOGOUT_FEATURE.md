# Tính Năng Đăng Xuất Khi Bắt Đầu Ca

## Vấn Đề

Trước đây, khi nhân viên đóng ca làm việc, hệ thống tự động hiển thị popup "Bắt đầu ca làm việc" mới. Popup này không có nút đóng hoặc thoát, khiến nhân viên không thể đăng xuất tài khoản mà bắt buộc phải bắt đầu ca mới.

## Giải Pháp

### 1. Nút Đăng Xuất
Đã thêm nút "Đăng xuất" vào dialog "Bắt đầu ca làm việc", cho phép nhân viên:
- Bắt đầu ca mới (nếu muốn tiếp tục làm việc)
- Đăng xuất tài khoản (nếu muốn kết thúc làm việc)

### 2. Cảnh Báo Khi Đóng Dialog
Khi người dùng cố gắng đóng dialog bằng cách:
- Bấm nút X ở góc trên bên phải
- Bấm phím ESC
- Click ra ngoài dialog (nếu được phép)

Hệ thống sẽ hiển thị một AlertDialog cảnh báo:
```
⚠️ Không thể đóng

Bạn phải bắt đầu ca làm việc mới có thể sử dụng hệ thống.

Vui lòng chọn một trong hai tùy chọn:
• Bắt đầu ca - Để tiếp tục làm việc
• Đăng xuất - Để kết thúc và cho người khác đăng nhập

[Đã hiểu]
```

## Giao Diện

### Dialog "Bắt đầu ca làm việc"

```
┌─────────────────────────────────────┐
│  Bắt đầu ca làm việc            [X]│
│                                     │
│  Nhập số tiền mặt ban đầu trong    │
│  ngăn kéo để bắt đầu ca mới.       │
│                                     │
│  Tiền đầu ca:  [        0]         │
│                                     │
│  [🚪 Đăng xuất]  [Bắt đầu ca]     │
└─────────────────────────────────────┘
```

### AlertDialog Cảnh Báo

```
┌─────────────────────────────────────┐
│  ⚠️ Không thể đóng                 │
│                                     │
│  Bạn phải bắt đầu ca làm việc mới  │
│  có thể sử dụng hệ thống.          │
│                                     │
│  ┌───────────────────────────────┐ │
│  │ Vui lòng chọn một trong hai:  │ │
│  │ • Bắt đầu ca - Tiếp tục       │ │
│  │ • Đăng xuất - Kết thúc        │ │
│  └───────────────────────────────┘ │
│                                     │
│                      [Đã hiểu]     │
└─────────────────────────────────────┘
```

## Tính Năng

### 1. Nút "Đăng xuất"
- Vị trí: Bên trái nút "Bắt đầu ca"
- Icon: 🚪 (LogOut)
- Màu: Outline (không nổi bật như nút chính)
- Chức năng: Đăng xuất khỏi hệ thống và chuyển về trang login

### 2. Nút "Bắt đầu ca"
- Vị trí: Bên phải (nút chính)
- Màu: Primary (nổi bật)
- Chức năng: Bắt đầu ca làm việc mới với số tiền đầu ca đã nhập

### 3. Nút X (Đóng Dialog)
- Vị trí: Góc trên bên phải
- Chức năng: Hiển thị cảnh báo khi người dùng cố đóng
- Không thực sự đóng dialog, chỉ hiện thông báo

### 4. AlertDialog Cảnh Báo
- Icon: ⚠️ (AlertCircle) màu cam
- Tiêu đề: "Không thể đóng"
- Nội dung: Giải thích tại sao không thể đóng và hướng dẫn
- Nút: "Đã hiểu" để đóng cảnh báo và quay lại dialog chính

### 5. Trạng Thái Loading
- Khi đang đăng xuất: Nút hiển thị "Đang đăng xuất..." và disable cả 2 nút
- Khi đang bắt đầu ca: Nút hiển thị "Đang bắt đầu..." và disable cả 2 nút

## Luồng Hoạt Động

### Kịch Bản 1: Nhân Viên Muốn Tiếp Tục Làm Việc
1. Nhân viên đóng ca hiện tại
2. Dialog "Bắt đầu ca làm việc" hiện lên
3. Nhân viên nhập số tiền đầu ca
4. Nhấn "Bắt đầu ca"
5. Ca mới được tạo, nhân viên tiếp tục làm việc

### Kịch Bản 2: Nhân Viên Muốn Kết Thúc Làm Việc
1. Nhân viên đóng ca hiện tại
2. Dialog "Bắt đầu ca làm việc" hiện lên
3. Nhân viên nhấn "Đăng xuất"
4. Hệ thống đăng xuất và chuyển về trang login
5. Nhân viên khác có thể đăng nhập

### Kịch Bản 3: Nhân Viên Cố Đóng Dialog
1. Nhân viên đóng ca hiện tại
2. Dialog "Bắt đầu ca làm việc" hiện lên
3. Nhân viên bấm nút X hoặc ESC
4. AlertDialog cảnh báo hiện lên
5. Nhân viên đọc cảnh báo và nhấn "Đã hiểu"
6. Quay lại dialog "Bắt đầu ca làm việc"
7. Nhân viên phải chọn "Bắt đầu ca" hoặc "Đăng xuất"

### Kịch Bản 4: Ca Tự Động Đóng (Hết Thời Gian)
1. Service backend tự động đóng ca khi hết thời gian
2. Lần refresh tiếp theo, dialog "Bắt đầu ca làm việc" hiện lên
3. Nhân viên có thể chọn bắt đầu ca mới hoặc đăng xuất

## Code Changes

### File: `start-shift-dialog.tsx`

**Thêm imports:**
```typescript
import { useRouter } from 'next/navigation'
import { useStore } from '@/contexts/store-context'
import { LogOut, AlertCircle } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
```

**Thêm states:**
```typescript
const [isLoggingOut, setIsLoggingOut] = useState(false)
const [showCloseWarning, setShowCloseWarning] = useState(false)
const router = useRouter()
const { logout } = useStore()
```

**Thêm handlers:**
```typescript
const handleLogout = async () => {
  setIsLoggingOut(true)
  try {
    await logout()
    toast({
      title: 'Đã đăng xuất',
      description: 'Bạn đã đăng xuất thành công.',
    })
    router.push('/login')
  } catch (error) {
    toast({
      variant: 'destructive',
      title: 'Lỗi đăng xuất',
      description: 'Không thể đăng xuất. Vui lòng thử lại.',
    })
  } finally {
    setIsLoggingOut(false)
  }
}

const handleCloseAttempt = () => {
  setShowCloseWarning(true)
}
```

**Cập nhật Dialog:**
```typescript
<Dialog open={true} onOpenChange={(open) => !open && handleCloseAttempt()}>
  {/* Dialog content */}
</Dialog>
```

**Thêm AlertDialog:**
```typescript
<AlertDialog open={showCloseWarning} onOpenChange={setShowCloseWarning}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle className="flex items-center gap-2">
        <AlertCircle className="h-5 w-5 text-orange-500" />
        Không thể đóng
      </AlertDialogTitle>
      <AlertDialogDescription className="space-y-3">
        <p className="text-base font-medium text-foreground">
          Bạn phải bắt đầu ca làm việc mới có thể sử dụng hệ thống.
        </p>
        <div className="bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-md p-4">
          <p className="text-sm text-orange-900 dark:text-orange-100">
            Vui lòng chọn một trong hai tùy chọn:
          </p>
          <ul className="list-disc list-inside text-sm text-orange-800 dark:text-orange-200 mt-2 space-y-1">
            <li><strong>Bắt đầu ca</strong> - Để tiếp tục làm việc</li>
            <li><strong>Đăng xuất</strong> - Để kết thúc và cho người khác đăng nhập</li>
          </ul>
        </div>
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogAction onClick={() => setShowCloseWarning(false)}>
        Đã hiểu
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

## Responsive Design

### Desktop (sm và lớn hơn)
- 2 nút nằm ngang cạnh nhau
- Nút "Đăng xuất" bên trái, nút "Bắt đầu ca" bên phải
- Mỗi nút có width tự động (auto)

### Mobile (nhỏ hơn sm)
- 2 nút xếp dọc
- Nút "Đăng xuất" ở trên, nút "Bắt đầu ca" ở dưới
- Mỗi nút chiếm full width

## Testing

### Test Case 1: Đăng Xuất Thành Công
1. Đóng ca làm việc
2. Dialog hiện lên
3. Nhấn "Đăng xuất"
4. Kiểm tra: Chuyển về trang /login
5. Kiểm tra: Toast hiển thị "Đã đăng xuất"

### Test Case 2: Đăng Xuất Thất Bại
1. Đóng ca làm việc
2. Dialog hiện lên
3. Ngắt kết nối mạng
4. Nhấn "Đăng xuất"
5. Kiểm tra: Toast hiển thị lỗi
6. Kiểm tra: Vẫn ở trang hiện tại

### Test Case 3: Bắt Đầu Ca Mới
1. Đóng ca làm việc
2. Dialog hiện lên
3. Nhập số tiền đầu ca
4. Nhấn "Bắt đầu ca"
5. Kiểm tra: Ca mới được tạo
6. Kiểm tra: Dialog đóng lại

### Test Case 4: Cố Đóng Dialog Bằng Nút X
1. Dialog hiện lên
2. Nhấn nút X ở góc trên
3. Kiểm tra: AlertDialog cảnh báo hiện lên
4. Kiểm tra: Dialog chính vẫn mở
5. Nhấn "Đã hiểu"
6. Kiểm tra: AlertDialog đóng, quay lại dialog chính

### Test Case 5: Cố Đóng Dialog Bằng ESC
1. Dialog hiện lên
2. Nhấn phím ESC
3. Kiểm tra: AlertDialog cảnh báo hiện lên
4. Nhấn "Đã hiểu"
5. Kiểm tra: Quay lại dialog chính

### Test Case 6: Disable Buttons
1. Dialog hiện lên
2. Nhấn "Đăng xuất"
3. Kiểm tra: Cả 2 nút đều disabled
4. Kiểm tra: Nút "Đăng xuất" hiển thị "Đang đăng xuất..."

## Lưu Ý

1. **Dialog không thể đóng hoàn toàn**: Đây là thiết kế có chủ đích để đảm bảo nhân viên phải chọn một trong hai hành động
2. **Cảnh báo thân thiện**: Sử dụng màu cam (warning) thay vì đỏ (error) để không gây căng thẳng
3. **Hướng dẫn rõ ràng**: AlertDialog giải thích tại sao không thể đóng và hướng dẫn cụ thể
4. **Logout sử dụng context**: Sử dụng `useStore().logout()` để đảm bảo state được clear đúng cách
5. **Toast notifications**: Hiển thị thông báo cho cả thành công và thất bại
6. **onOpenChange handler**: Bắt sự kiện khi dialog cố đóng và hiển thị cảnh báo

## UI/UX Improvements

### Màu Sắc
- **Orange (Cam)**: Sử dụng cho cảnh báo, không quá nghiêm trọng nhưng vẫn thu hút sự chú ý
- **Icon AlertCircle**: Biểu tượng cảnh báo dễ nhận biết

### Nội Dung
- **Tiêu đề ngắn gọn**: "Không thể đóng"
- **Giải thích rõ ràng**: "Bạn phải bắt đầu ca làm việc mới có thể sử dụng hệ thống"
- **Hướng dẫn cụ thể**: Liệt kê 2 tùy chọn với mô tả ngắn

### Tương Tác
- **Nút "Đã hiểu"**: Thay vì "OK" hoặc "Đóng", sử dụng "Đã hiểu" để xác nhận người dùng đã đọc
- **Không có nút "Hủy"**: Vì không có gì để hủy, chỉ cần đóng cảnh báo

## Tương Lai

Có thể cân nhắc thêm:
- Thêm checkbox "Không hiển thị lại" (nhưng cần cân nhắc kỹ về UX)
- Hiển thị số lần người dùng đã cố đóng dialog
- Thêm animation khi AlertDialog xuất hiện
- Thêm sound effect nhẹ khi cảnh báo hiện lên (tùy chọn)
