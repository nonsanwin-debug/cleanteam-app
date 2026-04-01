import { getMasterPartners } from "@/actions/master"
import { MasterPartnersClient } from "./partners-client"

export const dynamic = 'force-dynamic'

export default async function MasterPartnersPage() {
    const partners = await getMasterPartners()

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight">파트너업체 관리</h1>
                    <p className="text-slate-500 mt-1">NEXUS 플랫폼과 제휴된 부동산 파트너 업체를 관리합니다.</p>
                </div>
            </div>

            <MasterPartnersClient initialPartners={partners} />
        </div>
    )
}
