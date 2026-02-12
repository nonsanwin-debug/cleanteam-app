'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { updateWorkerRole, approveWorker, updateWorkerColor } from '@/actions/admin'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { User, ArrowUp, ArrowDown, Loader2, Eye, EyeOff, UserCheck, Palette, X } from 'lucide-react'

const COLOR_PRESETS = [
    { name: '빨강', value: '#DC2626' },
    { name: '주황', value: '#EA580C' },
    { name: '노랑', value: '#CA8A04' },
    { name: '초록', value: '#16A34A' },
    { name: '파랑', value: '#2563EB' },
    { name: '남색', value: '#4F46E5' },
    { name: '보라', value: '#9333EA' },
    { name: '핑크', value: '#DB2777' },
    { name: '청록', value: '#0891B2' },
    { name: '갈색', value: '#92400E' },
]

interface Worker {
    id: string
    name: string
    phone: string
    email?: string
    worker_type: 'leader' | 'member'
    current_money: number
    status: 'active' | 'pending'
    account_info?: string
    initial_password?: string
    created_at: string
    display_color?: string | null
}

export function WorkerManagementList({ workers }: { workers: Worker[] }) {
    const router = useRouter()
    const [processingId, setProcessingId] = useState<string | null>(null)
    const [showPasswords, setShowPasswords] = useState<{ [key: string]: boolean }>({})
    const [colorPickerOpen, setColorPickerOpen] = useState<string | null>(null)
    const [colorLoading, setColorLoading] = useState<string | null>(null)

    const togglePassword = (id: string) => {
        setShowPasswords(prev => ({ ...prev, [id]: !prev[id] }))
    }

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

    async function handleApprove(workerId: string) {
        if (!confirm('가입을 승인하시겠습니까?')) return

        setProcessingId(workerId)
        try {
            const result = await approveWorker(workerId)
            if (result.success) {
                toast.success('가입이 승인되었습니다.')
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

    async function handleColorChange(workerId: string, color: string | null) {
        setColorLoading(workerId)
        try {
            const result = await updateWorkerColor(workerId, color)
            if (result.success) {
                toast.success('색상이 변경되었습니다.')
                setColorPickerOpen(null)
                router.refresh()
            } else {
                toast.error(result.error)
            }
        } catch (e) {
            toast.error('색상 변경 중 오류가 발생했습니다.')
        } finally {
            setColorLoading(null)
        }
    }

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {workers.map(worker => (
                <Card key={worker.id}>
                    <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                                <div
                                    className="w-10 h-10 border rounded-full flex items-center justify-center"
                                    style={{
                                        backgroundColor: worker.display_color ? `${worker.display_color}15` : undefined,
                                        borderColor: worker.display_color || undefined,
                                    }}
                                >
                                    <User className="w-5 h-5" style={{ color: worker.display_color || '#94a3b8' }} />
                                </div>
                                <div>
                                    <h3
                                        className="font-bold text-lg"
                                        style={{ color: worker.display_color || undefined }}
                                    >
                                        {worker.name}
                                    </h3>
                                    <p className="text-sm text-slate-500">{worker.phone}</p>
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                                <Badge variant={worker.worker_type === 'leader' ? 'default' : 'secondary'}>
                                    {worker.worker_type === 'leader' ? '팀장' : '팀원'}
                                </Badge>
                                {worker.status === 'pending' && (
                                    <Badge variant="destructive" className="text-[10px] py-0">승인대기</Badge>
                                )}
                            </div>
                        </div>

                        {/* Color Picker */}
                        <div className="mb-3">
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setColorPickerOpen(colorPickerOpen === worker.id ? null : worker.id)}
                                    className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 transition-colors px-2 py-1 rounded border border-dashed border-slate-200 hover:border-slate-400"
                                >
                                    {worker.display_color ? (
                                        <span
                                            className="w-3.5 h-3.5 rounded-full border border-white shadow-sm"
                                            style={{ backgroundColor: worker.display_color }}
                                        />
                                    ) : (
                                        <Palette className="w-3.5 h-3.5" />
                                    )}
                                    <span>{worker.display_color ? '색상 변경' : '색상 설정'}</span>
                                </button>
                                {worker.display_color && (
                                    <button
                                        onClick={() => handleColorChange(worker.id, null)}
                                        className="text-xs text-slate-400 hover:text-red-500 transition-colors"
                                        title="색상 초기화"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                            {colorPickerOpen === worker.id && (
                                <div className="mt-2 p-2 bg-slate-50 rounded-lg border flex flex-wrap gap-2">
                                    {COLOR_PRESETS.map(color => (
                                        <button
                                            key={color.value}
                                            onClick={() => handleColorChange(worker.id, color.value)}
                                            disabled={colorLoading === worker.id}
                                            className="w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-1"
                                            style={{
                                                backgroundColor: color.value,
                                                borderColor: worker.display_color === color.value ? '#1e293b' : 'white',
                                            }}
                                            title={color.name}
                                        />
                                    ))}
                                </div>
                            )}
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
                            {worker.initial_password && (
                                <div className="flex items-center justify-between p-2 bg-slate-50 border rounded mt-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-slate-500 text-xs font-medium">관리용 비밀번호:</span>
                                        <span className="font-mono text-sm tracking-widest font-bold text-slate-700">
                                            {showPasswords[worker.id] ? worker.initial_password : '••••••'}
                                        </span>
                                    </div>
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-6 w-6"
                                        onClick={() => togglePassword(worker.id)}
                                    >
                                        {showPasswords[worker.id] ? (
                                            <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                                        ) : (
                                            <Eye className="w-3.5 h-3.5 text-slate-400" />
                                        )}
                                    </Button>
                                </div>
                            )}
                        </div>

                        {worker.status === 'pending' ? (
                            <Button
                                size="sm"
                                variant="default"
                                className="w-full bg-green-600 hover:bg-green-700"
                                onClick={() => handleApprove(worker.id)}
                                disabled={!!processingId}
                            >
                                {processingId === worker.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <>
                                        <UserCheck className="w-4 h-4 mr-1" />
                                        가입 승인
                                    </>
                                )}
                            </Button>
                        ) : (
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
                        )}
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}

