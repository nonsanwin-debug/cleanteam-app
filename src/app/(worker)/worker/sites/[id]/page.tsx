'use client'

import { useEffect, useState } from 'react'
import { getSiteDetails, getSitePhotos, updateSiteAdditional, getCompanySmsSettings } from '@/actions/worker'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MapPin, ArrowLeft, CheckSquare, Loader2, Share2, Phone, Pencil, Save, X, Wallet, MessageSquare } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { WorkerSiteActions } from '@/components/worker/worker-site-actions'
import { PhotoUploader } from '@/components/worker/photo-uploader'
import { ChecklistForm, ChecklistFormHandle } from '@/components/worker/checklist-form'
import { AssignedSite, SitePhoto } from '@/types'
import { toast } from 'sonner'
import { useRef } from 'react'

export default function WorkerSitePage({ params }: { params: Promise<{ id: string }> }) {
    const [site, setSite] = useState<AssignedSite | null>(null)
    const [photos, setPhotos] = useState<SitePhoto[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const checklistRef = useRef<ChecklistFormHandle>(null)
    const [editingAdditional, setEditingAdditional] = useState(false)
    const [additionalAmountVal, setAdditionalAmountVal] = useState('')
    const [additionalDescVal, setAdditionalDescVal] = useState('')
    const [savingAdditional, setSavingAdditional] = useState(false)
    const [smsSettings, setSmsSettings] = useState<{ sms_bank_name: string; sms_account_number: string } | null>(null)

    const router = useRouter()

    useEffect(() => {
        let channel: any = null
        const supabase = createClient()

        const fetchSiteData = async () => {
            try {
                const resolvedParams = await params
                const siteId = resolvedParams.id

                // Setup Realtime if not already set
                if (!channel) {
                    channel = supabase
                        .channel(`site_detail_${siteId}`)
                        .on(
                            'postgres_changes',
                            {
                                event: '*',
                                schema: 'public',
                                table: 'sites',
                                filter: `id=eq.${siteId}`
                            },
                            (payload) => {
                                console.log('Realtime update:', payload)

                                // Check if site was completed (customer submitted)
                                if (payload.eventType === 'UPDATE' && payload.new && payload.new.status === 'completed') {
                                    console.log('Site completed, redirecting to home...')
                                    // Redirect worker to home page
                                    window.location.href = 'https://cleanteam-app.vercel.app/worker/home'
                                    return
                                }

                                fetchSiteData() // Re-fetch
                                router.refresh()
                            }
                        )
                        .subscribe()
                }

                // 1. Fetch Site Details
                const siteResponse = await getSiteDetails(siteId)
                if (!siteResponse.success || !siteResponse.data) {
                    setError(siteResponse.error || '현장 정보를 찾을 수 없습니다.')
                    setLoading(false)
                    return
                }
                setSite(siteResponse.data)

                // 2. Fetch Photos
                const photoResponse = await getSitePhotos(siteId)
                if (photoResponse.success && photoResponse.data) {
                    setPhotos(photoResponse.data)
                }

                // 3. Fetch Worker SMS Settings
                const smsResponse = await getCompanySmsSettings()
                if (smsResponse.success && smsResponse.data) {
                    setSmsSettings(smsResponse.data)
                }
            } catch (err) {
                console.error('Failed to fetch data:', err)
                setError('데이터를 불러오는 중 오류가 발생했습니다.')
            } finally {
                setLoading(false)
            }
        }

        fetchSiteData()

        return () => {
            if (channel) supabase.removeChannel(channel)
        }
    }, [params])

    const handleTriggerCopy = () => {
        if (checklistRef.current) {
            checklistRef.current.copyLink()
        } else {
            if (!site) return
            const link = `${window.location.origin}/share/${site.id}`

            // Fallback Copy
            try {
                const textArea = document.createElement("textarea")
                textArea.value = link
                textArea.style.position = "fixed"
                textArea.style.left = "0"
                textArea.style.top = "0"
                textArea.style.opacity = "0"
                document.body.appendChild(textArea)
                textArea.focus({ preventScroll: true })
                textArea.select()
                document.execCommand('copy')
                document.body.removeChild(textArea)
                toast.success('링크가 복사되었습니다.')
            } catch (err) {
                navigator.clipboard.writeText(link).then(() => {
                    toast.success('링크가 복사되었습니다.')
                }).catch(() => {
                    toast.error('복사 실패')
                })
            }
        }
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[50vh]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    if (error || !site) {
        return (
            <div className="p-4 text-center min-h-[50vh] flex flex-col justify-center items-center">
                <h3 className="text-lg font-bold text-red-600 mb-2">오류가 발생했습니다</h3>
                <p className="text-slate-500 mb-4">{error || '현장 정보를 불러오지 못했습니다.'}</p>
                <Link href="/worker/home">
                    <Button variant="outline">목록으로 돌아가기</Button>
                </Link>
            </div>
        )
    }

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className="flex items-center gap-2">
                <Link href="/worker/home">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <h2 className="text-lg font-bold truncate flex-1">{site.name}</h2>
                <Badge variant={site.status === 'in_progress' ? 'default' : 'secondary'}>
                    {site.status === 'in_progress' ? '진행 중' : site.status}
                </Badge>
            </div>

            {/* Address & Navigation */}
            <Card>
                <CardContent className="pt-4 text-sm space-y-4">
                    <div className="flex flex-col gap-3">
                        <div className="flex items-start">
                            <MapPin className="h-4 w-4 mr-2 text-slate-400 mt-0.5 shrink-0" />
                            <span className="text-slate-700 font-medium break-keep">{site.address}</span>
                        </div>


                        <div className="flex flex-col gap-2">
                            <Button
                                variant="outline"
                                className="w-full text-blue-700 border-blue-200 bg-blue-50 hover:bg-blue-100"
                                onClick={handleTriggerCopy}
                            >
                                <Share2 className="w-4 h-4 mr-2" />
                                고객 공유 링크 (저장 & 복사)
                            </Button>

                            <div className="grid grid-cols-2 gap-2">
                                <a
                                    href={`kakaonavi://search?q=${encodeURIComponent(site.address)}`}
                                    className="w-full"
                                >
                                    <Button size="sm" variant="outline" className="w-full h-9 text-xs border-yellow-400 bg-yellow-50 hover:bg-yellow-100 text-slate-900">
                                        카카오내비
                                    </Button>
                                </a>
                                <a
                                    href={`tmap://search?name=${encodeURIComponent(site.address)}`}
                                    className="w-full"
                                >
                                    <Button size="sm" variant="outline" className="w-full h-9 text-xs border-green-500 bg-green-50 hover:bg-green-100 text-slate-900">
                                        티맵
                                    </Button>
                                </a>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Job Details Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <span className="text-2xl font-bold">{site.name}</span>
                        <Badge
                            className={`text-sm px-3 py-1 ${site.status === 'scheduled' ? 'bg-blue-100 text-blue-800' : site.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                                }`}
                        >
                            {site.status === 'scheduled' && '예정됨'}
                            {site.status === 'in_progress' && '진행 중'}
                            {site.status === 'completed' && '완료됨'}
                        </Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center text-gray-600">
                        <MapPin className="mr-2 h-5 w-5 text-gray-500" />
                        <span>{site.address}</span>
                    </div>
                    {site.description && <p className="text-gray-700">{site.description}</p>}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm font-medium text-gray-500">담당자</p>
                            <p className="text-gray-800">{site.manager_name || site.customer_name || '-'}</p>
                        </div>
                        <div>
                            <p className="text-sm font-bold text-blue-600 mb-1">고객 연락처 (해피콜용)</p>
                            <div className="flex items-center justify-between bg-blue-50 p-3 rounded-lg border border-blue-200">
                                <p className="text-xl font-bold text-slate-900">{site.customer_phone || site.manager_phone || '-'}</p>
                                {(site.customer_phone || site.manager_phone) && (
                                    <a
                                        href={`tel:${site.customer_phone || site.manager_phone}`}
                                        className="bg-blue-600 text-white px-4 py-2 rounded-full font-bold flex items-center shadow-md hover:bg-blue-700"
                                    >
                                        <Phone className="h-5 w-5 mr-2" />
                                        전화걸기
                                    </a>
                                )}
                            </div>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500">시작일</p>
                            <p className="text-gray-800">{site.cleaning_date || (site.start_date ? new Date(site.start_date).toLocaleDateString() : '-')}</p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500">작업 시간</p>
                            <p className="text-gray-800">{site.start_time || '-'}</p>
                        </div>
                    </div>
                    {site.special_notes && (
                        <div className="pt-2 border-t mt-2">
                            <span className="text-slate-500 block text-xs mb-1">특이사항</span>
                            <div className="bg-yellow-50 p-2 rounded text-slate-700">
                                {site.special_notes}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Settlement Info Card */}
            <Card className="border-blue-200 bg-blue-50/30">
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Wallet className="h-5 w-5 text-blue-600" />
                        정산 정보
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="flex items-center justify-between py-2 border-b">
                        <span className="text-sm text-slate-500">잔금</span>
                        <span className="font-bold text-lg">{(site.balance_amount || 0).toLocaleString()}원</span>
                    </div>

                    {editingAdditional ? (
                        <div className="space-y-3 py-2 border-b">
                            <div>
                                <label className="text-sm text-slate-500 block mb-1">추가금액</label>
                                <Input
                                    type="number"
                                    value={additionalAmountVal}
                                    onChange={(e) => setAdditionalAmountVal(e.target.value)}
                                    placeholder="추가금액 입력"
                                    className="bg-white"
                                />
                            </div>
                            <div>
                                <label className="text-sm text-slate-500 block mb-1">추가 사유</label>
                                <Textarea
                                    value={additionalDescVal}
                                    onChange={(e) => setAdditionalDescVal(e.target.value)}
                                    placeholder="추가 작업 내용을 입력하세요"
                                    className="bg-white resize-none"
                                    rows={2}
                                />
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    size="sm"
                                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                                    onClick={async () => {
                                        setSavingAdditional(true)
                                        const result = await updateSiteAdditional(
                                            site.id,
                                            parseInt(additionalAmountVal) || 0,
                                            additionalDescVal
                                        )
                                        setSavingAdditional(false)
                                        if (result.success) {
                                            toast.success('추가금이 수정되었습니다.')
                                            setSite(prev => prev ? {
                                                ...prev,
                                                additional_amount: parseInt(additionalAmountVal) || 0,
                                                additional_description: additionalDescVal
                                            } : prev)
                                            setEditingAdditional(false)
                                        } else {
                                            toast.error(result.error || '수정 실패')
                                        }
                                    }}
                                    disabled={savingAdditional}
                                >
                                    {savingAdditional ? (
                                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                                    ) : (
                                        <Save className="h-4 w-4 mr-1" />
                                    )}
                                    저장
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setEditingAdditional(false)}
                                    disabled={savingAdditional}
                                >
                                    <X className="h-4 w-4 mr-1" />
                                    취소
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="py-2 border-b">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-slate-500">추가금</span>
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-lg text-blue-700">
                                        {(site.additional_amount || 0).toLocaleString()}원
                                    </span>
                                    {site.status !== 'completed' && (
                                        <button
                                            onClick={() => {
                                                setAdditionalAmountVal(String(site.additional_amount || 0))
                                                setAdditionalDescVal(site.additional_description || '')
                                                setEditingAdditional(true)
                                            }}
                                            className="p-1 rounded hover:bg-blue-100"
                                        >
                                            <Pencil className="h-3.5 w-3.5 text-blue-500" />
                                        </button>
                                    )}
                                </div>
                            </div>
                            {site.additional_description && (
                                <p className="text-sm text-slate-600 mt-1 bg-white/60 p-2 rounded">
                                    {site.additional_description}
                                </p>
                            )}
                        </div>
                    )}

                    <div className="flex items-center justify-between pt-1">
                        <span className="text-sm font-medium text-slate-700">총 합계 (잔금 + 추가)</span>
                        <span className="font-bold text-xl text-green-700">
                            {((site.balance_amount || 0) + (site.additional_amount || 0)).toLocaleString()}원
                        </span>
                    </div>

                    <div className="mt-2 bg-red-50 border border-red-300 rounded-lg p-4">
                        {site.collection_type === 'site' ? (
                            <div className="space-y-3">
                                <p className="font-bold text-red-600 text-lg text-center">
                                    ⚠️ 현장 팀장님 수금입니다
                                </p>
                                <p className="text-sm text-red-600 text-center font-medium">
                                    클릭 시 고객에게 메시지를 보냅니다
                                </p>
                                <a
                                    href={(() => {
                                        const balance = site.balance_amount || 0
                                        const additional = site.additional_amount || 0
                                        const total = balance + additional
                                        const bankName = smsSettings?.sms_bank_name || '(은행 미설정)'
                                        const accountNumber = smsSettings?.sms_account_number || '(계좌번호 미설정)'
                                        const messageBody = `고객님 청소는 잘 마무리 되었습니다\n아래 계좌번호로 명시된 금액 입금 후\n예금주 성함과 함께 문자 부탁드리겠습니다\n\n입금 계좌번호 :\n${bankName}\n${accountNumber}\n잔금 : ${balance.toLocaleString()}원\n추가금 : ${additional.toLocaleString()}원\n합계 : ${total.toLocaleString()}원\n\n추후 부족하신 부분이나 문제가 있는 부분에 대해서\n연락주시면 바로 처리 도와드리겠습니다`
                                        const phone = site.customer_phone || site.manager_phone || ''
                                        const cleanPhone = phone.replace(/-/g, '')
                                        return `sms:${cleanPhone}?body=${encodeURIComponent(messageBody)}`
                                    })()}
                                    className="block"
                                >
                                    <Button
                                        variant="outline"
                                        className="w-full border-red-300 bg-white hover:bg-red-50 text-red-700 font-bold text-base py-6"
                                    >
                                        <MessageSquare className="w-5 h-5 mr-2" />
                                        📱 고객에게 수금 문자 보내기
                                    </Button>
                                </a>
                                {(!smsSettings?.sms_bank_name || !smsSettings?.sms_account_number) && (
                                    <p className="text-xs text-orange-600 text-center">
                                        ⚠️ 관리자에게 설정 {'>'} 수금 문자 설정에서 은행명과 계좌번호 등록을 요청해주세요
                                    </p>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <p className="font-bold text-red-600 text-lg text-center">
                                    ⚠️ <span className="text-red-600">업체수금</span> 입니다
                                </p>
                                <p className="text-sm text-red-700 text-center font-medium leading-relaxed">
                                    청소 종료 시 고객에게<br />
                                    금액은 대표님께 직접 연락드리면 된다고 전달
                                </p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Photo Section */}
            <section>
                <h3 className="font-bold mb-2 flex items-center">
                    <span className="bg-primary/10 text-primary p-1 rounded mr-2">Step 1</span>
                    사진 기록
                </h3>
                <PhotoUploader siteId={site.id} existingPhotos={photos} />
            </section>

            {/* Checklist Section */}
            <section>
                <h3 className="font-bold mb-2 flex items-center">
                    <span className="bg-primary/10 text-primary p-1 rounded mr-2">Step 2</span>
                    체크리스트 및 작업 완료
                </h3>
                <ChecklistForm
                    siteId={site.id}
                    isPhotosUploaded={photos.length > 0}
                    ref={checklistRef}
                />
            </section>
        </div>
    )
}
