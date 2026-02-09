import { getASStats, getASRequests } from '@/actions/as-manage'
import { getSites, getWorkers } from '@/actions/sites'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ASManageClient } from './client' // To be created

export default async function ASManagePage() {
    const stats = await getASStats()
    const requests = await getASRequests()
    const sites = await getSites()
    const workers = await getWorkers()

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">AS 관리</h2>
                <p className="text-muted-foreground">
                    현장별 AS 발생 현황 및 처리 내역을 관리합니다.
                </p>
            </div>

            {/* Stats Section */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card className="col-span-full">
                    <CardHeader>
                        <CardTitle>팀장별 AS 발생 빈도</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b">
                                        <th className="text-left font-medium p-2 text-muted-foreground">팀장명</th>
                                        <th className="text-center font-medium p-2 text-muted-foreground">완료된 현장</th>
                                        <th className="text-center font-medium p-2 text-muted-foreground">AS 발생 건수</th>
                                        <th className="text-right font-medium p-2 text-muted-foreground">발생률</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stats.map((stat) => (
                                        <tr key={stat.id} className="border-b last:border-0 hover:bg-slate-50">
                                            <td className="p-3 font-medium">{stat.name}</td>
                                            <td className="p-3 text-center">{stat.completedCount}건</td>
                                            <td className="p-3 text-center text-red-600 font-bold">{stat.asCount}건</td>
                                            <td className="p-3 text-right">
                                                <Badge variant={Number(stat.rate) > 10 ? 'destructive' : 'secondary'}>
                                                    {stat.rate}%
                                                </Badge>
                                            </td>
                                        </tr>
                                    ))}
                                    {stats.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="p-6 text-center text-muted-foreground">
                                                데이터가 없습니다.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* AS Requests List & Management */}
            <ASManageClient
                requests={requests}
                sites={sites.filter(s => s.status === 'completed')} // Only completed sites usually have AS
                workers={workers}
            />
        </div>
    )
}
