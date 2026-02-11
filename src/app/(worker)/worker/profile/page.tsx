import { getWorkerProfile, getMyLogs } from '@/actions/worker'
import { ProfileForm } from './profile-form'
import { ActivityLogs } from './activity-logs'
import { User } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function WorkerProfilePage() {
    const user = await getWorkerProfile()
    const logs = await getMyLogs()

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold flex items-center px-2">
                <User className="mr-2" />
                내 정보
            </h2>

            <ProfileForm user={user} />

            <div className="space-y-4">
                <h3 className="text-lg font-bold px-2">활동/정산 내역</h3>
                <ActivityLogs logs={logs} />
            </div>
        </div>
    )
}
