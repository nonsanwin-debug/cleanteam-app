import { getDashboardStats, getTodayActivitySites, getRecentActivities } from "@/actions/sites"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Building, ClipboardCheck, AlertCircle, Clock, CheckCircle2, PlayCircle, Image as ImageIcon } from "lucide-react"
import Link from "next/link"

function calculateDuration(start?: string, end?: string) {
    if (!start) return "알 수 없음"
    const startDate = new Date(start)
    const endDate = end ? new Date(end) : new Date()

    const diffMs = endDate.getTime() - startDate.getTime()
    if (diffMs < 0) return "0분"

    const hours = Math.floor(diffMs / (1000 * 60 * 60))
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))

    if (hours > 0) return `${hours}시간 ${minutes}분`
    return `${minutes}분`
}

function formatTime(isoString?: string) {
    if (!isoString) return '-'
    const date = new Date(isoString)
    // Use Intl.DateTimeFormat for explicit timezone handling in Server Components (UTC environment)
    return new Intl.DateTimeFormat('ko-KR', {
        hour: 'numeric',
        minute: 'numeric',
        hour12: false,
        timeZone: 'Asia/Seoul'
    }).format(date)
}

export default async function AdminDashboard() {
    const [stats, activeSites, recentActivities] = await Promise.all([
        getDashboardStats(),
        getTodayActivitySites(),
        getRecentActivities()
    ])

    return (
        <div className="space-y-4 md:space-y-6">
            {/* ... (KPI Cards remain same) ... */}
            <h2 className="text-3xl font-bold tracking-tight">대시보드</h2>

            {/* KPI Cards */}
            {/* KPI Cards */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card className="p-3 sm:p-6 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 p-0 pb-1 sm:pb-2">
                        <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground sm:text-foreground">오늘 예정</CardTitle>
                        <Building className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="text-xl sm:text-2xl font-bold">{stats.todayScheduled}</div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">오늘 날짜 기준</p>
                    </CardContent>
                </Card>
                <Card className="p-3 sm:p-6 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 p-0 pb-1 sm:pb-2">
                        <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground sm:text-foreground">진행 중</CardTitle>
                        <ClipboardCheck className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="text-xl sm:text-2xl font-bold text-blue-600">{stats.inProgress}</div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">실시간 모니터링 중</p>
                    </CardContent>
                </Card>
                <Card className="p-3 sm:p-6 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 p-0 pb-1 sm:pb-2">
                        <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground sm:text-foreground">완료 (대기)</CardTitle>
                        <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="text-xl sm:text-2xl font-bold text-green-600">{stats.completed}</div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">보고서 확인 필요</p>
                    </CardContent>
                </Card>
                <Card className="p-3 sm:p-6 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 p-0 pb-1 sm:pb-2">
                        <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground sm:text-foreground">활동 팀장</CardTitle>
                        <Users className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="text-xl sm:text-2xl font-bold">{stats.activeWorkers}</div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">총 {stats.totalWorkers}명 중</p>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Activity */}
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-1 md:col-span-1 lg:col-span-4">
                    <CardHeader>
                        <CardTitle>실시간 현장 현황</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {activeSites.length === 0 ? (
                            <div className="h-[200px] flex items-center justify-center text-slate-400 bg-slate-50 rounded-md">
                                현재 진행 중이거나 완료된 작업이 없습니다.
                            </div>
                        ) : (
                            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                                {activeSites.map(site => {
                                    const isComplete = site.status === 'completed'
                                    // Use completed_at or updated_at as fallback. If both missing, show "Unknown" to avoid eternal ticking.
                                    const completionTime = isComplete ? (site.completed_at || site.updated_at) : undefined

                                    const duration = calculateDuration(site.started_at, completionTime)

                                    return (
                                        <div key={site.id} className="flex flex-col sm:flex-row items-start sm:justify-between p-3 sm:p-4 border rounded-lg bg-white shadow-sm gap-3 sm:gap-0">
                                            <div className="space-y-1 w-full sm:w-auto">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className={`flex h-2 w-2 rounded-full shrink-0 ${isComplete ? 'bg-green-500' : 'bg-blue-500 animate-pulse'}`} />
                                                    <h4 className="font-semibold text-sm truncate">{site.name}</h4>
                                                    <span className={`text-[10px] px-1.5 py-0.5 rounded border shrink-0 ${isComplete
                                                        ? 'bg-green-50 text-green-600 border-green-200'
                                                        : 'bg-blue-50 text-blue-600 border-blue-200'
                                                        }`}>
                                                        {isComplete ? '완료됨' : '작업 중'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center text-xs text-slate-500">
                                                    <Users className="mr-1 h-3 w-3" />
                                                    <span style={{ color: site.worker?.display_color || undefined }}>
                                                        {site.worker?.name || '팀장 미지정'}
                                                    </span>
                                                </div>
                                                <div className="text-xs text-slate-400 mt-1 truncate">
                                                    {site.address}
                                                </div>
                                            </div>

                                            <div className="w-full sm:w-auto text-right sm:text-right pt-2 sm:pt-0 border-t sm:border-0 border-slate-50 flex flex-row sm:flex-col justify-between sm:justify-end items-center sm:items-end">
                                                {isComplete ? (
                                                    <div className="space-y-0.5 sm:space-y-1 w-full sm:w-auto flex flex-row sm:flex-col justify-between sm:justify-end gap-2 sm:gap-0">
                                                        <div className="text-xs text-slate-600">
                                                            <span className="sm:hidden mr-1 text-slate-400">시작</span>
                                                            <span className="font-medium">{site.started_at ? formatTime(site.started_at) : '-'}</span>
                                                            <span className="hidden sm:inline"> 작업시작</span>
                                                        </div>
                                                        <div className="text-xs text-slate-600">
                                                            <span className="sm:hidden mr-1 text-slate-400">종료</span>
                                                            <span className="font-medium">{formatTime(site.completed_at)}</span>
                                                            <span className="hidden sm:inline"> 작업마감</span>
                                                        </div>
                                                        <div className="text-xs font-bold text-green-600 mt-1 sm:mt-1">
                                                            {duration}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-0.5 sm:space-y-1 w-full sm:w-auto flex flex-row sm:flex-col justify-between sm:justify-end items-center sm:items-stretch">
                                                        <div className="text-xs text-slate-400">
                                                            {formatTime(site.started_at)} 시작됨
                                                        </div>
                                                        <div className="flex items-center justify-end text-blue-600 text-sm font-bold">
                                                            <Clock className="mr-1 h-3 w-3" />
                                                            {duration}째 작업 중
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>
                <Card className="col-span-1 md:col-span-1 lg:col-span-3">
                    <CardHeader>
                        <CardTitle>최근 알림</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                            {recentActivities.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-8">아직 기록된 활동이 없습니다.</p>
                            ) : (
                                recentActivities.map((activity, i) => (
                                    <div key={activity.id} className="flex items-center">
                                        {activity.type === 'work_started' && (
                                            <span className="relative flex h-2 w-2 mr-2 shrink-0">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
                                            </span>
                                        )}
                                        {activity.type === 'work_completed' && (
                                            <div className="h-2 w-2 rounded-full bg-green-500 mr-2 shrink-0"></div>
                                        )}
                                        {activity.type === 'photo_uploaded' && (
                                            <div className="h-2 w-2 rounded-full bg-slate-300 mr-2 shrink-0"></div>
                                        )}

                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium leading-none truncate">
                                                <span className="font-bold">{activity.actor}</span>님이
                                                <span className="text-slate-500 mx-1">[{activity.target}]</span>
                                                {activity.type === 'work_started' && '작업을 시작했습니다.'}
                                                {activity.type === 'work_completed' && '작업을 완료했습니다.'}
                                                {activity.type === 'photo_uploaded' && `사진을 올렸습니다 (${activity.count || 1}장)`}
                                            </p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <p className="text-[10px] text-slate-400">
                                                    {formatTime(activity.timestamp)}
                                                </p>
                                                {activity.type === 'photo_uploaded' && activity.siteId && (
                                                    <Link
                                                        href={`/admin/sites/${activity.siteId}`}
                                                        className="text-[10px] text-blue-500 hover:text-blue-700 font-medium hover:underline"
                                                    >
                                                        바로확인 →
                                                    </Link>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
