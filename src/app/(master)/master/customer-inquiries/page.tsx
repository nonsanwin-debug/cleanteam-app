import { getCustomerInquiries } from '@/actions/customer-booking'
import { MasterCustomerInquiriesClient } from './client'

export const dynamic = 'force-dynamic'

export default async function CustomerInquiriesPage() {
    const inquiries = await getCustomerInquiries()

    return (
        <div className="max-w-7xl mx-auto">
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-rose-600 to-indigo-600 mb-6 flex items-center gap-2">
                <span>고객 온라인 문의 관리</span>
            </h1>
            <MasterCustomerInquiriesClient initialInquiries={inquiries} />
        </div>
    )
}
