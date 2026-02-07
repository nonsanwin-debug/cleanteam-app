import { getSiteDetails, getSitePhotos } from '@/actions/worker'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MapPin, ArrowLeft, CheckSquare, User, Calendar } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export default async function WorkerSitePage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;

    const site = await getSiteDetails(params.id)
    const photos = await getSitePhotos(params.id)

    if (!site) notFound()

    return (
        <div className="space-y-6">
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
                        <div className="grid grid-cols-2 gap-2">
                            <a
                                href={`https://m.map.kakao.com/actions/searchView?q=${encodeURIComponent(site.address)}`}
                                target="_blank"
                                rel="noopener noreferrer"
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
                </CardContent>
            </Card>

            {/* Job Details Card */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-base">작업 상세 정보</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <span className="text-slate-500 block text-xs">고객명</span>
                            <span>{site.customer_name || '-'}</span>
                        </div>
                        <div>
                            <span className="text-slate-500 block text-xs">연락처</span>
                            <span className="font-mono">{site.customer_phone ?
                                <a href={`tel:${site.customer_phone}`} className="underline text-blue-600">
                                    {site.customer_phone}
                                </a> : '-'}
                            </span>
                        </div>
                        <div>
                            <span className="text-slate-500 block text-xs">날짜</span>
                            <span>{site.cleaning_date || '-'}</span>
                        </div>
                        <div>
                            <span className="text-slate-500 block text-xs">시간</span>
                            <span>{site.start_time || '-'}</span>
                        </div>
                        <div>
                            <span className="text-slate-500 block text-xs">평수</span>
                            <span>{site.area_size || '-'}</span>
                        </div>
                        <div>
                            <span className="text-slate-500 block text-xs">구조</span>
                            <span>{site.structure_type || '-'}</span>
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

            {/* Photo Section - DISABLED FOR NOW */}
            <section>
                <h3 className="font-bold mb-2 flex items-center">
                    <span className="bg-primary/10 text-primary p-1 rounded mr-2">Step 1</span>
                    사진 기록
                </h3>
                <Card className="border-dashed border-2">
                    <CardContent className="py-8 text-center text-slate-500">
                        사진 업로드 기능은 임시로 비활성화되었습니다.
                        <div className="text-xs mt-2">현재 {photos.length}개의 사진이 등록되어 있습니다.</div>
                    </CardContent>
                </Card>
            </section>

            {/* Checklist Link (Placeholder for next step) */}
            <section>
                <h3 className="font-bold mb-2 flex items-center">
                    <span className="bg-slate-100 text-slate-500 p-1 rounded mr-2">Step 2</span>
                    체크리스트
                </h3>
                <Button className="w-full text-lg h-12" variant="secondary" disabled>
                    <CheckSquare className="mr-2" />
                    사진 등록 완료 후 활성화됩니다
                    <span className="text-xs ml-2 text-slate-400 font-normal">(구현 예정)</span>
                </Button>
            </section>
        </div>
    )
}
