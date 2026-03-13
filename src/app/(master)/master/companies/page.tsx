import { getMasterCompanies } from "@/actions/master"
import { MasterCompaniesClient } from "./companies-client"

export const dynamic = 'force-dynamic'

export default async function MasterCompaniesPage() {
    const companies = await getMasterCompanies()

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight">업체 관리</h1>
                    <p className="text-slate-500 mt-1">플랫폼에 등록된 모든 청소 업체를 관리합니다.</p>
                </div>
            </div>

            <MasterCompaniesClient initialCompanies={companies} />
        </div>
    )
}
