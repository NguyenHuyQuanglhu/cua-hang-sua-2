'use client'

import { useState, useEffect } from 'react'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { NotificationList } from './notification-list'
import { apiClient } from '@/lib/api-client'
import { useStore } from '@/contexts/store-context'

export function NotificationBell() {
  const { user, currentStore, isLoading: isStoreLoading } = useStore()
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const canLoadNotifications = Boolean(user && currentStore?.id && !isStoreLoading)

  useEffect(() => {
    if (!canLoadNotifications) {
      setUnreadCount(0)
      return
    }

    void fetchUnreadCount()

    // Poll every 30 seconds
    const interval = setInterval(() => {
      void fetchUnreadCount()
    }, 30000)

    return () => clearInterval(interval)
  }, [canLoadNotifications, currentStore?.id, user?.id])

  const fetchUnreadCount = async () => {
    if (!canLoadNotifications) {
      setUnreadCount(0)
      return
    }

    try {
      const response = await apiClient.getUnreadNotificationCount()
      if (response.success) {
        setUnreadCount(response.count)
      }
    } catch (error) {
      console.error('Failed to fetch unread count:', error)
    }
  }

  const handleNotificationRead = () => {
    if (!canLoadNotifications) {
      return
    }
    void fetchUnreadCount()
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" disabled={!canLoadNotifications}>
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <NotificationList onNotificationRead={handleNotificationRead} />
      </PopoverContent>
    </Popover>
  )
}
