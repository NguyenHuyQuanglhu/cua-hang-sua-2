'use client'

import { PanelLeft, Search } from 'lucide-react'
import { usePathname } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { useStore } from '@/contexts/store-context'
import { UserNav } from './user-nav'
import { CommandMenu } from './command-menu'
import { StoreSelectorCompact } from './store-selector'
import { NotificationBell } from './notification-bell'

export function Header() {
  const pathname = usePathname()
  const { user, isLoading: isUserLoading } = useStore()

  // Early returns after all hooks are called
  if (pathname.startsWith('/login') || pathname.startsWith('/register')) {
    return null;
  }
  
  if (isUserLoading || !user) {
    return (
       <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6" />
    )
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-card px-4 shadow-sm sm:rounded-lg">
      <div className="flex items-center gap-4">
        <SidebarTrigger className="hidden sm:flex">
            <PanelLeft />
        </SidebarTrigger>
         <SidebarTrigger className="sm:hidden">
          <PanelLeft />
        </SidebarTrigger>
      </div>
      <div className="hidden sm:block">
        <StoreSelectorCompact />
      </div>
      <div className="flex-1">
        <CommandMenu />
      </div>
      <div className="flex items-center gap-2">
        <NotificationBell />
        <UserNav />
      </div>
    </header>
  )
}
