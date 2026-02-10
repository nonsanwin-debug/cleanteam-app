import { getUsersWithClaims, getWithdrawalRequests } from '@/actions/admin'
import { UserList } from './user-list'
import { WithdrawalList } from './withdrawal-list'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export const dynamic = 'force-dynamic'

export default async function UsersPage() {
    const users = await getUsersWithClaims()
    const withdrawals = await getWithdrawalRequests()

    // Count pending withdrawals
    const pendingCount = withdrawals.filter(w => w.status === 'pending').length

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold tracking-tight">사용자 및 정산 관리</h2>

            <Tabs defaultValue="claims" className="w-full">
                <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
                    <TabsTrigger value="claims">지급 대기 (청구)</TabsTrigger>
                    <TabsTrigger value="withdrawals" className="relative">
                        출금 요청
                        {pendingCount > 0 && (
                            <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
                                {pendingCount}
                            </span>
                        )}
                    </TabsTrigger>
                </TabsList>
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
