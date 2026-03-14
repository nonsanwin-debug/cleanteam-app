import { getAdminInquiries } from '@/actions/inquiries'
import { AdminInquiriesClient } from './inquiries-client'

export const dynamic = 'force-dynamic'

export default async function AdminInquiriesPage() {
    // 1. Fetch inquiries first so the user gets fast UI
    const { data: initialInquiries } = await getAdminInquiries()
    
    return (
        <div className="p-4 md:p-8 pt-6">
            <AdminInquiriesClient initialInquiries={initialInquiries || []} />
        </div>
    )
}
