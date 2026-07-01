import { getUsersWithClaims, getWithdrawalRequests, getAllWorkers, getCommissionLogs } from '@/actions/admin'
import { UserList } from './user-list'
import { WithdrawalList } from './withdrawal-list'
import { WorkerManagementList } from './worker-management-list'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { UserPlus } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export const dynamic = 'force-dynamic'

export default async function UsersPage() {
    const users = await getUsersWithClaims()
    const withdrawals = await getWithdrawalRequests()
    const workers = await getAllWorkers()
    const commissionLogs = await getCommissionLogs()

    // Count pending withdrawals
    const pendingCount = withdrawals.filter(w => w.status === 'pending').length

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold tracking-tight">사용자 및 정산 관리</h2>
            </div>

            <Tabs defaultValue="workers" className="w-full">
                <TabsList className="grid w-full grid-cols-3 lg:w-[600px]">
                    <TabsTrigger id="tab-workers" value="workers">팀원 관리</TabsTrigger>
                    <TabsTrigger value="claims">포인트 지급 관리</TabsTrigger>
                    <TabsTrigger value="withdrawals" className="relative">
                        포인트 전환 요청
                        {pendingCount > 0 && (
                            <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
                                {pendingCount}
                            </span>
                        )}
                    </TabsTrigger>
                </TabsList>
                <TabsContent value="workers" className="mt-6">
                    <div className="flex justify-end mb-4">
                        <Link href="/admin/users/new">
                            <Button id="btn-add-worker" className="bg-indigo-600 hover:bg-indigo-700">
                                <UserPlus className="w-4 h-4 mr-2" />
                                새 팀원 추가
                            </Button>
                        </Link>
                    </div>
                    <WorkerManagementList workers={workers} commissionLogs={commissionLogs} />
                </TabsContent>
                <TabsContent value="claims" className="mt-6">
                    <UserList users={users} />
                </TabsContent>
                <TabsContent value="withdrawals" className="mt-6">
                    <WithdrawalList requests={withdrawals} />
                </TabsContent>
            </Tabs>
        </div>
    )
}
