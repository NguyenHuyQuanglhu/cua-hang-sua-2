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
  tenantName: z.string().optional(),
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
  const [avatarBase64, setAvatarBase64] = useState<string | null>(null)

  // Check if user is owner (has a tenant)
  const isOwner = user?.role === 'owner' || user?.role === 'admin'

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
    if (open && user) {
      form.reset({
        displayName: user.displayName || '',
        email: user.email || '',
        phone: '',
        address: '',
        tenantName: tenant?.name || '',
      })
      setAvatarPreview(null)
      setAvatarBase64(null)
    }
  }, [open, user, tenant, form])

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: 'Lỗi',
        description: 'Ảnh phải nhỏ hơn 2MB.',
        variant: 'destructive',
      })
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result as string
      setAvatarPreview(result)
      setAvatarBase64(result)
    }
    reader.readAsDataURL(file)
  }

  const onSubmit = async (data: ProfileFormData) => {
    if (!user) return

    setIsLoading(true)
    try {
      // Update user profile (including avatar if changed)
      const updatePayload: Record<string, any> = {
        displayName: data.displayName,
        email: data.email,
        phone: data.phone,
        address: data.address,
      }

      // Include avatar if user selected a new one
      if (avatarBase64) {
        updatePayload.photoURL = avatarBase64
      }

      await apiClient.updateUser(user.id, updatePayload)

      // If owner and tenant name changed, update tenant info
      if (isOwner && data.tenantName && tenant) {
        try {
          await apiClient.request('/auth/tenant', {
            method: 'PUT',
            body: { name: data.tenantName },
          })
        } catch {
          // Non-critical — just log, don't fail the whole save
          console.warn('Could not update tenant name')
        }
      }

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
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Chỉnh sửa hồ sơ
          </DialogTitle>
          <DialogDescription>
            Cập nhật thông tin cá nhân của bạn
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 overflow-y-auto flex-1 pr-1">
            {/* Avatar Section */}
            <div className="flex flex-col items-center space-y-3">
              <div className="relative">
                <Avatar className="h-24 w-24">
                  <AvatarImage
                    src={avatarPreview || user?.photoURL || "https://i.pravatar.cc/150?u=a042581f4e29026704d"}
                    alt="Avatar"
                  />
                  <AvatarFallback className="text-xl">
                    {user?.displayName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <label
                  htmlFor="avatar-upload"
                  className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full p-1.5 cursor-pointer hover:bg-primary/90 transition-colors shadow-md"
                >
                  <Upload className="h-3.5 w-3.5" />
                </label>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Nhấn vào biểu tượng để thay đổi ảnh đại diện (tối đa 2MB)
              </p>
            </div>

            {/* Personal Information */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <User className="h-4 w-4" />
                Thông tin cá nhân
              </div>

              <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tên hiển thị <span className="text-destructive">*</span></FormLabel>
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
                    <FormLabel>Email <span className="text-destructive">*</span></FormLabel>
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

            {/* Business Information - only show for owners */}
            {isOwner && tenant && (
              <div className="space-y-3">
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
            )}

            <DialogFooter className="pt-2">
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