import { getSites, getWorkers } from '@/actions/sites'
import { SiteDialog } from '@/components/admin/site-dialog'
import { SiteActions } from '@/components/admin/site-actions'
import { AdminSiteDateFilter } from '@/components/admin/site-date-filter'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MapPin, User, Calendar } from 'lucide-react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function AdminSitesPage(props: { searchParams: Promise<{ date?: string }> }) {
    const searchParams = await props.searchParams;
    const sites = await getSites()
    const workers = await getWorkers()

    // Default to today if no date is provided
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' });
    const filterDate = searchParams.date || today;

    // Filter sites if date is selected
    const filteredSites = filterDate
        ? sites.filter(site => site.cleaning_date === filterDate)
        : sites

    const isValidDate = filterDate && !isNaN(new Date(filterDate).getTime())

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">현장 관리</h2>
                    <p className="text-muted-foreground">
                        <p className="text-muted-foreground">
                            {isValidDate
                                ? `${format(new Date(filterDate), 'yyyy년 MM월 dd일')} 현장 목록 (${filteredSites.length}건)`
                                : '등록된 모든 청소 현장을 관리하고 팀장을 배정합니다.'}
                        </p>
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <AdminSiteDateFilter />
                    <SiteDialog workers={workers} />
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredSites.length === 0 ? (
                    <div className="col-span-full text-center py-20 text-muted-foreground bg-slate-50 rounded-lg border border-dashed">
                        {isValidDate
                            ? '해당 날짜에 예정된 현장이 없습니다.'
                            : '등록된 현장이 없습니다. 새 현장을 추가해주세요.'}
                    </div>
                ) : (
                    filteredSites.map((site) => (
                        <Card key={site.id} className="overflow-hidden group hover:border-slate-400 transition-colors">
                            <CardHeader className="pb-3 bg-slate-50/50 relative">
                                <Link href={`/admin/sites/${site.id}`} className="absolute inset-0 z-0" />
                                <div className="flex justify-between items-start z-10 pointer-events-none">
                                    <div className="space-y-1">
                                        <CardTitle className="text-lg group-hover:text-blue-600 transition-colors">
                                            {site.name}
                                        </CardTitle>
                                        <CardDescription className="flex items-center text-xs">
                                            <Calendar className="mr-1 h-3 w-3" />
                                            청소일: {site.cleaning_date || '-'}
                                        </CardDescription>
                                    </div>
                                    <Badge
                                        variant="outline"
                                        className={
                                            site.status === 'completed'
                                                ? 'bg-[#A3CCA3] text-white border-transparent hover:bg-[#92b892]'
                                                : site.status === 'in_progress'
                                                    ? 'bg-primary text-primary-foreground hover:bg-primary/80'
                                                    : 'text-foreground'
                                        }
                                    >
                                        {site.status === 'completed' ? '완료' :
                                            site.status === 'in_progress' ? '진행중' : '대기'}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-4 space-y-3">
                                <Link href={`/admin/sites/${site.id}`} className="block space-y-3">
                                    <div className="flex items-start text-sm text-slate-600">
                                        <MapPin className="mr-2 h-4 w-4 text-slate-400 mt-0.5" />
                                        <span className="flex-1 line-clamp-1">{site.address}</span>
                                    </div>
                                    <div className="flex items-center text-sm text-slate-600">
                                        <User className="mr-2 h-4 w-4 text-slate-400" />
                                        <span>
                                            {site.worker?.name ? (
                                                <span className="font-medium text-slate-900">{site.worker.name}</span>
                                            ) : (
                                                <span className="text-slate-400 italic">담당자 미지정</span>
                                            )}
                                        </span>
                                    </div>
                                </Link>
                                <div className="pt-2 flex justify-end">
                                    <SiteActions site={site} workers={workers} />
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    )
}
