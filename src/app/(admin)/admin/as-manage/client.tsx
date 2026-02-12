'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ASRequest } from '@/types'
import { Site } from '@/actions/sites'
import { createASRequest, updateASRequest, deleteASRequest } from '@/actions/as-manage'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { CalendarIcon, Plus, Pencil, Trash2, Search } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface ASManageClientProps {
    requests: ASRequest[]
    sites: Site[]
    workers: { id: string; name: string; current_money?: number }[]
}

export function ASManageClient({ requests, sites, workers }: ASManageClientProps) {
    const [searchTerm, setSearchTerm] = useState('')
    const [isAddOpen, setIsAddOpen] = useState(false)
    const [isEditOpen, setIsEditOpen] = useState(false)
    const [selectedRequest, setSelectedRequest] = useState<ASRequest | null>(null)

    const filteredRequests = requests.filter(req => {
        const siteName = req.site?.name || req.site_name || ''
        return siteName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            req.worker?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            req.description.toLowerCase().includes(searchTerm.toLowerCase())
    })

    const handleEditClick = (request: ASRequest) => {
        setSelectedRequest(request)
        setIsEditOpen(true)
    }

    const handleDeleteClick = async (id: string) => {
        if (!confirm('정말 삭제하시겠습니까?')) return

        try {
            const res = await deleteASRequest(id)
            if (res.success) {
                toast.success('AS 내역이 삭제되었습니다.')
            } else {
                toast.error('삭제 실패: ' + res.error)
            }
        } catch (error) {
            toast.error('삭제 중 오류가 발생했습니다.')
        }
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-bold">AS 내역 및 처리 결과</CardTitle>
                <Button onClick={() => setIsAddOpen(true)} size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    AS 등록
                </Button>
            </CardHeader>
            <CardContent>
                <div className="flex items-center space-x-2 mb-4">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="현장명, 팀장명, AS 내용 검색"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-8"
                        />
                    </div>
                </div>

                <div className="rounded-md border">
                    <div className="relative w-full overflow-auto">
                        <table className="w-full caption-bottom text-sm">
                            <thead className="[&_tr]:border-b">
                                <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground w-[100px]">발생일</th>
                                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground w-[150px]">현장명</th>
                                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground w-[100px]">담당 팀장</th>
                                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">AS 내용</th>
                                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground w-[100px]">상태</th>
                                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">처리 결과</th>
                                    <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground w-[100px]">차감 금액</th>
                                    <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground w-[100px]">관리</th>
                                </tr>
                            </thead>
                            <tbody className="[&_tr:last-child]:border-0">
                                {filteredRequests.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="p-8 text-center text-muted-foreground">
                                            등록된 AS 내역이 없습니다.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredRequests.map((req) => (
                                        <tr key={req.id} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                            <td className="p-4 align-middle">{req.occurred_at}</td>
                                            <td className="p-4 align-middle font-medium">
                                                {req.site?.name || req.site_name}
                                                {!req.site_id && <Badge variant="outline" className="ml-2 text-[10px] scale-90">수동입력</Badge>}
                                            </td>
                                            <td className="p-4 align-middle">
                                                <span style={{ color: req.worker?.display_color || undefined }}>
                                                    {req.worker?.name || '-'}
                                                </span>
                                            </td>
                                            <td className="p-4 align-middle whitespace-pre-wrap">{req.description}</td>
                                            <td className="p-4 align-middle">
                                                <Badge variant={
                                                    req.status === 'resolved' ? 'outline' :
                                                        req.status === 'monitoring' ? 'secondary' : 'destructive'
                                                } className={cn(
                                                    req.status === 'resolved' && "border-green-500 text-green-600 bg-green-50",
                                                    req.status === 'pending' && "bg-red-100 text-red-700 hover:bg-red-200"
                                                )}>
                                                    {req.status === 'resolved' ? '처리 완료' :
                                                        req.status === 'monitoring' ? '모니터링' : '접수/대기'}
                                                </Badge>
                                            </td>
                                            <td className="p-4 align-middle whitespace-pre-wrap text-muted-foreground">
                                                {req.processing_details || '-'}
                                                {req.resolved_at && <div className="text-xs mt-1">({req.resolved_at} 완료)</div>}
                                            </td>
                                            <td className="p-4 align-middle text-right">
                                                {req.penalty_amount && req.penalty_amount > 0 ? (
                                                    <span className="text-red-500 font-medium">
                                                        -{(req.penalty_amount).toLocaleString()}원
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-300">-</span>
                                                )}
                                            </td>
                                            <td className="p-4 align-middle text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button variant="ghost" size="icon" onClick={() => handleEditClick(req)}>
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(req.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </CardContent>

            <AddASDialog
                open={isAddOpen}
                onOpenChange={setIsAddOpen}
                sites={sites}
                workers={workers}
            />

            {selectedRequest && (
                <EditASDialog
                    open={isEditOpen}
                    onOpenChange={setIsEditOpen}
                    request={selectedRequest}
                />
            )}
        </Card>
    )
}

function AddASDialog({ open, onOpenChange, sites, workers }: {
    open: boolean
    onOpenChange: (open: boolean) => void
    sites: Site[]
    workers: { id: string; name: string; current_money?: number }[]
}) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        site_id: '',
        site_name: '',
        worker_id: '',
        description: '',
        penalty_amount: 0,
        occurred_at: format(new Date(), 'yyyy-MM-dd'),
        status: 'pending' as 'pending' | 'resolved' | 'monitoring'
    })

    const selectedWorkerBalance = workers.find(w => w.id === formData.worker_id)?.current_money || 0

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.site_id) {
            toast.error('현장을 선택해주세요.')
            return
        }
        if (formData.penalty_amount > selectedWorkerBalance) {
            toast.error('차감 금액이 해당 팀장의 잔액보다 큽니다.')
            return
        }
        setLoading(true)

        try {
            const res = await createASRequest({
                ...formData,
                site_id: formData.site_id || null
            })
            if (res.success) {
                toast.success('AS 내역이 등록되었습니다.')
                onOpenChange(false)
                setFormData({
                    site_id: '',
                    site_name: '',
                    worker_id: '',
                    description: '',
                    penalty_amount: 0,
                    occurred_at: format(new Date(), 'yyyy-MM-dd'),
                    status: 'pending'
                })
                router.refresh()
            } else {
                toast.error('등록 실패: ' + res.error)
            }
        } catch (error) {
            toast.error('오류가 발생했습니다.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>새 AS 등록</DialogTitle>
                    <DialogDescription>
                        새로운 AS 접수 내역을 입력합니다.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>현장 선택</Label>
                            <Select
                                value={formData.site_id}
                                onValueChange={(val) => {
                                    const site = sites.find(s => s.id === val)
                                    setFormData(prev => ({
                                        ...prev,
                                        site_id: val,
                                        site_name: site?.name || '',
                                        worker_id: site?.worker_id || prev.worker_id
                                    }))
                                }}
                                required
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="현장 선택" />
                                </SelectTrigger>
                                <SelectContent>
                                    {sites.map(site => (
                                        <SelectItem key={site.id} value={site.id}>
                                            {site.name} ({site.cleaning_date})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>관련 팀장</Label>
                            <Select
                                value={formData.worker_id}
                                onValueChange={(val) => setFormData(prev => ({ ...prev, worker_id: val }))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="팀장 선택 (선택)" />
                                </SelectTrigger>
                                <SelectContent>
                                    {workers.map(worker => (
                                        <SelectItem key={worker.id} value={worker.id}>
                                            {worker.name} (잔액: {(worker.current_money || 0).toLocaleString()}원)
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>발생일</Label>
                            <Input
                                type="date"
                                value={formData.occurred_at}
                                onChange={(e) => setFormData(prev => ({ ...prev, occurred_at: e.target.value }))}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="flex justify-between items-center">
                                <span>차감 금액</span>
                                {formData.worker_id && (
                                    <span className="text-[10px] text-muted-foreground">
                                        최대 차감 가능: {selectedWorkerBalance.toLocaleString()}원
                                    </span>
                                )}
                            </Label>
                            <div className="relative">
                                <Input
                                    type="number"
                                    placeholder="0"
                                    value={formData.penalty_amount}
                                    onChange={(e) => setFormData(prev => ({ ...prev, penalty_amount: Number(e.target.value) }))}
                                    className="pr-8"
                                />
                                <span className="absolute right-3 top-2.5 text-sm text-slate-400">원</span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>AS 내용</Label>
                        <Textarea
                            placeholder="AS 요청 내용 및 하자 상세"
                            className="min-h-[100px]"
                            value={formData.description}
                            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>초기 상태</Label>
                        <Select
                            value={formData.status}
                            onValueChange={(val: any) => setFormData(prev => ({ ...prev, status: val }))}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="pending">접수/대기</SelectItem>
                                <SelectItem value="monitoring">조치 중/모니터링</SelectItem>
                                <SelectItem value="resolved">처리 완료</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>취소</Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? '등록 중...' : '등록'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}

function EditASDialog({ open, onOpenChange, request }: {
    open: boolean
    onOpenChange: (open: boolean) => void
    request: ASRequest
}) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        description: request.description,
        processing_details: request.processing_details || '',
        status: request.status,
        resolved_at: request.resolved_at || ''
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const res = await updateASRequest(request.id, formData)
            if (res.success) {
                toast.success('AS 내역이 수정되었습니다.')
                onOpenChange(false)
                router.refresh()
            } else {
                toast.error('수정 실패: ' + res.error)
            }
        } catch (error) {
            toast.error('오류가 발생했습니다.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>AS 처리 결과 관리</DialogTitle>
                    <DialogDescription>
                        {request.site?.name || request.site_name} ({request.worker?.name || '미지정'}) - {request.occurred_at} 발생
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>AS 내용</Label>
                        <Textarea
                            value={formData.description}
                            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>처리 결과 및 조치 내용</Label>
                        <Textarea
                            placeholder="어떻게 조치했는지 입력하세요."
                            className="min-h-[100px]"
                            value={formData.processing_details}
                            onChange={(e) => setFormData(prev => ({ ...prev, processing_details: e.target.value }))}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>진행 상태</Label>
                            <Select
                                value={formData.status}
                                onValueChange={(val: any) => {
                                    setFormData(prev => ({
                                        ...prev,
                                        status: val,
                                        resolved_at: val === 'resolved' && !prev.resolved_at
                                            ? format(new Date(), 'yyyy-MM-dd')
                                            : prev.resolved_at
                                    }))
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="pending">접수/대기</SelectItem>
                                    <SelectItem value="monitoring">조치 중/모니터링</SelectItem>
                                    <SelectItem value="resolved">처리 완료</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>처리 완료일</Label>
                            <Input
                                type="date"
                                value={formData.resolved_at}
                                onChange={(e) => setFormData(prev => ({ ...prev, resolved_at: e.target.value }))}
                                disabled={formData.status !== 'resolved'}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>취소</Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? '저장 중...' : '저장'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
