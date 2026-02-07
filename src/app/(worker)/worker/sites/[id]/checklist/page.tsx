/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useEffect } from 'react'
import { getChecklistForSite, submitChecklist } from '@/actions/checklist-submission'
import dynamic from 'next/dynamic'
const SignaturePad = dynamic(() => import('@/components/worker/signature-pad').then(mod => mod.SignaturePad), {
    ssr: false,
    loading: () => <div className="h-40 bg-slate-50 border rounded flex items-center justify-center text-slate-400">서명 패드 로딩 중...</div>
})
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

export default function ChecklistPage() {
    const params = useParams()
    const siteId = Array.isArray(params.id) ? params.id[0] : params.id as string
    return <ChecklistClient siteId={siteId} />
}

function ChecklistClient({ siteId }: { siteId: string }) {
    const [template, setTemplate] = useState<any>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [answers, setAnswers] = useState<Record<string, boolean>>({})
    const [signature, setSignature] = useState<string | null>(null)
    const router = useRouter()

    useEffect(() => {
        async function load() {
            try {
                const tpl = await getChecklistForSite(siteId)
                setTemplate(tpl)
            } catch (e) {
                toast.error('체크리스트를 불러올 수 없습니다.')
            } finally {
                setIsLoading(false)
            }
        }
        load()
    }, [siteId])

    function toggleAnswer(itemId: string) {
        setAnswers(prev => ({
            ...prev,
            [itemId]: !prev[itemId]
        }))
    }

    async function handleSubmit() {
        if (!template) return

        // Validate Required Items
        const missing = template.items.filter((item: any) => item.required && !answers[item.id])
        if (missing.length > 0) {
            toast.error('필수 항목을 모두 체크해주세요.', {
                description: `${missing.length}개 항목이 누락되었습니다.`
            })
            return
        }

        if (!signature) {
            toast.error('서명이 필요합니다.', { description: '하단에 서명해주세요.' })
            return
        }

        if (!confirm('제출 후에는 수정할 수 없습니다. 작업을 완료하시겠습니까?')) return

        setIsSubmitting(true)
        try {
            await submitChecklist(siteId, answers, signature)
            toast.success('작업이 완료되었습니다!', { description: '고생하셨습니다.' })
            router.push('/worker/home')
        } catch (error) {
            toast.error('제출 중 오류가 발생했습니다.')
            console.error(error)
        } finally {
            setIsSubmitting(false)
        }
    }

    if (isLoading) {
        return <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div>
    }

    if (!template) {
        return (
            <div className="p-4 text-center">
                <h2 className="text-xl font-bold mb-2">설정된 체크리스트가 없습니다.</h2>
                <p className="text-slate-500 mb-4">관리자에게 문의해주세요.</p>
                <Link href={`/worker/sites/${siteId}`}><Button>돌아가기</Button></Link>
            </div>
        )
    }

    return (
        <div className="space-y-6 pb-20">
            <div className="flex items-center gap-2 mb-4">
                <Link href={`/worker/sites/${siteId}`}>
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <h2 className="text-xl font-bold">{template.title}</h2>
            </div>

            <div className="space-y-4">
                {template.items?.map((item: any) => (
                    <Card key={item.id} className={answers[item.id] ? 'border-primary bg-blue-50/20' : ''}>
                        <CardContent className="p-4 flex items-start space-x-3">
                            <Checkbox
                                id={item.id}
                                checked={answers[item.id] || false}
                                onCheckedChange={() => toggleAnswer(item.id)}
                                className="mt-1 h-5 w-5"
                            />
                            <div className="grid gap-1.5 leading-none">
                                <Label htmlFor={item.id} className="text-base font-medium leading-normal cursor-pointer">
                                    {item.text}
                                    {item.required && <span className="text-red-500 ml-1">*</span>}
                                </Label>
                                {item.description && (
                                    <p className="text-sm text-muted-foreground">
                                        {item.description}
                                    </p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <section className="space-y-2 pt-4 border-t">
                <h3 className="font-bold flex items-center">
                    <span className="bg-slate-100 text-slate-800 p-1 rounded mr-2 text-sm">최종</span>
                    고객 확인 서명
                </h3>
                <p className="text-xs text-slate-500 mb-2">
                    위 점검 항목을 모두 확인하였으며, 청소 서비스 완료에 동의합니다.
                </p>
                <SignaturePad onEnd={setSignature} />
            </section>

            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t safe-area-bottom">
                <Button
                    className="w-full h-12 text-lg"
                    size="lg"
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                >
                    {isSubmitting ? (
                        <><Loader2 className="animate-spin mr-2" /> 제출 중...</>
                    ) : (
                        <><CheckCircle2 className="mr-2" /> 작업 완료 및 리포트 제출</>
                    )}
                </Button>
            </div>
        </div>
    )
}
