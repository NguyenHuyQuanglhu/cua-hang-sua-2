'use client'

import { useState, useTransition } from 'react'
import { Upload, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'

export function ImportCustomers() {
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [isPending, startTransition] = useTransition()
  const [isDownloading, setIsDownloading] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0])
    }
  }

  const handleDownloadTemplate = async () => {
    setIsDownloading(true)
    try {
      // Use client-side fetch instead of server action
      const token = localStorage.getItem('auth_token')
      if (!token) {
        throw new Error('Chưa đăng nhập')
      }

      const response = await fetch('/api/proxy/bulk/customers/template', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to download template')
      }

      // Use arrayBuffer instead of blob for better compatibility
      const arrayBuffer = await response.arrayBuffer()
      const blob = new Blob([arrayBuffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      })
      
      // Create download link
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = 'customer-import-template.xlsx'
      document.body.appendChild(link) // Add to DOM for better compatibility
      link.click()
      document.body.removeChild(link) // Clean up
      
      // Clean up
      URL.revokeObjectURL(link.href)
      
      toast({
        title: "Thành công!",
        description: "Đã tải template thành công.",
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: error instanceof Error ? error.message : "Không thể tải template",
      })
    } finally {
      setIsDownloading(false)
    }
  }

  const handleImport = () => {
    if (!file) {
      toast({
        variant: "destructive",
        title: "Chưa chọn file",
        description: "Vui lòng chọn một file Excel để nhập.",
      })
      return
    }

    startTransition(async () => {
      try {
        // Get token and store ID from localStorage
        const token = localStorage.getItem('auth_token')
        const storeId = localStorage.getItem('store_id')

        if (!token) {
          throw new Error('Chưa đăng nhập')
        }

        if (!storeId) {
          throw new Error('Chưa chọn cửa hàng')
        }

        // Create FormData
        const formData = new FormData()
        formData.append('file', file)

        const response = await fetch('/api/proxy/bulk/customers/import', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Store-Id': storeId,
          },
          body: formData,
        })

        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error || 'Failed to import customers')
        }

        if (result.success !== false) {
          toast({
            title: "Thành công!",
            description: `Đã nhập thành công ${result.imported} khách hàng${result.failed ? `, ${result.failed} thất bại` : ''}.`,
          })
          router.refresh()
          setOpen(false)
          setFile(null)
        } else {
          toast({
            variant: "destructive",
            title: "Ôi! Đã có lỗi xảy ra.",
            description: result.error || 'Không thể import khách hàng',
          })
        }
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Ôi! Đã có lỗi xảy ra.",
          description: error instanceof Error ? error.message : 'Không thể import khách hàng',
        })
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { setOpen(isOpen); setFile(null); }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="h-8 gap-1">
          <Upload className="h-3.5 w-3.5" />
          <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
            Nhập file
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nhập khách hàng từ file Excel</DialogTitle>
          <DialogDescription>
            Chọn file Excel (.xlsx) chứa dữ liệu khách hàng để thêm hàng loạt vào hệ thống.
            <Button 
              variant="link" 
              className="p-0 h-auto font-normal text-blue-600"
              onClick={handleDownloadTemplate}
              disabled={isDownloading}
            >
              <Download className="h-3 w-3 mr-1" />
              {isDownloading ? 'Đang tải...' : 'Tải file mẫu'}
            </Button>
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Input
            id="file"
            type="file"
            onChange={handleFileChange}
            accept=".xlsx, .xls"
            disabled={isPending}
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>Hủy</Button>
          <Button onClick={handleImport} disabled={isPending || !file}>
            {isPending ? 'Đang nhập...' : 'Nhập'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
