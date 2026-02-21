'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { updateWorkerRole, approveWorker, updateWorkerColor, updateWorkerCommission, adjustWorkerBalance } from '@/actions/admin'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { User, ArrowUp, ArrowDown, Loader2, Eye, EyeOff, UserCheck, Palette, X, Percent, Check, ChevronDown, ChevronUp, Receipt, Plus, Minus } from 'lucide-react'

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
    commission_rate?: number | null
}

interface CommissionLog {
    id: string
    user_id: string
    type: string
    amount: number
    description: string
    reference_id: string
    created_at: string
}

export function WorkerManagementList({ workers, commissionLogs = [] }: { workers: Worker[], commissionLogs?: CommissionLog[] }) {
    const router = useRouter()
    const [processingId, setProcessingId] = useState<string | null>(null)
    const [showPasswords, setShowPasswords] = useState<{ [key: string]: boolean }>({})
    const [colorPickerOpen, setColorPickerOpen] = useState<string | null>(null)
    const [colorLoading, setColorLoading] = useState<string | null>(null)
    const [commissionEditing, setCommissionEditing] = useState<string | null>(null)
    const [commissionValue, setCommissionValue] = useState<string>('')
    const [commissionLoading, setCommissionLoading] = useState<string | null>(null)
    const [historyOpen, setHistoryOpen] = useState<string | null>(null)
    const [adjustOpen, setAdjustOpen] = useState<string | null>(null)
    const [adjustType, setAdjustType] = useState<'add' | 'deduct'>('add')
    const [adjustAmount, setAdjustAmount] = useState('')
    const [adjustReason, setAdjustReason] = useState('')
    const [adjustLoading, setAdjustLoading] = useState(false)

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

    function startCommissionEdit(worker: Worker) {
        setCommissionEditing(worker.id)
        setCommissionValue(String(worker.commission_rate ?? 100))
    }

    async function handleCommissionSave(workerId: string) {
        const rate = parseInt(commissionValue)
        if (isNaN(rate) || rate < 0 || rate > 100) {
            toast.error('0~100 사이의 숫자를 입력하세요.')
            return
        }

        setCommissionLoading(workerId)
        try {
            const result = await updateWorkerCommission(workerId, rate)
            if (result.success) {
                toast.success(`퍼센티지가 ${rate}%로 변경되었습니다.`)
                setCommissionEditing(null)
                router.refresh()
            } else {
                toast.error(result.error)
            }
        } catch (e) {
            toast.error('퍼센티지 변경 중 오류가 발생했습니다.')
        } finally {
            setCommissionLoading(null)
        }
    }

    function openAdjustForm(workerId: string, type: 'add' | 'deduct') {
        setAdjustOpen(workerId)
        setAdjustType(type)
        setAdjustAmount('')
        setAdjustReason('')
    }

    async function handleAdjustSubmit(workerId: string) {
        const amount = parseInt(adjustAmount)
        if (isNaN(amount) || amount <= 0) {
            toast.error('올바른 금액을 입력하세요.')
            return
        }
        if (!adjustReason.trim()) {
            toast.error('사유를 입력하세요.')
            return
        }

        const actionText = adjustType === 'add' ? '지급' : '차감'
        if (!confirm(`${amount.toLocaleString()}원을 ${actionText}하시겠습니까?\n사유: ${adjustReason}`)) return

        setAdjustLoading(true)
        try {
            const result = await adjustWorkerBalance(workerId, amount, adjustType, adjustReason.trim())
            if (result.success && result.error) {
                toast.warning(`${actionText} 처리됨 (기록 저장 실패)`)
                setAdjustOpen(null)
                router.refresh()
            } else if (result.success) {
                toast.success(`${actionText} 처리되었습니다.`)
                setAdjustOpen(null)
                router.refresh()
            } else {
                toast.error(result.error)
            }
        } catch (e) {
            toast.error('오류가 발생했습니다.')
        } finally {
            setAdjustLoading(false)
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
                            {/* Commission Rate */}
                            <div className="flex items-center gap-2">
                                <span className="text-slate-500">추가금 퍼센티지: </span>
                                {commissionEditing === worker.id ? (
                                    <div className="flex items-center gap-1">
                                        <Input
                                            type="number"
                                            min={0}
                                            max={100}
                                            value={commissionValue}
                                            onChange={(e) => setCommissionValue(e.target.value)}
                                            className="w-16 h-7 text-sm text-center"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleCommissionSave(worker.id)
                                                if (e.key === 'Escape') setCommissionEditing(null)
                                            }}
                                            autoFocus
                                        />
                                        <span className="text-sm text-slate-500">%</span>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-7 w-7"
                                            onClick={() => handleCommissionSave(worker.id)}
                                            disabled={commissionLoading === worker.id}
                                        >
                                            {commissionLoading === worker.id ? (
                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            ) : (
                                                <Check className="w-3.5 h-3.5 text-green-600" />
                                            )}
                                        </Button>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-7 w-7"
                                            onClick={() => setCommissionEditing(null)}
                                        >
                                            <X className="w-3.5 h-3.5 text-slate-400" />
                                        </Button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => startCommissionEdit(worker)}
                                        className="font-semibold text-blue-600 hover:underline cursor-pointer"
                                    >
                                        {worker.commission_rate ?? 100}%
                                    </button>
                                )}
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

                        {/* Payment/Deduction Buttons */}
                        <div className="flex gap-2 mb-3">
                            <Button
                                size="sm"
                                variant="outline"
                                className="flex-1 border-green-300 text-green-700 hover:bg-green-50"
                                onClick={() => openAdjustForm(worker.id, 'add')}
                            >
                                <Plus className="w-3.5 h-3.5 mr-1" />
                                지급
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                className="flex-1 border-red-300 text-red-700 hover:bg-red-50"
                                onClick={() => openAdjustForm(worker.id, 'deduct')}
                            >
                                <Minus className="w-3.5 h-3.5 mr-1" />
                                차감
                            </Button>
                        </div>

                        {/* Adjust Form */}
                        {adjustOpen === worker.id && (
                            <div className={`mb-3 p-3 rounded-lg border-2 ${adjustType === 'add' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                                <h4 className={`text-sm font-bold mb-2 ${adjustType === 'add' ? 'text-green-700' : 'text-red-700'}`}>
                                    {adjustType === 'add' ? '💰 금액 지급' : '📉 금액 차감'}
                                </h4>
                                <div className="space-y-2">
                                    <Input
                                        type="number"
                                        placeholder="금액 입력"
                                        value={adjustAmount}
                                        onChange={(e) => setAdjustAmount(e.target.value)}
                                        className="bg-white"
                                    />
                                    <Textarea
                                        placeholder="사유 입력 (필수)"
                                        value={adjustReason}
                                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setAdjustReason(e.target.value)}
                                        rows={2}
                                        className="bg-white text-sm"
                                    />
                                    <div className="flex gap-2">
                                        <Button
                                            size="sm"
                                            className={`flex-1 ${adjustType === 'add' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                                            onClick={() => handleAdjustSubmit(worker.id)}
                                            disabled={adjustLoading}
                                        >
                                            {adjustLoading ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                adjustType === 'add' ? '지급 확인' : '차감 확인'
                                            )}
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => setAdjustOpen(null)}
                                            disabled={adjustLoading}
                                        >
                                            취소
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Commission & Adjustment History */}
                        {(() => {
                            const workerLogs = commissionLogs.filter(log => log.user_id === worker.id)
                            if (workerLogs.length === 0) return null
                            return (
                                <div className="mb-4">
                                    <button
                                        onClick={() => setHistoryOpen(historyOpen === worker.id ? null : worker.id)}
                                        className="flex items-center justify-between w-full text-sm px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                                    >
                                        <div className="flex items-center gap-2">
                                            <Receipt className="w-4 h-4 text-blue-600" />
                                            <span className="text-blue-700 font-medium">
                                                정산 기록 ({workerLogs.length}건)
                                            </span>
                                        </div>
                                        {historyOpen === worker.id ? (
                                            <ChevronUp className="w-4 h-4 text-blue-500" />
                                        ) : (
                                            <ChevronDown className="w-4 h-4 text-blue-500" />
                                        )}
                                    </button>
                                    {historyOpen === worker.id && (
                                        <div className="mt-2 max-h-48 overflow-y-auto space-y-1">
                                            {workerLogs.map(log => (
                                                <div key={log.id} className="flex items-center justify-between px-3 py-1.5 text-xs bg-slate-50 border rounded">
                                                    <span className="text-slate-600 truncate mr-2">{log.description}</span>
                                                    <div className="flex items-center gap-3 shrink-0">
                                                        <span className={`font-semibold ${log.type === 'manual_deduct' ? 'text-red-600' : 'text-green-600'}`}>
                                                            {log.type === 'manual_deduct' ? '-' : '+'}{log.amount.toLocaleString()}원
                                                        </span>
                                                        <span className="text-slate-400">{new Date(log.created_at).toLocaleDateString()}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )
                        })()}

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

