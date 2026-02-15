'use client'

import { useState, useEffect, forwardRef, useImperativeHandle } from 'react'

import { getChecklistForSite, submitChecklist, saveChecklistProgress } from '@/actions/checklist-submission'
import { completeWork } from '@/actions/worker'
import { SignaturePad } from '@/components/worker/signature-pad'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { Loader2, CheckCircle2, Share2, Save, CheckCheck } from 'lucide-react'
import { useRouter } from 'next/navigation'

// Fallback Template if none in DB
const DEFAULT_TEMPLATE = {
    title: '기본 체크리스트',
    items: [
        { id: 'entrance', text: '현관 (신발장, 바닥, 거울)', type: 'check' },
        { id: 'living', text: '거실 (바닥, 창틀, 등기구)', type: 'check' },
        { id: 'kitchen', text: '주방 (싱크대, 수납장, 후드)', type: 'check' },
        { id: 'bathroom', text: '화장실 (변기, 세면대, 배수구)', type: 'check' },
        { id: 'rooms', text: '방 (바닥, 창문, 붙박이장)', type: 'check' },
        { id: 'veranda', text: '베란다/다용도실', type: 'check' },
    ]
}

interface ChecklistFormProps {
    siteId: string
    siteName?: string
    isPhotosUploaded: boolean // Only enable if photos are present?
    isLeader?: boolean // 팀장 여부 (팀장만 작업 완료 가능)
}

export interface ChecklistFormHandle {
    copyLink: () => Promise<void>;
}

export const ChecklistForm = forwardRef<ChecklistFormHandle, ChecklistFormProps>(({ siteId, siteName, isPhotosUploaded, isLeader = false }, ref) => {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [completing, setCompleting] = useState(false)
    const [template, setTemplate] = useState<any>(null)
    const [answers, setAnswers] = useState<Record<string, string>>({})
    const [signature, setSignature] = useState<string | null>(null)
    const [submitted, setSubmitted] = useState(false)

    useImperativeHandle(ref, () => ({
        copyLink: handleCopyLink
    }));

    useEffect(() => {
        async function loadTemplate() {
            try {
                const data = await getChecklistForSite(siteId)
                if (data) {
                    setTemplate(data)
                } else {
                    setTemplate(DEFAULT_TEMPLATE)
                }
            } catch (error) {
                console.error('Failed to load template:', error)
                setTemplate(DEFAULT_TEMPLATE)
            } finally {
                setLoading(false)
            }
        }
        loadTemplate()
    }, [siteId])

    const handleAnswerChange = (itemId: string, value: string) => {
        setAnswers(prev => ({ ...prev, [itemId]: value }))
    }

    const handleSave = async () => {
        setSubmitting(true)
        try {
            const result = await saveChecklistProgress(siteId, answers)
            if (!result.success) throw new Error(result.error)

            toast.success('저장되었습니다', { description: '작성해주신 내용이 저장되었습니다.' })
        } catch (error) {
            toast.error('저장 실패', { description: '저장 중 오류가 발생했습니다.' })
        } finally {
            setSubmitting(false)
        }
    }

    const handleCompleteWork = async () => {
        if (!confirm('작업을 완료 처리하시겠습니까?\n\n완료하면 되돌릴 수 없습니다.')) return

        setCompleting(true)
        try {
            // Save checklist first
            await saveChecklistProgress(siteId, answers)

            // Then complete the work
            const result = await completeWork(siteId)
            if (!result.success) {
                throw new Error(result.error || '작업 완료 처리에 실패했습니다.')
            }

            toast.success('작업이 완료되었습니다!', {
                description: '추가금이 자동으로 적립되었습니다.'
            })
            router.push('/worker/home')
        } catch (error) {
            toast.error('완료 처리 실패', { description: (error as Error).message })
        } finally {
            setCompleting(false)
        }
    }

    const handleCopyLink = async () => {
        const link = `${window.location.origin}/share/${siteId}`
        const copyText = siteName ? `[${siteName}] 작업 보고서를 확인해주세요.\n${link}` : link
        let copied = false

        try {
            await navigator.clipboard.writeText(copyText)
            copied = true
        } catch (e) {
            // Fallback for iOS/older browsers
            try {
                const textArea = document.createElement("textarea")
                textArea.value = copyText

                // Prevent scrolling by fixing position to top-left
                textArea.style.position = "fixed"
                textArea.style.left = "0"
                textArea.style.top = "0"
                textArea.style.opacity = "0"

                document.body.appendChild(textArea)
                textArea.focus({ preventScroll: true })
                textArea.select()

                const successful = document.execCommand('copy')
                document.body.removeChild(textArea)

                if (successful) copied = true
            } catch (err) {
                console.error('Copy failed', err)
            }
        }

        if (copied) {
            toast.success('링크가 복사되었습니다.', {
                description: '작성 내용 저장 중...'
            })
        } else {
            toast.error('링크 복사 실패', {
                description: '수동으로 링크를 복사해주세요.'
            })
        }

        // 2. Save Progress (Async)
        if (!template) return
        setSubmitting(true)
        try {
            const result = await saveChecklistProgress(siteId, answers)
            if (!result.success) {
                throw new Error(result.error || '저장에 실패했습니다.')
            }
            toast.success('저장 완료', { description: '작성 내용이 안전하게 저장되었습니다.' })
        } catch (error) {
            console.error('Checklist Save Error:', error)
            toast.error('저장 실패', { description: (error as Error).message })
        } finally {
            setSubmitting(false)
        }
    }

    const handleSubmit = async () => {
        if (!signature) {
            toast.error('서명이 필요합니다.')
            return
        }

        const pendingItems = template.items.filter((item: any) => !answers[item.id])
        if (pendingItems.length > 0) {
            toast.error('모든 항목을 확인해주세요.')
            return
        }

        setSubmitting(true)
        try {
            await submitChecklist(siteId, answers, signature)
            setSubmitted(true)
            toast.success('체크리스트가 제출되었습니다.')
            router.refresh()
        } catch (error) {
            toast.error('제출 실패', { description: (error as Error).message })
        } finally {
            setSubmitting(false)
        }
    }

    if (loading) return <div className="py-8 text-center text-slate-500">체크리스트 로딩 중...</div>

    if (submitted) {
        return (
            <Card className="bg-green-50 border-green-200">
                <CardContent className="py-8 flex flex-col items-center justify-center text-green-700">
                    <CheckCircle2 className="w-12 h-12 mb-2" />
                    <h3 className="text-lg font-bold">제출 완료</h3>
                    <p className="text-sm opacity-80">체크리스트 작성이 완료되었습니다.</p>
                </CardContent>
            </Card>
        )
    }

    if (!isPhotosUploaded) {
        return (
            <Card className="bg-slate-50 border-slate-200">
                <CardContent className="py-8 text-center text-slate-500">
                    <p>사진 등록을 먼저 완료해주세요.</p>
                    <p className="text-xs mt-1">사진이 등록되어야 체크리스트 작성이 가능합니다.</p>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardContent className="p-4 space-y-6">
                    <h4 className="font-bold text-lg">{template.title}</h4>

                    <div className="space-y-4">
                        {template.items.map((item: any) => (
                            <div key={item.id} className="border-b pb-4 last:border-0 last:pb-0">
                                <div className="flex items-start space-x-2">
                                    <Checkbox
                                        id={item.id}
                                        checked={answers[item.id] === 'checked'}
                                        onCheckedChange={(checked: any) => handleAnswerChange(item.id, checked ? 'checked' : '')}
                                        className="mt-0.5"
                                    />
                                    <Label
                                        htmlFor={item.id}
                                        className={`text-sm font-medium cursor-pointer leading-snug ${answers[item.id] === 'checked' ? 'text-green-600 font-bold' : ''}`}
                                    >
                                        {item.text}
                                        {answers[item.id] === 'checked' && (
                                            <span className="text-xs text-green-500 ml-1">(확인완료)</span>
                                        )}
                                    </Label>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="space-y-2">
                        <Label>특이사항 / 메모</Label>
                        <Textarea
                            placeholder="특이사항이 있다면 적어주세요."
                            value={answers['notes'] || ''}
                            onChange={(e) => handleAnswerChange('notes', e.target.value)}
                        />
                    </div>

                </CardContent>
            </Card>

            {/* 서명 섹션 숨김 (팀장은 제출 권한 없음, 고객이 서명함) */}
            {/* <Card>
                <CardContent className="p-4 space-y-4">
                    <Label className="text-base font-bold">서명</Label>
                    <p className="text-sm text-slate-500 mb-2">
                        위 내용에 대해 확인하였으며, 작업을 완료합니다.
                    </p>
                    <SignaturePad onEnd={setSignature} />
                </CardContent>
            </Card> */}

            {/* 중간저장 버튼 */}
            <div className="flex gap-2">
                <Button
                    className="w-full h-12 text-lg"
                    variant="outline"
                    onClick={() => handleSave()}
                    disabled={submitting || completing}
                >
                    {submitting ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            저장 중...
                        </>
                    ) : (
                        <>
                            <Save className="mr-2 h-5 w-5" />
                            중간저장
                        </>
                    )}
                </Button>
            </div>

            {/* 작업 완료 버튼 - 팀장만 표시 */}
            {isLeader && (
                <div className="flex gap-2">
                    <Button
                        className="w-full h-14 text-lg font-bold bg-green-600 hover:bg-green-700 text-white shadow-lg"
                        onClick={handleCompleteWork}
                        disabled={submitting || completing}
                    >
                        {completing ? (
                            <>
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                완료 처리 중...
                            </>
                        ) : (
                            <>
                                <CheckCheck className="mr-2 h-6 w-6" />
                                작업 완료
                            </>
                        )}
                    </Button>
                </div>
            )}
        </div>
    )
})

ChecklistForm.displayName = 'ChecklistForm'

