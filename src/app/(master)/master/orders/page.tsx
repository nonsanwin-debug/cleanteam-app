import { getAllSharedOrders } from "@/actions/master"
import { MasterOrdersClient } from "./orders-client"

export const dynamic = 'force-dynamic'

export default async function MasterOrdersPage() {
    const orders = await getAllSharedOrders()

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight">파트너 오더 관리</h1>
                    <p className="text-slate-500 mt-1">NEXUS 플랫폼에 파트너가 접수한 모든 공유 오더를 실시간으로 조회하고 확인합니다.</p>
                </div>
            </div>

            <MasterOrdersClient initialOrders={orders} />
        </div>
    )
}
