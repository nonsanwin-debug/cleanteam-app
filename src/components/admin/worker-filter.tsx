'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'

interface Worker {
    id: string
    name: string
    display_color?: string | null
    worker_type?: 'leader' | 'member'
}

export function AdminWorkerFilter({ workers }: { workers: Worker[] }) {
    const leaders = workers.filter(w => w.worker_type === 'leader')
    const router = useRouter()
    const searchParams = useSearchParams()
    const selectedWorkerId = searchParams.get('worker') || ''

    const handleWorkerChange = (workerId: string) => {
        const params = new URLSearchParams(searchParams.toString())
        if (workerId) {
            params.set('worker', workerId)
        } else {
            params.delete('worker')
        }
        const query = params.toString()
        router.push(`/admin/sites${query ? `?${query}` : ''}`)
    }

    const selectedWorker = leaders.find(w => w.id === selectedWorkerId)

    return (
        <div className="flex items-center gap-1.5 flex-wrap">
            <Button
                variant={!selectedWorkerId ? 'default' : 'outline'}
                size="sm"
                className="h-8 text-xs"
                onClick={() => handleWorkerChange('')}
            >
                전체
            </Button>
            {leaders.map(worker => (
                <Button
                    key={worker.id}
                    variant={selectedWorkerId === worker.id ? 'default' : 'outline'}
                    size="sm"
                    className="h-8 text-xs gap-1.5"
                    onClick={() => handleWorkerChange(worker.id)}
                    style={
                        selectedWorkerId === worker.id
                            ? { backgroundColor: worker.display_color || undefined, borderColor: worker.display_color || undefined }
                            : { color: worker.display_color || undefined, borderColor: worker.display_color ? `${worker.display_color}40` : undefined }
                    }
                >
                    {worker.display_color && (
                        <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: selectedWorkerId === worker.id ? 'white' : worker.display_color }}
                        />
                    )}
                    {worker.name}
                </Button>
            ))}
        </div>
    )
}
