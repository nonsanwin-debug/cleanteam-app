'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'

export function AdminSiteDateFilter() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const date = searchParams.get('date') || ''

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newDate = e.target.value
        if (newDate) {
            router.push(`/admin/sites?date=${newDate}`)
        } else {
            router.push('/admin/sites')
        }
    }

    const clearFilter = () => {
        router.push('/admin/sites')
    }

    return (
        <div className="flex items-center gap-2 bg-white p-2 rounded-lg border shadow-sm">
            <span className="text-sm font-medium text-slate-600 whitespace-nowrap pl-2">날짜별 보기:</span>
            <Input
                type="date"
                className="w-auto h-8 text-sm"
                value={date}
                onChange={handleDateChange}
            />
            {date && (
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={clearFilter} title="필터 초기화">
                    <X className="h-4 w-4" />
                </Button>
            )}
        </div>
    )
}
