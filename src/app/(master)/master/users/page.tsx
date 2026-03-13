import { getMasterUsers } from "@/actions/master"
import { MasterUsersClient } from "./users-client"

export const dynamic = 'force-dynamic'

export default async function MasterUsersPage() {
    const users = await getMasterUsers()

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight">회원 관리</h1>
                    <p className="text-slate-500 mt-1">플랫폼에 가입된 모든 관리자 및 작업자 계정을 조회하고 관리합니다.</p>
                </div>
            </div>

            <MasterUsersClient initialUsers={users} />
        </div>
    )
}
