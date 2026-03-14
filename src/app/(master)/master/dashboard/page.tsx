import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Building2, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

export default async function MasterDashboardPage() {
    const supabase = await createClient()
    
    // Quick stats fetch
    const [
        { count: companiesCount },
        { count: adminCount },
        { count: workerCount }
    ] = await Promise.all([
        supabase.from('companies').select('*', { count: 'exact', head: true }),
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'admin'),
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'worker'),
    ])

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl flex items-center gap-2 font-bold tracking-tight">대시보드</h2>
                <p className="text-muted-foreground">
                    NEXUS 전체 플랫폼 현황을 한 눈에 확인하세요.
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">총 파트너 업체 수</CardTitle>
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{companiesCount || 0}개</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">전체 관리자 수</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{adminCount || 0}명</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">전체 직원(팀원) 수</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{workerCount || 0}명</div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
