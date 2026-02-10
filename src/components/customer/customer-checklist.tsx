'use client'

import { createClient } from '@/lib/supabase/client'

import { useState, useEffect } from 'react'
import { getPublicChecklistForSite, submitPublicChecklist, getPublicChecklistSubmission } from '@/actions/public'
import { SignaturePad } from '@/components/worker/signature-pad'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Loader2, CheckCircle2, Image as ImageIcon, ZoomIn, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import Image from 'next/image'

const DEFAULT_TEMPLATE = {
    title: '작업 완료 확인서',
    items: [
        { id: 'entrance', text: '현관 (신발장, 바닥, 거울)', type: 'check' },
        { id: 'living', text: '거실 (바닥, 창틀, 등기구)', type: 'check' },
        { id: 'kitchen', text: '주방 (싱크대, 수납장, 후드)', type: 'check' },
        { id: 'bathroom', text: '화장실 (변기, 세면대, 배수구)', type: 'check' },
        { id: 'rooms', text: '방 (바닥, 창문, 붙박이장)', type: 'check' },
        { id: 'veranda', text: '베란다/다용도실', type: 'check' },
    ]
}

interface CustomerChecklistProps {
    siteId: string
    photos?: any[]
    onSuccess?: () => void
}

export function CustomerChecklist({ siteId, photos = [], onSuccess }: CustomerChecklistProps) {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [template, setTemplate] = useState<any>(null)
    const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({})
    const [signature, setSignature] = useState<string | null>(null)
    const [submitted, setSubmitted] = useState(false)
    const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null)

    const [workerNotes, setWorkerNotes] = useState<string>('')

    const specialPhotos = photos.filter(p => p.type === 'special')

    useEffect(() => {
        const supabase = createClient()

        async function loadData() {
            try {
                // Parallel fetch
                const [templateData, submissionData] = await Promise.all([
                    getPublicChecklistForSite(siteId),
                    getPublicChecklistSubmission(siteId)
                ])

                // 1. Setup Template
                if (templateData) {
                    setTemplate(templateData)
                } else {
                    setTemplate(DEFAULT_TEMPLATE)
                }

                // 2. Setup Saved State (Worker's progress)
                if (submissionData && submissionData.data) {
                    const savedAnswers = submissionData.data
                    const newChecked: Record<string, boolean> = {}

                    // Map answers to checked state
                    if (templateData?.items || DEFAULT_TEMPLATE.items) {
                        const items = templateData?.items || DEFAULT_TEMPLATE.items
                        items.forEach((item: any) => {
                            // If user answered anything (good/bad/na), mark as checked
                            if (savedAnswers[item.id]) {
                                newChecked[item.id] = true
                            }
                        })
                    }
                    setCheckedItems(newChecked)

                    // Notes
                    if (savedAnswers['notes']) {
                        setWorkerNotes(savedAnswers['notes'])
                    }

                    // Allow UI updates (e.g. green checks) to propagate
                }
            } catch (error) {
                console.error('Failed to load data:', error)
                setTemplate(DEFAULT_TEMPLATE)
            } finally {
                setLoading(false)
            }
        }

        // Initial Load
        loadData()

        // Realtime Subscription
        const channel = supabase
            .channel(`checklist_sub_${siteId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'checklist_submissions',
                    filter: `site_id=eq.${siteId}`
                },
                (payload: any) => {
                    console.log('Realtime update received:', payload)
                    loadData() // Reload data on update
                    router.refresh() // Refresh Server Components if needed
                }
            )
            .subscribe()

        // Polling fallback (every 3 seconds) to ensure updates are caught
        const pollInterval = setInterval(() => {
            loadData()
        }, 3000)

        return () => {
            supabase.removeChannel(channel)
            clearInterval(pollInterval)
        }
    }, [siteId, router])

    const handleCheckChange = (itemId: string, checked: boolean) => {
        setCheckedItems(prev => ({ ...prev, [itemId]: checked }))
    }

    const handleSubmit = async () => {
        if (!signature) {
            toast.error('서명이 필요합니다.')
            return
        }

        // Require all checks? ideally yes for customer sign-off
        const pendingItems = template.items.filter((item: any) => !checkedItems[item.id])
        if (pendingItems.length > 0) {
            toast.error('모든 항목을 확인해주세요.')
            return
        }

        setSubmitting(true)
        try {
            const result = await submitPublicChecklist(siteId, { checkedItems }, signature)
            if (!result.success) throw new Error(result.error)

            setSubmitted(true)
            toast.success('확인서가 제출되었습니다.')
            router.refresh()
            if (onSuccess) onSuccess()
        } catch (error) {
            console.error('Checklist Submission Error:', error)
            toast.error('제출 실패', {
                description: `오류가 발생했습니다: ${(error as Error).message}`
            })
        } finally {
            setSubmitting(false)
        }
    }

    if (loading) return <div className="py-8 text-center text-slate-500">로딩 중...</div>

    if (submitted) {
        return (
            <Card className="bg-green-50 border-green-200">
                <CardContent className="py-8 flex flex-col items-center justify-center text-green-700">
                    <CheckCircle2 className="w-12 h-12 mb-2" />
                    <h3 className="text-lg font-bold">확인 완료</h3>
                    <p className="text-sm opacity-80">작업 완료 확인서가 제출되었습니다. 감사합니다.</p>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardContent className="p-4 space-y-6">
                    <h4 className="font-bold text-lg">{template.title}</h4>
                    <p className="text-sm text-slate-500 -mt-4">
                        청소 상태를 확인하시고 각 항목에 체크해주세요.
                    </p>

                    <div className="space-y-4">
                        {template.items.map((item: any) => (
                            <div key={item.id} className="flex items-start space-x-3 border-b pb-3 last:border-0 last:pb-0">
                                <Checkbox
                                    id={item.id}
                                    checked={checkedItems[item.id] || false}
                                    disabled={true}
                                    className="mt-1"
                                />
                                <Label
                                    htmlFor={item.id}
                                    className={`text-base font-medium cursor-pointer leading-relaxed ${checkedItems[item.id] ? 'text-green-600 font-bold' : 'text-slate-700'}`}
                                >
                                    {item.text}
                                    {checkedItems[item.id] && <span className="text-green-600 text-sm font-normal ml-2">(확인됨)</span>}
                                </Label>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Worker Notes Display with Photos */}
            {(workerNotes || specialPhotos.length > 0) && (
                <Card className="bg-yellow-50/50 border-yellow-100 overflow-hidden">
                    <CardContent className="p-4 space-y-4">
                        <div className="space-y-2">
                            <Label className="font-bold text-yellow-800">팀장 특이사항 / 메모</Label>
                            <div className="text-sm text-yellow-900 bg-white/50 p-3 rounded border border-yellow-100 whitespace-pre-wrap min-h-[60px]">
                                {workerNotes || '작성된 메모가 없습니다.'}
                            </div>
                        </div>

                        {/* Real-time Special Photos Grid */}
                        {specialPhotos.length > 0 && (
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-yellow-700 uppercase tracking-wider">관련 사진</Label>
                                <div className="grid grid-cols-3 gap-2">
                                    {specialPhotos.map((photo: any) => (
                                        <div
                                            key={photo.id}
                                            className="relative aspect-square rounded-md overflow-hidden border border-yellow-200 bg-white cursor-pointer hover:opacity-90 transition-opacity group shadow-sm"
                                            onClick={() => setSelectedPhoto(photo.url)}
                                        >
                                            <img
                                                src={photo.url}
                                                alt="Special note photo"
                                                className="object-cover w-full h-full"
                                            />
                                            <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/10 transition-colors">
                                                <ZoomIn className="text-white opacity-0 group-hover:opacity-100 w-4 h-4" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardContent className="p-4 space-y-4">
                    <Label className="text-base font-bold">고객 서명</Label>
                    <p className="text-sm text-slate-500 mb-2">
                        위 내용에 동의하며 작업 완료를 확인합니다.
                    </p>
                    <SignaturePad onEnd={setSignature} />
                </CardContent>
            </Card>

            <Button
                className="w-full h-12 text-lg"
                onClick={handleSubmit}
                disabled={submitting}
            >
                {submitting ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        제출 중...
                    </>
                ) : (
                    '작업 완료 확인 및 제출'
                )}
            </Button>

            {/* Photo Zoom Dialog */}
            <Dialog open={!!selectedPhoto} onOpenChange={(open) => !open && setSelectedPhoto(null)}>
                <DialogContent className="max-w-4xl w-full p-2 bg-black/90 border-none">
                    <div id="photo-zoom-desc" className="sr-only">확대된 사진 보기</div>
                    {selectedPhoto && (
                        <div className="relative aspect-square md:aspect-video w-full">
                            <Image
                                src={selectedPhoto}
                                alt="Zoomed special photo"
                                fill
                                className="object-contain"
                                priority
                            />
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
