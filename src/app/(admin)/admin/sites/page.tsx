import { getSites, getWorkers, getAllSiteMembers } from '@/actions/sites'
import { SiteDialog } from '@/components/admin/site-dialog'
import { OrderParserDialog } from '@/components/admin/order-parser-dialog'
import { SiteActions } from '@/components/admin/site-actions'
import { AdminSiteDateFilter } from '@/components/admin/site-date-filter'
import { AdminWorkerFilter } from '@/components/admin/worker-filter'
import { TimePeriodFilter } from '@/components/admin/time-period-filter'
import { AdminSitesRealtime } from '@/components/admin/admin-sites-realtime'
import { SiteMemberAssignment } from '@/components/admin/site-member-assignment'
import { format } from 'date-fns'

export const dynamic = 'force-dynamic'

export default async function AdminSitesPage(props: { searchParams: Promise<{ date?: string; worker?: string; period?: string }> }) {
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
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' });
    const filterDate = searchParams.date || today;
    const filterWorker = searchParams.worker || '';
    const filterPeriod = searchParams.period || '';

    // Filter sites by date
    let filteredSites = filterDate
        ? sites.filter(site => site.cleaning_date === filterDate)
        : sites

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
            <AdminSiteDateFilter />
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">현장 관리</h2>
                    <p className="text-muted-foreground">
                        {isValidDate
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
