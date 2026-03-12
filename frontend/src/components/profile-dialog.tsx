'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useStore } from '@/contexts/store-context'
import { useToast } from '@/hooks/use-toast'
import { apiClient } from '@/lib/api-client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Upload, User, Building2 } from 'lucide-react'

const profileSchema = z.object({
  displayName: z.string().min(1, 'Tên hiển thị không được để trống'),
  email: z.string().email('Email không hợp lệ'),
  phone: z.string().optional(),
  address: z.string().optional(),
  tenantName: z.string().min(1, 'Tên doanh nghiệp không được để trống'),
})

type ProfileFormData = z.infer<typeof profileSchema>

interface ProfileDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ProfileDialog({ open, onOpenChange }: ProfileDialogProps) {
  const { user, tenant, refreshStores } = useStore()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: user?.displayName || '',
      email: user?.email || '',
      phone: '',
      address: '',
      tenantName: tenant?.name || '',
    },
  })

  // Reset form when dialog opens
  React.useEffect(() => {
    if (open && user && tenant) {
      form.reset({
        displayName: user.displayName || '',
        email: user.email || '',
        phone: '',
        address: '',
        tenantName: tenant.name || '',
      })
      setAvatarPreview(null)
    }
  }, [open, user, tenant, form])

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const onSubmit = async (data: ProfileFormData) => {
    if (!user) return

    setIsLoading(true)
    try {
      // Update user profile
      await apiClient.updateUser(user.id, {
        displayName: data.displayName,
        email: data.email,
        phone: data.phone,
        address: data.address,
      })

      // If tenant name changed, we might need a separate API call
      // For now, we'll just show success for user update
      
      toast({
        title: 'Thành công',
        description: 'Cập nhật hồ sơ thành công',
      })

      // Refresh user data
      await refreshStores()
      onOpenChange(false)
    } catch (error) {
      console.error('Error updating profile:', error)
      toast({
        title: 'Lỗi',
        description: 'Không thể cập nhật hồ sơ. Vui lòng thử lại.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Chỉnh sửa hồ sơ
          </DialogTitle>
          <DialogDescription>
            Cập nhật thông tin cá nhân và doanh nghiệp của bạn
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Avatar Section */}
            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                <Avatar className="h-20 w-20">
                  <AvatarImage 
                    src={avatarPreview || user?.photoURL || "https://i.pravatar.cc/150?u=a042581f4e29026704d"} 
                    alt="Avatar" 
                  />
                  <AvatarFallback className="text-lg">
                    {user?.displayName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <label 
                  htmlFor="avatar-upload" 
                  className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full p-1.5 cursor-pointer hover:bg-primary/90 transition-colors"
                >
                  <Upload className="h-3 w-3" />
                </label>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Nhấn vào biểu tượng để thay đổi ảnh đại diện
              </p>
            </div>

            {/* Personal Information */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <User className="h-4 w-4" />
                Thông tin cá nhân
              </div>
              
              <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tên hiển thị</FormLabel>
                    <FormControl>
                      <Input placeholder="Nhập tên hiển thị" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="Nhập email" type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Số điện thoại</FormLabel>
                    <FormControl>
                      <Input placeholder="Nhập số điện thoại" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Địa chỉ</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Nhập địa chỉ" 
                        className="resize-none" 
                        rows={2}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Business Information */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Building2 className="h-4 w-4" />
                Thông tin doanh nghiệp
              </div>
              
              <FormField
                control={form.control}
                name="tenantName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tên doanh nghiệp</FormLabel>
                    <FormControl>
                      <Input placeholder="Nhập tên doanh nghiệp" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Hủy
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Đang cập nhật...' : 'Cập nhật'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}