import { getSites, getWorkers } from '@/actions/sites'
import { SiteDialog } from '@/components/admin/site-dialog'
import { SiteActions } from '@/components/admin/site-actions'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MapPin, User, Calendar } from 'lucide-react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

export default async function AdminSitesPage() {
    const sites = await getSites()
    const workers = await getWorkers()

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">현장 관리</h2>
                    <p className="text-muted-foreground">
                        등록된 모든 청소 현장을 관리하고 팀장을 배정합니다.
                    </p>
                </div>
                <SiteDialog workers={workers} />
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {sites.length === 0 ? (
                    <div className="col-span-full text-center py-10 text-muted-foreground bg-slate-50 rounded-lg border border-dashed">
                        등록된 현장이 없습니다. 새 현장을 추가해주세요.
                    </div>
                ) : (
                    sites.map((site) => (
                        <Card key={site.id} className="overflow-hidden">
                            <CardHeader className="pb-3 bg-slate-50/50">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <CardTitle className="text-lg">{site.name}</CardTitle>
                                        <CardDescription className="flex items-center text-xs">
                                            <Calendar className="mr-1 h-3 w-3" />
                                            {format(new Date(site.created_at), 'yyyy.MM.dd', { locale: ko })} 등록
                                        </CardDescription>
                                    </div>
                                    <Badge variant={
                                        site.status === 'completed' ? 'secondary' :
                                            site.status === 'in_progress' ? 'default' : 'outline'
                                    }>
                                        {site.status === 'completed' ? '완료' :
                                            site.status === 'in_progress' ? '진행중' : '대기'}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-4 space-y-3">
                                <div className="flex items-start text-sm text-slate-600">
                                    <MapPin className="mr-2 h-4 w-4 text-slate-400 mt-0.5" />
                                    <span className="flex-1">{site.address}</span>
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
