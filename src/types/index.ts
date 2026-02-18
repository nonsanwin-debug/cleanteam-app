export type AssignedSite = {
    id: string
    name: string
    address: string
    status: 'scheduled' | 'in_progress' | 'completed'
    created_at: string
    worker_id?: string | null
    // New Fields
    customer_name?: string
    customer_phone?: string
    residential_type?: string
    area_size?: string
    structure_type?: string
    cleaning_date?: string
    start_time?: string
    special_notes?: string
    // Added for compatibility
    description?: string
    manager_name?: string
    manager_phone?: string
    start_date?: string
    end_date?: string
    // Settlement fields
    balance_amount?: number
    additional_amount?: number
    additional_description?: string
    collection_type?: string
    // 현장 메모 (팀장이 작성, 팀원에게 표시)
    worker_notes?: string
    // 배정된 팀원 목록
    members?: { user_id: string; name: string }[]
}


export type SitePhoto = {
    id: string
    site_id: string
    url: string
    type: 'before' | 'during' | 'after' | 'special'
    created_at: string
    description?: string
}

export type ActionResponse<T = any> = {
    success: boolean
    data?: T
    error?: string
}

export type ASRequest = {
    id: string
    site_id?: string | null
    site_name?: string | null
    worker_id: string | null
    description: string
    processing_details: string | null
    status: 'pending' | 'resolved' | 'monitoring'
    occurred_at: string
    resolved_at: string | null
    created_at: string
    updated_at: string
    penalty_amount?: number
    photos?: string[]
    // Joins
    site?: {
        name: string
    }
    worker?: {
        name: string
        display_color?: string | null
    } | null
}
