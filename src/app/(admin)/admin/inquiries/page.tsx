import { getAdminInquiries } from '@/actions/inquiries'
import { AdminInquiriesClient } from './inquiries-client'

export const dynamic = 'force-dynamic'

export default async function AdminInquiriesPage() {
    const { data: initialInquiries } = await getAdminInquiries()
    
    return (
        <div className="p-4 md:p-8 pt-6">
            <AdminInquiriesClient initialInquiries={initialInquiries || []} />
        </div>
    )
}
