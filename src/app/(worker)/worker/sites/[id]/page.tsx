'use client'

import { useEffect, useState } from 'react'
import { getSiteDetails, getSitePhotos } from '@/actions/worker'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MapPin, ArrowLeft, CheckSquare, Loader2, Share2, Phone } from 'lucide-react'
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
                            <p className="text-sm font-medium text-gray-500">연락처</p>
                            <div className="flex items-center justify-between">
                                <p className="text-gray-800">{site.manager_phone || site.customer_phone || '-'}</p>
                                {(site.manager_phone || site.customer_phone) && (
                                    <a
                                        href={`tel:${site.manager_phone || site.customer_phone}`}
                                        className="bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 transition-colors shadow-sm"
                                    >
                                        <Phone className="h-4 w-4" />
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
