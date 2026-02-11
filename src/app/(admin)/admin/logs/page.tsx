import { getAdminLogs } from '@/actions/admin'
import { AdminLogsClient } from './client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AdminLogsPage() {
    const logs = await getAdminLogs()

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold flex items-center">
                    <FileText className="mr-2 h-6 w-6" />
                    정산/활동 로그
                </h1>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>전체 로그 (최근 내역 100건)</CardTitle>
                </CardHeader>
                <CardContent>
                    <AdminLogsClient initialLogs={logs} />
                </CardContent>
            </Card>
        </div>
    )
}
