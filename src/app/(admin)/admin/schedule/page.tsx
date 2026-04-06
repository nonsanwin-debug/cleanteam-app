import { AdminScheduleCalendar } from '@/components/admin/admin-schedule-calendar'

export const metadata = {
    title: '일정 관리 | NEXUS',
    description: '관리자 전용 스케줄 캘린더',
}

export default function AdminSchedulePage() {
    const defaultDate = new Date()

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight text-slate-800">일정 관리</h2>
                <p className="text-muted-foreground mt-2">
                    월별 캘린더를 통해 하루에 배정된 전체 현장 리스트를 직관적으로 확인하세요.
                </p>
            </div>

            <AdminScheduleCalendar initialDate={defaultDate} />
        </div>
    )
}
