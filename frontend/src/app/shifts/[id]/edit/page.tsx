'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EditShiftForm } from './components/edit-shift-form'
import { getShift } from '../../actions'
import type { Shift } from '@/lib/repositories/shift-repository'

export default function EditShiftPage() {
  const params = useParams();
  const shiftId = params.id as string;
  
  const [shift, setShift] = useState<Shift | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchShift() {
      setIsLoading(true);
      setError(null);

      try {
        const result = await getShift(shiftId);
        if (!result.success || !result.shift) {
          setError(result.error || 'Không tìm thấy ca làm việc');
          return;
        }
        setShift(result.shift as unknown as Shift);
      } catch (err) {
        setError('Đã xảy ra lỗi khi tải dữ liệu');
      } finally {
        setIsLoading(false);
      }
    }

    fetchShift();
  }, [shiftId]);

  if (isLoading) {
    return <p>Đang tải...</p>;
  }

  if (error || !shift) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Lỗi</CardTitle>
          <CardDescription>{error || 'Không tìm thấy ca làm việc'}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild><Link href="/shifts">Quay lại</Link></Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" className="h-7 w-7" asChild>
          <Link href={`/shifts/${shift.id}`}>
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Quay lại</span>
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">Chỉnh sửa Ca làm việc</h1>
          <p className="text-sm text-muted-foreground">
            Điều chỉnh lại số tiền đầu ca và cuối ca cho ca của {shift.userName}.
          </p>
        </div>
      </div>

      <EditShiftForm shift={shift} />
    </div>
  );
}
