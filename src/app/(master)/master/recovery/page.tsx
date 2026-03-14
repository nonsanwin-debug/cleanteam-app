import { getDeletedCompanies, getDeletedUsers } from '@/actions/master'
import { MasterRecoveryClient } from './recovery-client'
import { Metadata } from 'next'

export const metadata: Metadata = {
    title: '휴지통 (데이터 복구) | NEXUS MASTER',
    description: '삭제되거나 탈퇴 처리된 업체 및 이용자 데이터를 관리합니다.',
}

export default async function MasterRecoveryPage() {
    // Fetch deleted data
    const [companies, users] = await Promise.all([
        getDeletedCompanies(),
        getDeletedUsers()
    ])

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 border-b border-rose-100 pb-2">
                    <span className="text-rose-600">🗃️ 휴지통</span> (데이터 복구)
                </h1>
                <p className="text-slate-500 mt-2">
                    강제 탈퇴 처리되어 목록에서 숨겨진 업체와 회원을 관리하고 복구할 수 있습니다.
                </p>
            </div>

            <MasterRecoveryClient initialCompanies={companies} initialUsers={users} />
        </div>
    )
}
