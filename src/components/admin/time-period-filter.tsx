'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Sun, Moon } from 'lucide-react'

const PERIODS = [
    { value: '', label: '전체', icon: null },
    { value: 'am', label: '오전 작업', icon: Sun },
    { value: 'pm', label: '오후 작업', icon: Moon },
] as const

export function TimePeriodFilter() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const selectedPeriod = searchParams.get('period') || ''

    const handlePeriodChange = (period: string) => {
        const params = new URLSearchParams(searchParams.toString())
        if (period) {
            params.set('period', period)
        } else {
            params.delete('period')
        }
        const query = params.toString()
        router.push(`/admin/sites${query ? `?${query}` : ''}`)
    }

    return (
        <div className="flex items-center gap-1.5">
            {PERIODS.map(({ value, label, icon: Icon }) => (
                <Button
                    key={value}
                    variant={selectedPeriod === value ? 'default' : 'outline'}
                    size="sm"
                    className={`h-8 text-xs gap-1.5 ${selectedPeriod === value
                            ? value === 'am'
                                ? 'bg-amber-500 hover:bg-amber-600 border-amber-500'
                                : value === 'pm'
                                    ? 'bg-indigo-500 hover:bg-indigo-600 border-indigo-500'
                                    : ''
                            : ''
                        }`}
                    onClick={() => handlePeriodChange(value)}
                >
                    {Icon && <Icon className="h-3.5 w-3.5" />}
                    {label}
                </Button>
            ))}
        </div>
    )
}
