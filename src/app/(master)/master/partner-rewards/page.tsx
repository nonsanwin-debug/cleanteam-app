import { getPartnerRewards } from '@/actions/master-rewards'
import { MasterRewardsClient } from './rewards-client'

export const dynamic = 'force-dynamic'

export default async function PatternRewardsPage() {
    const { success, data } = await getPartnerRewards()

    return (
        <div className="max-w-6xl mx-auto">
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-600 to-indigo-600 mb-6 flex items-center gap-2">
                <span>파트너 리워드 정산 관리</span>
            </h1>
            <MasterRewardsClient initialRewards={success && data ? data : []} />
        </div>
    )
}
