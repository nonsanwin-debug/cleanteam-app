import { getSites, getWorkers, getAllSiteMembers } from '@/actions/sites'
import { SiteDialog } from '@/components/admin/site-dialog'
import { OrderParserDialog } from '@/components/admin/order-parser-dialog'
import { SiteActions } from '@/components/admin/site-actions'
import { AdminSiteDateFilter } from '@/components/admin/site-date-filter'
import { AdminWorkerFilter } from '@/components/admin/worker-filter'
import { TimePeriodFilter } from '@/components/admin/time-period-filter'
import { AdminSitesRealtime } from '@/components/admin/admin-sites-realtime'
import { SiteMemberAssignment } from '@/components/admin/site-member-assignment'
import { format, isBefore, startOfToday } from 'date-fns'
import Link from 'next/link'
import { AlertCircle, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const dynamic = 'force-dynamic'

export default async function AdminSitesPage(props: { searchParams: Promise<{ date?: string; worker?: string; period?: string; filter?: string }> }) {
    const searchParams = await props.searchParams;
    const [sites, workers] = await Promise.all([
        getSites(),
        getWorkers(),
    ])
    // site_members 테이블이 없을 수 있으므로 별도 처리
    let siteMembers: any[] = []
    try {
        siteMembers = await getAllSiteMembers()
    } catch {
        // 테이블 미존재 시 빈 배열
    }

    // Default to today if no date is provided
    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' });
    const filterDate = searchParams.date || todayStr;
    const filterWorker = searchParams.worker || '';
    const filterPeriod = searchParams.period || '';
    const isOverdueMode = searchParams.filter === 'overdue';

    // 1. Calculate Overdue Sites (어제 이전 날짜 + 완료/취소되지 않음)
    const todayObj = startOfToday()
    const overdueSites = sites.filter(site => {
        if (site.status === 'completed' || (site.status as any) === 'canceled') return false
        if (!site.cleaning_date) return false
        const siteDate = new Date(site.cleaning_date + 'T00:00:00')
        return isBefore(siteDate, todayObj)
    })

    // Filter sites by date
    let filteredSites = isOverdueMode 
        ? overdueSites 
        : (filterDate ? sites.filter(site => site.cleaning_date === filterDate) : sites)

    // Filter sites by worker
    if (filterWorker) {
        filteredSites = filteredSites.filter(site => site.worker_id === filterWorker)
    }

    // Filter sites by time period (am/pm)
    if (filterPeriod === 'am') {
        filteredSites = filteredSites.filter(site => {
            const startTime = (site as any).start_time
            if (!startTime) return false
            const hour = parseInt(startTime.split(':')[0], 10)
            return hour < 12
        })
    } else if (filterPeriod === 'pm') {
        filteredSites = filteredSites.filter(site => {
            const startTime = (site as any).start_time
            if (!startTime) return false
            const hour = parseInt(startTime.split(':')[0], 10)
            return hour >= 12
        })
    }

    const isValidDate = filterDate && !isNaN(new Date(filterDate).getTime())
    const selectedWorker = workers.find(w => w.id === filterWorker)

    // SiteActions를 각 사이트에 대해 미리 렌더링
    const siteActionElements = filteredSites.map(site => (
        <SiteActions key={site.id} site={site} workers={workers} />
    ))

    return (
        <div className="space-y-6">
            <AdminSitesRealtime />
            
            {/* Overdue Banner if any exist and not in overdue mode */}
            {!isOverdueMode && overdueSites.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-2 text-red-700">
                        <AlertCircle className="h-5 w-5" />
                        <div>
                            <p className="font-bold">지연된 미작업 현장이 {overdueSites.length}건 있습니다!</p>
                            <p className="text-sm">작업일이 지났지만 아직 완료되지 않은 현장을 확인하세요.</p>
                        </div>
                    </div>
                    <Link href={`/admin/sites?filter=overdue${filterWorker ? `&worker=${filterWorker}` : ''}`}>
                        <Button variant="destructive" size="sm" className="font-bold">
                            지연 현장 관리
                        </Button>
                    </Link>
                </div>
            )}

            {!isOverdueMode && <AdminSiteDateFilter />}
            
            {isOverdueMode && (
                <div className="bg-red-50/50 rounded-xl border border-red-200 p-4 mb-4 flex items-center justify-between">
                    <div>
                        <h3 className="font-bold text-red-700 flex items-center gap-2">
                            <AlertCircle className="h-5 w-5" />
                            지연/미작업 현장 관리 모드
                        </h3>
                        <p className="text-sm text-red-600/80 mt-1">작업 일자가 지났으나 아직 완료되지 않은 현장 목록입니다.</p>
                    </div>
                    <Link href="/admin/sites">
                        <Button variant="outline" size="sm" className="border-red-200 text-red-700 hover:bg-red-100">
                            <ArrowLeft className="w-4 h-4 mr-1.5" /> 필터 해제
                        </Button>
                    </Link>
                </div>
            )}

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">현장 관리</h2>
                    <p className="text-muted-foreground">
                        {isOverdueMode ? (
                            '지연된 현장 목록'
                        ) : isValidDate
                            ? `${format(new Date(filterDate), 'yyyy년 MM월 dd일')} 현장 목록`
                            : '등록된 모든 청소 현장을 관리하고 팀장을 배정합니다.'}
                        {selectedWorker && (
                            <span
                                className="font-medium ml-1"
                                style={{ color: selectedWorker.display_color || undefined }}
                            >
                                · {selectedWorker.name}
                            </span>
                        )}
                        <span className="ml-1">({filteredSites.length}건)</span>
                    </p>
                </div>
                <div className="flex gap-2">
                    <OrderParserDialog workers={workers} />
                    <SiteDialog workers={workers} />
                </div>
            </div>

            {/* Worker Filter */}
            <AdminWorkerFilter workers={workers} />

            {/* Time Period Filter */}
            <TimePeriodFilter />

            {/* 팀원 배정 + 현장 카드 (통합 컴포넌트) */}
            <SiteMemberAssignment
                sites={filteredSites as any}
                workers={workers as any}
                siteMembers={siteMembers as any}
                siteActions={siteActionElements}
            />
        </div>
    )
}
