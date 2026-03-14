import { getAllInquiries } from '@/actions/inquiries'
import { MasterInquiriesClient } from './master-inquiries-client'

export const dynamic = 'force-dynamic'

export default async function MasterInquiriesPage() {
    const { data: initialInquiries } = await getAllInquiries()
    
    return (
        <div className="p-4 md:p-8 pt-6">
            <MasterInquiriesClient initialInquiries={initialInquiries || []} />
        </div>
    )
}
