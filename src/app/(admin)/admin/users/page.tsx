import { getUsersWithClaims, getWithdrawalRequests, getAllWorkers } from '@/actions/admin'
import { UserList } from './user-list'
import { WithdrawalList } from './withdrawal-list'
import { WorkerManagementList } from './worker-management-list'
import { CreateWorkerDialog } from './create-worker-dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export const dynamic = 'force-dynamic'

export default async function UsersPage() {
    const users = await getUsersWithClaims()
    const withdrawals = await getWithdrawalRequests()
    const workers = await getAllWorkers()

    // Count pending withdrawals
    const pendingCount = withdrawals.filter(w => w.status === 'pending').length

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold tracking-tight">사용자 및 정산 관리</h2>
            </div>

            <Tabs defaultValue="claims" className="w-full">
                <TabsList className="grid w-full grid-cols-3 lg:w-[600px]">
                    <TabsTrigger value="claims">지급 대기 (청구)</TabsTrigger>
                    <TabsTrigger value="withdrawals" className="relative">
                        출금 요청
                        {pendingCount > 0 && (
                            <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
                                {pendingCount}
                            </span>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="workers">팀원 관리</TabsTrigger>
                </TabsList>
                <TabsContent value="claims" className="mt-6">
                    <UserList users={users} />
                </TabsContent>
                <TabsContent value="withdrawals" className="mt-6">
                    <WithdrawalList requests={withdrawals} />
                </TabsContent>
                <TabsContent value="workers" className="mt-6">
                    <div className="flex justify-end mb-4">
                        <CreateWorkerDialog />
                    </div>
                    <WorkerManagementList workers={workers} />
                </TabsContent>
            </Tabs>
        </div>
    )
}
