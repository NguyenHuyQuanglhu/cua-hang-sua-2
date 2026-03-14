import type { UserRole } from '@/lib/types'

/**
 * Xác định trang đích sau khi đóng ca dựa trên role của user
 */
export function getPostShiftRedirectPath(userRole: UserRole): string {
  switch (userRole) {
    case 'owner':
    case 'company_manager':
    case 'store_manager':
      // Các role quản lý chuyển về dashboard
      return '/dashboard'
    case 'salesperson':
      // Nhân viên bán hàng chuyển về POS (có thể mở ca mới nếu cần)
      return '/pos'
    default:
      // Mặc định chuyển về POS
      return '/pos'
  }
}

/**
 * Xác định có nên chuyển về dashboard hay không dựa trên role
 */
export function shouldRedirectToDashboard(userRole: UserRole): boolean {
  return ['owner', 'company_manager', 'store_manager'].includes(userRole)
}