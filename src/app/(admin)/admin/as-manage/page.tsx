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
                            {/* Desktop View: Table */}
                            <table className="w-full text-sm hidden md:table">
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

                            {/* Mobile View: Cards */}
                            <div className="block md:hidden space-y-3">
                                {stats.length === 0 ? (
                                    <div className="text-center py-6 text-muted-foreground italic text-xs">
                                        데이터가 없습니다.
                                    </div>
                                ) : (
                                    stats.map((stat) => (
                                        <div key={stat.id} className="p-3 border rounded-lg bg-slate-50/50 flex items-center justify-between text-xs shadow-sm">
                                            <div className="space-y-1">
                                                <span className="font-semibold text-slate-800 text-sm block">{stat.name}</span>
                                                <div className="text-slate-500 flex gap-2">
                                                    <span>완료: <strong className="text-slate-700">{stat.completedCount}건</strong></span>
                                                    <span>•</span>
                                                    <span>AS: <strong className="text-red-600">{stat.asCount}건</strong></span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-[10px] text-slate-400 block mb-0.5 font-medium">발생률</span>
                                                <Badge variant={Number(stat.rate) > 10 ? 'destructive' : 'secondary'} className="text-[11px] font-bold">
                                                    {stat.rate}%
                                                </Badge>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
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
