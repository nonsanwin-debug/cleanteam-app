'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { parseOrderWithAI } from '@/lib/ai-parser'
import { createSite } from '@/actions/sites'
import { Sparkles, Loader2, Check, AlertCircle } from 'lucide-react'

type Worker = {
    id: string
    name: string | null
    worker_type?: 'leader' | 'member'
}

type ParsedData = {
    customer_name: string
    customer_phone: string
    name: string
    address: string
    cleaning_date: string
    start_time: string
    structure_type: string
    residential_type: string
    area_size: string
    special_notes: string
    balance_amount: number
    collection_type: 'site' | 'company' | ''
}

interface OrderParserDialogProps {
    workers: Worker[]
}

export function OrderParserDialog({ workers }: OrderParserDialogProps) {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [orderText, setOrderText] = useState('')
    const [parsing, setParsing] = useState(false)
    const [registering, setRegistering] = useState(false)
    const [parsed, setParsed] = useState<ParsedData | null>(null)
    const [selectedWorker, setSelectedWorker] = useState('')
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)

    const handleParse = async () => {
        if (!orderText.trim()) return
        setParsing(true)
        setError('')
        setParsed(null)

        const result = await parseOrderWithAI(orderText)
        if (result.success && result.data) {
            setParsed(result.data)
        } else {
            setError(result.error || '파싱에 실패했습니다.')
        }
        setParsing(false)
    }

    const handleRegister = async () => {
        if (!parsed) return
        if (!parsed.collection_type) {
            setError('수금 방식을 선택해주세요.')
            return
        }
        setRegistering(true)
        setError('')

        const result = await createSite({
            name: parsed.name,
            address: parsed.address,
            worker_id: (selectedWorker && selectedWorker !== 'none') ? selectedWorker : null,
            customer_name: parsed.customer_name,
            customer_phone: parsed.customer_phone,
            residential_type: parsed.residential_type,
            area_size: parsed.area_size,
            structure_type: parsed.structure_type,
            cleaning_date: parsed.cleaning_date,
            start_time: parsed.start_time,
            special_notes: parsed.special_notes,
            balance_amount: parsed.balance_amount,
            collection_type: parsed.collection_type,
        })

        if (result.success) {
            setSuccess(true)
            setTimeout(() => {
                setOpen(false)
                resetState()
                router.refresh() // 다이얼로그 닫힌 후 페이지 새로고침
            }, 1500)
        } else {
            setError(result.error || '등록에 실패했습니다.')
        }
        setRegistering(false)
    }

    const resetState = () => {
        setOrderText('')
        setParsed(null)
        setSelectedWorker('')
        setError('')
        setSuccess(false)
    }

    const updateField = (key: keyof ParsedData, value: string | number) => {
        if (!parsed) return
        setParsed({ ...parsed, [key]: value })
    }

    return (
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetState() }}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2 border-violet-200 text-violet-700 hover:bg-violet-50">
                    <Sparkles className="h-4 w-4" />
                    AI 오더 등록
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-violet-600" />
                        AI 오더 자동 등록
                    </DialogTitle>
                    <DialogDescription>
                        오더 텍스트를 붙여넣으면 AI가 자동으로 정보를 추출합니다.
                    </DialogDescription>
                </DialogHeader>

                {success ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                        <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                            <Check className="h-8 w-8 text-green-600" />
                        </div>
                        <p className="text-lg font-semibold text-green-700">현장이 등록되었습니다!</p>
                    </div>
                ) : !parsed ? (
                    /* Step 1: 오더 텍스트 입력 */
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="order-text">오더 텍스트</Label>
                            <Textarea
                                id="order-text"
                                placeholder={`성함(숨고 닉네임) : 홍길동\n연락처 : 010-1234-5678\n주소 : 서울시 강남구...\n청소 날짜 : 2/15\n금액 : 잔금 20만원`}
                                className="mt-1.5 min-h-[200px] font-mono text-sm"
                                value={orderText}
                                onChange={(e) => setOrderText(e.target.value)}
                            />
                        </div>
                        {error && (
                            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                                <AlertCircle className="h-4 w-4 shrink-0" />
                                {error}
                            </div>
                        )}
                        <Button
                            onClick={handleParse}
                            disabled={!orderText.trim() || parsing}
                            className="w-full bg-violet-600 hover:bg-violet-700"
                        >
                            {parsing ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    AI 분석 중...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="h-4 w-4 mr-2" />
                                    AI로 분석하기
                                </>
                            )}
                        </Button>
                    </div>
                ) : (
                    /* Step 2: 추출 결과 미리보기 & 수정 */
                    <div className="space-y-4">
                        <div className="bg-violet-50 border border-violet-200 rounded-lg p-3 text-sm text-violet-700">
                            ✨ AI가 추출한 정보입니다. 수정 후 등록하세요.
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <Label className="text-xs text-muted-foreground">고객명</Label>
                                <Input
                                    value={parsed.customer_name}
                                    onChange={(e) => updateField('customer_name', e.target.value)}
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label className="text-xs text-muted-foreground">연락처</Label>
                                <Input
                                    value={parsed.customer_phone}
                                    onChange={(e) => updateField('customer_phone', e.target.value)}
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label className="text-xs text-muted-foreground">현장명</Label>
                                <Input
                                    value={parsed.name}
                                    onChange={(e) => updateField('name', e.target.value)}
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label className="text-xs text-muted-foreground">주소</Label>
                                <Input
                                    value={parsed.address}
                                    onChange={(e) => updateField('address', e.target.value)}
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label className="text-xs text-muted-foreground">작업일</Label>
                                <Input
                                    type="date"
                                    value={parsed.cleaning_date}
                                    onChange={(e) => updateField('cleaning_date', e.target.value)}
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label className="text-xs text-muted-foreground">시작 시간</Label>
                                <Input
                                    type="time"
                                    value={parsed.start_time}
                                    onChange={(e) => updateField('start_time', e.target.value)}
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label className="text-xs text-muted-foreground">주거형태</Label>
                                <Input
                                    value={parsed.residential_type}
                                    onChange={(e) => updateField('residential_type', e.target.value)}
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label className="text-xs text-muted-foreground">평수</Label>
                                <Input
                                    value={parsed.area_size}
                                    onChange={(e) => updateField('area_size', e.target.value)}
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label className="text-xs text-muted-foreground">구조</Label>
                                <Input
                                    value={parsed.structure_type}
                                    onChange={(e) => updateField('structure_type', e.target.value)}
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label className="text-xs text-muted-foreground">잔금</Label>
                                <Input
                                    type="number"
                                    value={parsed.balance_amount}
                                    onChange={(e) => updateField('balance_amount', Number(e.target.value))}
                                    className="mt-1"
                                />
                            </div>
                        </div>

                        <div>
                            <Label className="text-xs text-muted-foreground">특이사항 / 추가 서비스</Label>
                            <Textarea
                                value={parsed.special_notes}
                                onChange={(e) => updateField('special_notes', e.target.value)}
                                className="mt-1 min-h-[80px] text-sm"
                            />
                        </div>

                        {/* 수금 방식 선택 */}
                        <div className="border-t pt-4">
                            <Label className="text-sm font-semibold">수금 방식 *</Label>
                            <div className="flex gap-3 mt-2">
                                <button
                                    type="button"
                                    onClick={() => updateField('collection_type', 'site')}
                                    className={`flex-1 py-3 px-4 rounded-lg border-2 text-sm font-semibold transition-all ${parsed.collection_type === 'site'
                                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                                        : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                                        }`}
                                >
                                    💰 팀장 직접 수금
                                </button>
                                <button
                                    type="button"
                                    onClick={() => updateField('collection_type', 'company')}
                                    className={`flex-1 py-3 px-4 rounded-lg border-2 text-sm font-semibold transition-all ${parsed.collection_type === 'company'
                                        ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                                        : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                                        }`}
                                >
                                    🏢 업체 수금
                                </button>
                            </div>
                        </div>

                        {/* 팀장 선택 */}
                        <div className="border-t pt-4">
                            <Label className="text-sm font-semibold">팀장 배정</Label>
                            <Select value={selectedWorker} onValueChange={setSelectedWorker}>
                                <SelectTrigger className="mt-1.5">
                                    <SelectValue placeholder="팀장을 선택하세요 (선택사항)" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">미배정</SelectItem>
                                    {workers.filter(w => w.worker_type === 'leader').map(w => (
                                        <SelectItem key={w.id} value={w.id}>
                                            {w.name || '이름 없음'}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {error && (
                            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                                <AlertCircle className="h-4 w-4 shrink-0" />
                                {error}
                            </div>
                        )}

                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                onClick={() => { setParsed(null); setError('') }}
                                className="flex-1"
                            >
                                다시 입력
                            </Button>
                            <Button
                                onClick={handleRegister}
                                disabled={registering}
                                className="flex-1 bg-violet-600 hover:bg-violet-700"
                            >
                                {registering ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        등록 중...
                                    </>
                                ) : (
                                    '현장 등록'
                                )}
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
