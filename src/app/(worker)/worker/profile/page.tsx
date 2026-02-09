import { getWorkerProfile } from '@/actions/worker'
import { ProfileForm } from './profile-form'
import { User } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function WorkerProfilePage() {
    const user = await getWorkerProfile()

    return (
        <div className="space-y-4">
            <h2 className="text-xl font-bold flex items-center">
                <User className="mr-2" />
                내 정보
            </h2>

            <ProfileForm user={user} />
        </div>
    )
}
