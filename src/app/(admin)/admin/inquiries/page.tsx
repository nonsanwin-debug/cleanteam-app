import { getAdminInquiries, markRepliesAsRead } from '@/actions/inquiries'
import { AdminInquiriesClient } from './inquiries-client'

export const dynamic = 'force-dynamic'

export default async function AdminInquiriesPage() {
    // 1. Fetch inquiries first so the user gets fast UI
    const { data: initialInquiries } = await getAdminInquiries()
    
    // 2. Mark any unread replies as read (fire and forget basically, or await it)
    await markRepliesAsRead()
    
    return (
        <div className="p-4 md:p-8 pt-6">
            <AdminInquiriesClient initialInquiries={initialInquiries || []} />
        </div>
    )
}
