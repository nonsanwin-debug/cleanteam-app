import { getAdminMemosByDateRange } from "@/actions/admin-memos"
import { AdminMemoCalendar } from "@/components/admin/admin-memo-calendar"
import { startOfMonth, endOfMonth, format } from "date-fns"

export const metadata = {
    title: "관리자 메모 | NEXUS",
    description: "관리자 전용 스크래치패드 및 현장 통합 메모",
}

export default async function AdminMemosPage({
    searchParams,
}: {
    searchParams: Promise<{ month?: string; year?: string }>
}) {
    // Determine the current month to show
    const resolvedParams = await searchParams;
    const now = new Date()
    const targetYear = resolvedParams.year ? parseInt(resolvedParams.year) : now.getFullYear()
    const targetMonth = resolvedParams.month ? parseInt(resolvedParams.month) - 1 : now.getMonth() // 0-indexed

    const baseDate = new Date(targetYear, targetMonth, 1)
    
    // Fetch memos for the current month view (including adjacent days that might be visible in a full grid)
    // To keep it simple, fetch a slightly wider range
    const startRange = new Date(targetYear, targetMonth, -7)
    const endRange = new Date(targetYear, targetMonth + 1, 7)

    const startDateStr = format(startRange, 'yyyy-MM-dd')
    const endDateStr = format(endRange, 'yyyy-MM-dd')

    const { data: memosResponse } = await getAdminMemosByDateRange(startDateStr, endDateStr)
    const memos = memosResponse || []

    return (
        <div className="space-y-6 pb-20">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">관리자 메모</h2>
                <p className="text-muted-foreground mt-2">
                    관리자만 볼 수 있는 날짜별 스크래치패드입니다. 주요 일정이나 메모를 캘린더에 남겨두세요.
                </p>
            </div>

            <AdminMemoCalendar 
                initialDate={baseDate} 
                memos={memos} 
            />
        </div>
    )
}
