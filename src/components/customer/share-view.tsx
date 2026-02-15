'use client'

import { createBrowserClient } from '@supabase/ssr'
import { useEffect, useState } from 'react'
import { CustomerChecklist } from '@/components/customer/customer-checklist'
import { PhotoUploader } from '@/components/worker/photo-uploader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CalendarDays, MapPin, User } from 'lucide-react'

export function ShareView({ siteId }: { siteId: string }) {
    const [site, setSite] = useState<any>(null)
    const [photos, setPhotos] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchData = async () => {
        try {
            const supabase = createBrowserClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
            )

            // Fetch Site
            const { data: siteData, error: siteError } = await supabase
                .from('sites')
                .select('*, worker:users!worker_id(name, phone)') // Join with users table
                .eq('id', siteId)
                .single()

            if (siteError) throw siteError
            setSite(siteData)

            // Fetch Photos
            const { data: photosData } = await supabase
                .from('photos')
                .select('*')
                .eq('site_id', siteId)
                .order('created_at', { ascending: true })

            setPhotos(photosData || [])

        } catch (err: any) {
            console.error(err)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()

        const supabase = createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )

        // Realtime: photos, sites, checklist_submissions 구독
        const channel = supabase
            .channel(`share_realtime_${siteId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'photos',
                    filter: `site_id=eq.${siteId}`
                },
                (payload) => {
                    console.log('Photo change detected:', payload)
                    fetchData()
                }
            )
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'sites',
                    filter: `id=eq.${siteId}`
                },
                (payload) => {
                    console.log('Site change detected:', payload)
                    fetchData()
                }
            )
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'checklist_submissions',
                    filter: `site_id=eq.${siteId}`
                },
                (payload) => {
                    console.log('Checklist change detected:', payload)
                    fetchData()
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [siteId])

    // PWA 복귀 시 자동 갱신
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                console.log('Share page resumed, refreshing data...')
                fetchData()
            }
        }
        document.addEventListener('visibilitychange', handleVisibilityChange)
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
    }, [])

    if (loading) return <div className="p-8 text-center bg-slate-50 min-h-screen">Loading...</div>

    if (error || !site) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
                <div className="text-center space-y-2">
                    <h1 className="text-xl font-bold text-slate-900">유효하지 않은 링크입니다</h1>
                    <p className="text-slate-500">존재하지 않는 현장이거나 삭제된 링크일 수 있습니다. (Client Error: {error})</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            {/* Header */}
            <header className="bg-white border-b sticky top-0 z-10">
                <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-center relative">
                    <h1 className="font-bold text-lg truncate px-8">{site.name}</h1>
                </div>
            </header>

            <main className="max-w-md mx-auto p-4 space-y-6">
                {/* Site Info */}
                <Card className="border-none shadow-sm">
                    <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-slate-500" />
                                현장 정보
                            </CardTitle>
                            <Badge variant={site.status === 'completed' ? 'default' : 'secondary'}>
                                {site.status === 'completed' ? '작업 완료' : '진행 중'}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="text-sm space-y-2">
                        <div className="flex items-start gap-2 text-slate-600">
                            <span className="min-w-fit font-medium">주소:</span>
                            <span>{site.address}</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-600">
                            <User className="h-4 w-4" />
                            <span>담당자: {site.worker?.name || site.worker_name || '미배정'}</span>
                            {(site.worker?.phone || site.worker_phone) && (
                                <a href={`tel:${site.worker?.phone || site.worker_phone}`} className="ml-2 inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-7 px-3">
                                    <span className="sr-only">전화하기</span>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
                                    전화하기
                                </a>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Photos (ReadOnly) */}
                <section>
                    <h3 className="font-bold mb-2 flex items-center text-lg">
                        현장 사진
                    </h3>
                    <PhotoUploader
                        siteId={site.id}
                        existingPhotos={photos}
                        readOnly={true}
                    />
                </section>

                {/* Checklist (Customer Sign) */}
                <section>
                    <h3 className="font-bold mb-2 flex items-center text-lg">
                        작업 완료 확인
                    </h3>
                    <div className="bg-white rounded-lg border p-4 shadow-sm">
                        {site.status === 'completed' ? (
                            <div className="text-center py-8 space-y-3">
                                <div className="mx-auto w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                    </svg>
                                </div>
                                <div>
                                    <h4 className="font-bold text-lg">최종 승인 완료</h4>
                                    <p className="text-slate-500 text-sm">고객님의 서명이 확인되었습니다.</p>
                                </div>
                            </div>
                        ) : (
                            <CustomerChecklist siteId={site.id} photos={photos} onSuccess={fetchData} />
                        )}
                    </div>
                </section>
            </main>
        </div>
    )
}
