'use client'

import { usePermissions } from './use-permissions'

export function useDebtReminderPermission() {
  const { hasPermission } = usePermissions()
  
  const canSendDebtReminder = hasPermission('debt_reminder', 'add')
  
  return {
    canSendDebtReminder,
  }
}
