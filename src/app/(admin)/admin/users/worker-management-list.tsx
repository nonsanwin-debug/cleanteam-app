'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { updateWorkerRole } from '@/actions/admin'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { User, ArrowUp, ArrowDown, Loader2 } from 'lucide-react'

interface Worker {
    id: string
    name: string
    phone: string
    email?: string
    worker_type: 'leader' | 'member'
    current_money: number
    account_info?: string
    created_at: string
}

export function WorkerManagementList({ workers }: { workers: Worker[] }) {
    const router = useRouter()
    const [processingId, setProcessingId] = useState<string | null>(null)

    async function handleRoleChange(workerId: string, currentRole: 'leader' | 'member') {
        const newRole = currentRole === 'leader' ? 'member' : 'leader'
        const action = newRole === 'leader' ? '팀장으로 승격' : '팀원으로 강등'

        if (!confirm(`${action}하시겠습니까?`)) return

        setProcessingId(workerId)
        try {
            const result = await updateWorkerRole(workerId, newRole)
            if (result.success) {
                toast.success(`${action}되었습니다.`)
                router.refresh()
            } else {
                toast.error(result.error)
            }
        } catch (e) {
            toast.error('오류가 발생했습니다.')
        } finally {
            setProcessingId(null)
        }
    }

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {workers.map(worker => (
                <Card key={worker.id}>
                    <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-slate-100 border rounded-full flex items-center justify-center">
                                    <User className="text-slate-400 w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg">{worker.name}</h3>
                                    <p className="text-sm text-slate-500">{worker.phone}</p>
                                </div>
                            </div>
                            <Badge variant={worker.worker_type === 'leader' ? 'default' : 'secondary'}>
                                {worker.worker_type === 'leader' ? '팀장' : '팀원'}
                            </Badge>
                        </div>

                        <div className="space-y-2 text-sm mb-4">
                            <div>
                                <span className="text-slate-500">잔액: </span>
                                <span className="font-semibold text-green-600">
                                    ₩ {worker.current_money?.toLocaleString() || 0}
                                </span>
                            </div>
                            <div>
                                <span className="text-slate-500">계좌: </span>
                                <span>{worker.account_info || '미등록'}</span>
                            </div>
                            <div>
                                <span className="text-slate-500">가입일: </span>
                                <span>{new Date(worker.created_at).toLocaleDateString()}</span>
                            </div>
                        </div>

                        <Button
                            size="sm"
                            variant={worker.worker_type === 'leader' ? 'outline' : 'default'}
                            className="w-full"
                            onClick={() => handleRoleChange(worker.id, worker.worker_type)}
                            disabled={!!processingId}
                        >
                            {processingId === worker.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <>
                                    {worker.worker_type === 'leader' ? (
                                        <>
                                            <ArrowDown className="w-4 h-4 mr-1" />
                                            팀원으로 강등
                                        </>
                                    ) : (
                                        <>
                                            <ArrowUp className="w-4 h-4 mr-1" />
                                            팀장으로 승격
                                        </>
                                    )}
                                </>
                            )}
                        </Button>
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}
