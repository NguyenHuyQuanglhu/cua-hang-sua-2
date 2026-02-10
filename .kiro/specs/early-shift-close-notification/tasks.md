# Tasks: Thông báo đóng ca sớm

## Phase 1: Database Migration

- [ ] 1. Tạo migration SQL
  - [ ] 1.1 Thêm cột ExpectedHours vào bảng Shifts
  - [ ] 1.2 Thêm cột EarlyCloseReason vào bảng Shifts
  - [ ] 1.3 Cập nhật tất cả ca cũ với ExpectedHours = 8.0
  - [ ] 1.4 Tạo indexes cho performance

- [ ] 2. Chạy migration
  - [ ] 2.1 Test migration trên local database
  - [ ] 2.2 Chạy migration trên production database
  - [ ] 2.3 Verify dữ liệu sau migration

## Phase 2: Backend Implementation

- [ ] 3. Cập nhật API POST /api/shifts/start
  - [ ] 3.1 Thêm tham số expectedHours vào request body
  - [ ] 3.2 Validate expectedHours (phải nằm trong [2, 4, 6, 8, 10, 12])
  - [ ] 3.3 Lưu expectedHours vào database
  - [ ] 3.4 Viết unit tests cho validation

- [ ] 4. Cập nhật API POST /api/shifts/:id/close
  - [ ] 4.1 Thêm tham số earlyCloseReason vào request body
  - [ ] 4.2 Implement logic tính toán chênh lệch thời gian
  - [ ] 4.3 Implement logic kiểm tra đóng ca sớm (> 30 phút)
  - [ ] 4.4 Lưu earlyCloseReason vào database
  - [ ] 4.5 Viết unit tests cho logic tính toán

- [ ] 5. Implement notification logic
  - [ ] 5.1 Tạo helper function createEarlyCloseNotification
  - [ ] 5.2 Tìm danh sách quản lý của cửa hàng
  - [ ] 5.3 Tạo notification cho từng quản lý
  - [ ] 5.4 Set priority dựa trên mức độ chênh lệch
  - [ ] 5.5 Viết unit tests cho notification logic

- [ ] 6. Implement audit logging
  - [ ] 6.1 Log mọi đóng ca sớm vào AuditLogs
  - [ ] 6.2 Include chi tiết: expectedHours, actualHours, difference, reason
  - [ ] 6.3 Viết unit tests cho audit logging

- [ ] 7. Implement API GET /api/shifts/early-close-reports
  - [ ] 7.1 Tạo endpoint mới
  - [ ] 7.2 Implement query với filters (startDate, endDate, userId)
  - [ ] 7.3 Implement authorization (chỉ quản lý)
  - [ ] 7.4 Tính toán summary statistics
  - [ ] 7.5 Viết unit tests cho endpoint

- [ ] 8. Integration tests cho backend
  - [ ] 8.1 Test flow: Mở ca → Đóng ca sớm → Notification được tạo
  - [ ] 8.2 Test edge case: Không có quản lý
  - [ ] 8.3 Test edge case: Đóng ca đúng giờ (không tạo notification)
  - [ ] 8.4 Test edge case: Ca cũ không có expectedHours

## Phase 3: Frontend Implementation

- [ ] 9. Cập nhật component shift-controls.tsx - Mở ca
  - [ ] 9.1 Thêm state expectedHours
  - [ ] 9.2 Thêm UI dropdown chọn thời gian dự kiến
  - [ ] 9.3 Gửi expectedHours khi gọi API start shift
  - [ ] 9.4 Viết unit tests cho component

- [ ] 10. Cập nhật component shift-controls.tsx - Trong ca
  - [ ] 10.1 Lấy expectedHours từ activeShift
  - [ ] 10.2 Hiển thị progress bar (X/Y tiếng)
  - [ ] 10.3 Thay đổi màu sắc dựa trên progress
  - [ ] 10.4 Viết unit tests cho progress calculation

- [ ] 11. Cập nhật component shift-controls.tsx - Đóng ca
  - [ ] 11.1 Thêm state showEarlyCloseDialog
  - [ ] 11.2 Thêm state earlyCloseReason
  - [ ] 11.3 Implement logic kiểm tra đóng ca sớm
  - [ ] 11.4 Hiển thị dialog nếu đóng sớm > 30 phút
  - [ ] 11.5 Viết unit tests cho logic

- [ ] 12. Tạo dialog đóng ca sớm
  - [ ] 12.1 Tạo UI dialog với thông tin chênh lệch
  - [ ] 12.2 Thêm textarea nhập lý do (tùy chọn)
  - [ ] 12.3 Hiển thị thông báo cho nhân viên
  - [ ] 12.4 Implement handleConfirmEarlyClose
  - [ ] 12.5 Viết unit tests cho dialog

- [ ] 13. Xử lý edge case đóng ca quá sớm (< 1 tiếng)
  - [ ] 13.1 Hiển thị cảnh báo đặc biệt
  - [ ] 13.2 Yêu cầu lý do bắt buộc
  - [ ] 13.3 Viết unit tests cho edge case

- [ ] 14. Tạo component hiển thị notification cho quản lý
  - [ ] 14.1 Tạo component EarlyCloseNotification
  - [ ] 14.2 Hiển thị thông tin chi tiết
  - [ ] 14.3 Thêm button "Xem chi tiết ca"
  - [ ] 14.4 Thêm button "Đánh dấu đã đọc"
  - [ ] 14.5 Viết unit tests cho component

- [ ] 15. Tạo trang báo cáo đóng ca sớm (cho quản lý)
  - [ ] 15.1 Tạo page /reports/early-close
  - [ ] 15.2 Implement filters (date range, employee)
  - [ ] 15.3 Hiển thị danh sách đóng ca sớm
  - [ ] 15.4 Hiển thị summary statistics
  - [ ] 15.5 Viết unit tests cho page

- [ ] 16. E2E tests cho frontend
  - [ ] 16.1 Test flow: Mở ca → Chọn thời gian → Đóng ca sớm → Dialog xuất hiện
  - [ ] 16.2 Test: Nhập lý do → Xác nhận → API được gọi
  - [ ] 16.3 Test: Đóng ca đúng giờ → Không có dialog
  - [ ] 16.4 Test: Progress bar hiển thị đúng

## Phase 4: Testing & QA

- [ ] 17. Manual testing
  - [ ] 17.1 Test flow đầy đủ trên local
  - [ ] 17.2 Test các edge cases
  - [ ] 17.3 Test trên nhiều trình duyệt
  - [ ] 17.4 Test responsive design

- [ ] 18. Performance testing
  - [ ] 18.1 Test query performance với nhiều shifts
  - [ ] 18.2 Test notification creation performance
  - [ ] 18.3 Optimize nếu cần

- [ ] 19. Security testing
  - [ ] 19.1 Test authorization cho API endpoints
  - [ ] 19.2 Test input validation
  - [ ] 19.3 Test SQL injection prevention

## Phase 5: Deployment

- [ ] 20. Deployment preparation
  - [ ] 20.1 Review tất cả code changes
  - [ ] 20.2 Chuẩn bị rollback plan
  - [ ] 20.3 Chuẩn bị deployment checklist

- [ ] 21. Deploy backend
  - [ ] 21.1 Deploy migration
  - [ ] 21.2 Deploy backend code
  - [ ] 21.3 Verify backend hoạt động đúng

- [ ] 22. Deploy frontend
  - [ ] 22.1 Build frontend
  - [ ] 22.2 Deploy frontend code
  - [ ] 22.3 Verify frontend hoạt động đúng

- [ ] 23. Post-deployment verification
  - [ ] 23.1 Test flow đầy đủ trên production
  - [ ] 23.2 Monitor logs và errors
  - [ ] 23.3 Monitor performance metrics

## Phase 6: Monitoring & Iteration

- [ ] 24. Setup monitoring
  - [ ] 24.1 Track số lượng đóng ca sớm
  - [ ] 24.2 Track thời gian chênh lệch trung bình
  - [ ] 24.3 Track tỷ lệ nhân viên nhập lý do
  - [ ] 24.4 Track thời gian phản hồi của quản lý

- [ ] 25. Gather feedback
  - [ ] 25.1 Thu thập feedback từ nhân viên
  - [ ] 25.2 Thu thập feedback từ quản lý
  - [ ] 25.3 Phân tích metrics

- [ ] 26. Iterate based on feedback
  - [ ] 26.1 Xác định cải tiến cần thiết
  - [ ] 26.2 Implement cải tiến
  - [ ] 26.3 Deploy và verify

## Notes

- Ưu tiên: Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6
- Mỗi phase phải hoàn thành và test kỹ trước khi chuyển sang phase tiếp theo
- Tất cả tests phải pass trước khi deploy
- Luôn có rollback plan cho mỗi deployment
