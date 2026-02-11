import { getSiteAdminDetails } from "@/actions/sites"
import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, MapPin, User, Calendar, CheckCircle2, Clock, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { AdminForceCompleteButton } from "@/components/admin/admin-force-complete-button"

export default async function AdminSiteDetailPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const data = await getSiteAdminDetails(params.id)

    if (!data) notFound()

    const { site, photos, checklist } = data

    // Group photos by type
    const photosByType = {
        before: photos.filter(p => p.type === 'before'),
        during: photos.filter(p => p.type === 'during'),
        after: photos.filter(p => p.type === 'after'),
        special: photos.filter(p => p.type === 'special')
    }

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/admin/sites">
                    <Button variant="outline" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <h2 className="text-2xl font-bold tracking-tight">{site.name}</h2>
                        <Badge variant={
                            site.status === 'completed' ? 'secondary' :
                                site.status === 'in_progress' ? 'default' : 'outline'
                        }>
                            {site.status === 'completed' ? '완료' :
                                site.status === 'in_progress' ? '진행중' : '대기'}
                        </Badge>
                    </div>
                    <p className="text-muted-foreground text-sm flex items-center mt-1">
                        <MapPin className="h-3 w-3 mr-1" /> {site.address}
                    </p>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Basic Info */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">기본 정보</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="text-muted-foreground block mb-1">담당 팀장</span>
                                <div className="font-medium flex items-center">
                                    <User className="h-3 w-3 mr-1" />
                                    {site.worker?.name || '미지정'}
                                </div>
                            </div>
                            <div>
                                <span className="text-muted-foreground block mb-1">고객명</span>
                                <div className="font-medium">{site.customer_name || '-'}</div>
                            </div>
                            <div>
                                <span className="text-muted-foreground block mb-1">청소 일시</span>
                                <div className="font-medium flex items-center">
                                    <Calendar className="h-3 w-3 mr-1" />
                                    {site.cleaning_date || '-'} {site.start_time}
                                </div>
                            </div>
                            <div>
                                <span className="text-muted-foreground block mb-1">연락처</span>
                                <div className="font-medium">{site.customer_phone || '-'}</div>
                            </div>
                            <div>
                                <span className="text-muted-foreground block mb-1">평수/구조</span>
                                <div className="font-medium">{site.area_size || '-'} / {site.structure_type || '-'}</div>
                            </div>
                            <div>
                                <span className="text-muted-foreground block mb-1">주거 형태</span>
                                <div className="font-medium">{site.residential_type || '-'}</div>
                            </div>
                            <div>
                                <span className="text-muted-foreground block mb-1">비용 청구 상태</span>
                                <div className="font-medium">
                                    {site.payment_status === 'paid' ? (
                                        <span className="text-green-600 font-bold">지급 완료</span>
                                    ) : site.payment_status === 'requested' ? (
                                        <span className="text-orange-600 font-bold">청구 됨</span>
                                    ) : (
                                        <span className="text-slate-400">미청구</span>
                                    )}
                                </div>
                            </div>
                            <div>
                                <span className="text-muted-foreground block mb-1">청구 금액</span>
                                <div className="font-medium">
                                    {site.claimed_amount ? `${site.claimed_amount.toLocaleString()}원` : '-'}
                                </div>
                            </div>
                        </div>
                        {site.special_notes && (
                            <div className="bg-yellow-50 p-3 rounded-md text-sm border border-yellow-100">
                                <span className="font-semibold text-yellow-800 block mb-1">특이사항</span>
                                <span className="text-yellow-700">{site.special_notes}</span>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Settlement Info */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">정산 및 수금 정보</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="text-muted-foreground block mb-1">수금 형태</span>
                                <Badge variant="outline" className={site.collection_type === 'site' ? "bg-orange-50 text-orange-700 border-orange-200" : "bg-blue-50 text-blue-700 border-blue-200"}>
                                    {site.collection_type === 'site' ? '현장수금' : '회사수금'}
                                </Badge>
                            </div>
                            <div>
                                <span className="text-muted-foreground block mb-1">잔금</span>
                                <div className="font-bold text-slate-900">
                                    {site.balance_amount ? `${site.balance_amount.toLocaleString()}원` : '0원'}
                                </div>
                            </div>
                            {site.additional_amount > 0 && (
                                <>
                                    <div>
                                        <span className="text-muted-foreground block mb-1">추가 금액</span>
                                        <div className="font-bold text-red-600">
                                            +{site.additional_amount.toLocaleString()}원
                                        </div>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground block mb-1">추가 사유</span>
                                        <div className="font-medium">{site.additional_description || '-'}</div>
                                    </div>
                                </>
                            )}
                        </div>
                        <Separator />
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-bold">총 합계(잔금 + 추가)</span>
                            <span className="text-lg font-bold text-blue-600">
                                {((site.balance_amount || 0) + (site.additional_amount || 0)).toLocaleString()}원
                            </span>
                        </div>
                    </CardContent>
                </Card>

                {/* Checklist Summary */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">체크리스트 제출 현황</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {checklist && checklist.status === 'submitted' ? (
                            <div className="text-center py-6 space-y-4">
                                <div className="flex items-center justify-center text-green-600 gap-2 text-lg font-bold">
                                    <CheckCircle2 className="h-6 w-6" /> 제출 완료
                                </div>
                                <div className="text-sm text-muted-foreground">
                                    {new Date(checklist.updated_at || checklist.created_at).toLocaleString()}에 제출됨
                                </div>
                                {checklist.signature_url && (
                                    <div className="mt-4 border rounded-lg p-2 bg-slate-50 inline-block">
                                        <p className="text-xs text-muted-foreground mb-2 text-left">서명</p>
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={checklist.signature_url} alt="Signature" className="h-20 object-contain" />
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-center py-10 text-muted-foreground">
                                <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-20" />
                                <p>
                                    {checklist && checklist.status === 'pending'
                                        ? '체크리스트 작성 중 (중간 저장됨)'
                                        : '아직 체크리스트가 제출되지 않았습니다.'}
                                </p>
                                {site.status !== 'completed' && (
                                    <AdminForceCompleteButton siteId={site.id} siteName={site.name} />
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Claim Details */}
            {(site.payment_status === 'requested' || site.payment_status === 'paid') && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">청구 내역 상세</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            {(site.claim_details as any[])?.map((item: any, idx: number) => (
                                <div key={idx} className="flex justify-between items-center text-sm border-b pb-2 last:border-0">
                                    <span className="text-muted-foreground">{item.name}</span>
                                    <span className="font-medium">{parseInt(item.amount || '0').toLocaleString()}원</span>
                                </div>
                            ))}
                            <div className="flex justify-between items-center pt-2 border-t font-bold">
                                <span>합계</span>
                                <span className="text-lg text-blue-600">{site.claimed_amount?.toLocaleString()}원</span>
                            </div>
                        </div>

                        {site.claim_photos && (site.claim_photos as string[]).length > 0 && (
                            <div>
                                <span className="text-xs font-medium text-muted-foreground block mb-2">영수증/증빙 사진</span>
                                <div className="flex gap-2 overflow-x-auto pb-2">
                                    {(site.claim_photos as string[]).map((url, idx) => (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="block w-20 h-20 flex-shrink-0 border rounded overflow-hidden">
                                            <img src={url} alt={`Receipt ${idx}`} className="w-full h-full object-cover" />
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Photos & Detailed Checklist */}
            <Tabs defaultValue="photos" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="photos">현장 사진 대장</TabsTrigger>
                    <TabsTrigger value="checklist">상세 체크리스트</TabsTrigger>
                </TabsList>

                <TabsContent value="photos" className="mt-4">
                    <Card>
                        <CardContent className="pt-6">
                            <Tabs defaultValue="all" className="w-full">
                                <TabsList className="mb-4">
                                    <TabsTrigger value="all">전체 ({photos.length})</TabsTrigger>
                                    <TabsTrigger value="before">작업 전 ({photosByType.before.length})</TabsTrigger>
                                    <TabsTrigger value="during">작업 중 ({photosByType.during.length})</TabsTrigger>
                                    <TabsTrigger value="after">작업 후 ({photosByType.after.length})</TabsTrigger>
                                    <TabsTrigger value="special">특이사항 ({photosByType.special.length})</TabsTrigger>
                                </TabsList>

                                {['all', 'before', 'during', 'after', 'special'].map((tab) => (
                                    <TabsContent key={tab} value={tab}>
                                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                            {(tab === 'all' ? photos : photosByType[tab as keyof typeof photosByType])
                                                .map((photo: any) => (
                                                    <div key={photo.id} className="relative aspect-square rounded-md overflow-hidden border bg-slate-100 group">
                                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                                        <img
                                                            src={photo.url}
                                                            alt={photo.type}
                                                            className="object-cover w-full h-full transition-transform group-hover:scale-105"
                                                        />
                                                        <div className="absolute top-2 left-2 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded uppercase">
                                                            {photo.type}
                                                        </div>
                                                    </div>
                                                ))}
                                            {(tab === 'all' ? photos : photosByType[tab as keyof typeof photosByType]).length === 0 && (
                                                <div className="col-span-full py-10 text-center text-muted-foreground">
                                                    등록된 사진이 없습니다.
                                                </div>
                                            )}
                                        </div>
                                    </TabsContent>
                                ))}
                            </Tabs>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="checklist" className="mt-4">
                    <Card>
                        <CardContent className="pt-6">
                            {checklist && checklist.data ? (
                                <div className="space-y-6">
                                    {/* Checklist Viewer - Simple JSON Dump for now, improve if structure known */}
                                    <div className="grid gap-4">
                                        {Object.entries(checklist.data || {}).map(([key, value]: [string, any]) => (
                                            <div key={key} className="border-b pb-4 last:border-0">
                                                <h4 className="font-medium mb-2">{value.text || key}</h4>
                                                <div className="flex items-center gap-2">
                                                    {value.checked ? (
                                                        <span className="text-green-600 flex items-center text-sm font-bold bg-green-50 px-2 py-1 rounded">
                                                            <CheckCircle2 className="h-4 w-4 mr-1" /> 예 (확인)
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-400 text-sm">아니오</span>
                                                    )}
                                                    {value.note && (
                                                        <span className="text-sm text-slate-600 bg-slate-50 px-2 py-1 rounded ml-2">
                                                            메모: {value.note}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-10 text-muted-foreground">
                                    <p>체크리스트 데이터가 없습니다.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
